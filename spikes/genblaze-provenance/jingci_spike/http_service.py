from __future__ import annotations

import argparse
import hashlib
import hmac
import json
import os
import sys
import threading
import time
import uuid
from dataclasses import dataclass
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Any, Mapping, Optional
from urllib.parse import urlparse

from .contract import AssetEvidence, ProvenanceRunRequest, SCHEMA_VERSION, ShotProvenanceJob
from .local_pipeline import execute_local_storage_pipeline


MAX_BODY_BYTES = 65_536
FIXTURE_MEDIA_BYTES = b"jingci deterministic local video fixture"
LOCAL_HOSTS = {"127.0.0.1", "localhost", "::1"}


@dataclass(frozen=True)
class HttpResult:
    status: int
    body: dict[str, Any]
    headers: dict[str, str]


@dataclass(frozen=True)
class PreviewSecurityPolicy:
    allowed_origin: str
    bearer_token: str
    enabled: bool
    max_concurrency: int

    @classmethod
    def from_environment(cls, environment: Mapping[str, str]) -> "PreviewSecurityPolicy":
        if environment.get("JINGCI_PUBLIC_PREVIEW_MODE") != "YES":
            raise ValueError("JINGCI_PUBLIC_PREVIEW_MODE must be YES for a public bind")
        allowed_origin = environment.get("JINGCI_PREVIEW_ALLOWED_ORIGIN", "")
        parsed = urlparse(allowed_origin)
        if (
            parsed.scheme != "https"
            or not parsed.hostname
            or parsed.username
            or parsed.password
            or parsed.path not in {"", "/"}
            or parsed.params
            or parsed.query
            or parsed.fragment
        ):
            raise ValueError("JINGCI_PREVIEW_ALLOWED_ORIGIN must be one exact HTTPS origin")
        bearer_token = environment.get("JINGCI_PREVIEW_BEARER_TOKEN", "")
        if len(bearer_token) < 32 or any(character.isspace() for character in bearer_token):
            raise ValueError("JINGCI_PREVIEW_BEARER_TOKEN must contain at least 32 non-whitespace characters")
        try:
            max_concurrency = int(environment.get("JINGCI_PREVIEW_MAX_CONCURRENCY", "2"))
        except ValueError as error:
            raise ValueError("JINGCI_PREVIEW_MAX_CONCURRENCY must be an integer") from error
        if not 1 <= max_concurrency <= 16:
            raise ValueError("JINGCI_PREVIEW_MAX_CONCURRENCY must be between 1 and 16")
        return cls(
            allowed_origin=allowed_origin.rstrip("/"),
            bearer_token=bearer_token,
            enabled=environment.get("JINGCI_PROVENANCE_ENABLED") == "YES",
            max_concurrency=max_concurrency,
        )


class ConcurrencyGate:
    def __init__(self, limit: int) -> None:
        self._semaphore = threading.BoundedSemaphore(limit)

    def acquire(self) -> bool:
        return self._semaphore.acquire(blocking=False)

    def release(self) -> None:
        self._semaphore.release()


def _cors_headers(headers: Mapping[str, str], policy: Optional[PreviewSecurityPolicy] = None) -> dict[str, str]:
    origin = headers.get("Origin", "")
    if policy is not None:
        allowed = origin == policy.allowed_origin
    else:
        parsed = urlparse(origin)
        allowed = parsed.scheme in {"http", "https"} and parsed.hostname in LOCAL_HOSTS
    if allowed:
        return {
            "Access-Control-Allow-Origin": origin,
            "Access-Control-Allow-Headers": "Authorization, Content-Type" if policy is not None else "Content-Type",
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            "Vary": "Origin",
        }
    return {}


def _json_error(
    status: int,
    code: str,
    message: str,
    headers: Mapping[str, str],
    policy: Optional[PreviewSecurityPolicy] = None,
) -> HttpResult:
    return HttpResult(status, {"error": {"code": code, "message": message}}, _cors_headers(headers, policy))


def _is_authorized(headers: Mapping[str, str], policy: PreviewSecurityPolicy) -> bool:
    authorization = headers.get("Authorization", "")
    scheme, separator, token = authorization.partition(" ")
    return separator == " " and scheme.lower() == "bearer" and hmac.compare_digest(token, policy.bearer_token)


def _preview_access_error(headers: Mapping[str, str], policy: PreviewSecurityPolicy) -> Optional[HttpResult]:
    if not policy.enabled:
        return _json_error(503, "service_disabled", "Provenance generation is disabled", headers, policy)
    if not _cors_headers(headers, policy):
        return _json_error(403, "origin_denied", "Origin is not allowed", headers, policy)
    if not _is_authorized(headers, policy):
        return _json_error(401, "unauthorized", "Reviewer access is required", headers, policy)
    return None


def build_request_log(request_id: str, method: str, path: str, status: int, duration_ms: int) -> dict[str, Any]:
    return {
        "event": "provenance_http_request",
        "request_id": request_id,
        "method": method,
        "path": urlparse(path).path,
        "status": status,
        "duration_ms": duration_ms,
    }


def execute_local_provenance_run(request: ProvenanceRunRequest) -> dict[str, Any]:
    job_id = f"local-shot-{request.shot_id}-attempt-{request.attempt}"
    media_sha256 = hashlib.sha256(FIXTURE_MEDIA_BYTES).hexdigest()
    job = ShotProvenanceJob(
        schema_version=SCHEMA_VERSION,
        job_id=job_id,
        shot_id=request.shot_id,
        prompt=request.prompt,
        negative_prompt=request.negative_prompt,
        provider=request.provider,
        model=request.model,
        modality=request.modality,
        asset=AssetEvidence("memory://jingci-source/fixture.mp4", "video/mp4", media_sha256),
        metadata={"project_id": request.project_id, "attempt": str(request.attempt)},
    )
    result = execute_local_storage_pipeline(job, FIXTURE_MEDIA_BYTES)
    timestamp = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    return {
        "schema_version": "jingci.provenance-run.v1",
        "job_id": job_id,
        "project_id": request.project_id,
        "shot_id": request.shot_id,
        "parent_job_id": request.parent_job_id,
        "attempt": request.attempt,
        "status": "succeeded",
        "provider": result["provider_name"],
        "model": request.model,
        "modality": "video",
        "created_at": timestamp,
        "updated_at": timestamp,
        "result": {
            "asset": {
                "url": result["asset_url"],
                "media_type": "video/mp4",
                "sha256": result["asset_sha256"],
                "size_bytes": result["asset_size_bytes"],
            },
            "manifest": {
                "uri": result["manifest_uri"],
                "canonical_hash": result["manifest_hash"],
                "verified": True,
            },
        },
        "error": None,
    }


def dispatch_request(
    method: str,
    path: str,
    headers: Mapping[str, str],
    body: bytes = b"",
    policy: Optional[PreviewSecurityPolicy] = None,
) -> HttpResult:
    cors = _cors_headers(headers, policy)
    if method == "OPTIONS":
        if policy is not None and not cors:
            return _json_error(403, "origin_denied", "Origin is not allowed", headers, policy)
        return HttpResult(204, {}, cors)
    if method == "GET" and path == "/health":
        if policy is not None and not policy.enabled:
            return HttpResult(503, {"status": "disabled", "mode": "preview"}, cors)
        mode = "preview" if policy is not None else "local-fixture"
        return HttpResult(200, {"status": "ok", "mode": mode}, cors)
    if method != "POST" or path != "/v1/provenance-runs":
        return _json_error(404, "not_found", "Route not found", headers, policy)
    if policy is not None:
        access_error = _preview_access_error(headers, policy)
        if access_error is not None:
            return access_error
    content_type = headers.get("Content-Type", "").split(";", 1)[0].strip().lower()
    if content_type != "application/json":
        return _json_error(415, "unsupported_media_type", "Content-Type must be application/json", headers, policy)
    if len(body) > MAX_BODY_BYTES:
        return _json_error(413, "payload_too_large", "JSON body exceeds 65536 bytes", headers, policy)
    try:
        payload = json.loads(body.decode("utf-8"))
        request = ProvenanceRunRequest.from_dict(payload)
        response = execute_local_provenance_run(request)
    except (UnicodeDecodeError, json.JSONDecodeError, ValueError) as error:
        message = "Request does not match the provenance contract" if policy is not None else str(error)
        return _json_error(400, "invalid_request", message, headers, policy)
    except Exception:
        return _json_error(500, "execution_failed", "Local provenance execution failed", headers, policy)
    return HttpResult(200, response, cors)


class ProvenanceHTTPServer(ThreadingHTTPServer):
    daemon_threads = True

    def __init__(self, address: tuple[str, int], policy: Optional[PreviewSecurityPolicy]) -> None:
        super().__init__(address, ProvenanceRequestHandler)
        self.policy = policy
        self.concurrency_gate = ConcurrencyGate(policy.max_concurrency if policy else 8)


class ProvenanceRequestHandler(BaseHTTPRequestHandler):
    server_version = "JingciProvenance/1"
    sys_version = ""

    def _handle(self) -> None:
        started = time.monotonic()
        request_id = uuid.uuid4().hex
        policy = self.server.policy  # type: ignore[attr-defined]
        gate = self.server.concurrency_gate  # type: ignore[attr-defined]
        if policy is not None:
            self.connection.settimeout(10)
            if self.command == "POST" and self.path == "/v1/provenance-runs":
                access_error = _preview_access_error(self.headers, policy)
                if access_error is not None:
                    self._write_result(access_error, request_id, started)
                    return
        gated = self.command == "POST" and self.path == "/v1/provenance-runs"
        acquired = gate.acquire() if gated else False
        if gated and not acquired:
            self._write_result(
                _json_error(503, "service_busy", "Provenance service is busy", self.headers, policy),
                request_id,
                started,
            )
            return
        try:
            try:
                try:
                    content_length = int(self.headers.get("Content-Length", "0"))
                except ValueError:
                    content_length = MAX_BODY_BYTES + 1
                if content_length < 0:
                    content_length = MAX_BODY_BYTES + 1
                if content_length > MAX_BODY_BYTES:
                    body = b"x" * (MAX_BODY_BYTES + 1)
                else:
                    body = self.rfile.read(content_length) if content_length else b""
                result = dispatch_request(self.command, self.path, self.headers, body, policy)
            except TimeoutError:
                result = _json_error(408, "request_timeout", "Request timed out", self.headers, policy)
            self._write_result(result, request_id, started)
        finally:
            if acquired:
                gate.release()

    def _write_result(self, result: HttpResult, request_id: str, started: float) -> None:
        encoded = b"" if result.status == 204 else json.dumps(result.body, ensure_ascii=False).encode("utf-8")
        self.send_response(result.status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(encoded)))
        self.send_header("X-Request-Id", request_id)
        self.send_header("X-Content-Type-Options", "nosniff")
        for key, value in result.headers.items():
            self.send_header(key, value)
        self.end_headers()
        if encoded:
            self.wfile.write(encoded)
        duration_ms = max(0, round((time.monotonic() - started) * 1000))
        print(json.dumps(build_request_log(request_id, self.command, self.path, result.status, duration_ms)), file=sys.stderr)

    do_GET = _handle
    do_POST = _handle
    do_OPTIONS = _handle

    def log_message(self, format: str, *args: Any) -> None:
        return


def create_local_server(port: int = 8788) -> ThreadingHTTPServer:
    return ProvenanceHTTPServer(("127.0.0.1", port), None)


def create_server(host: str, port: int, environment: Mapping[str, str]) -> ProvenanceHTTPServer:
    policy = None if host in LOCAL_HOSTS else PreviewSecurityPolicy.from_environment(environment)
    return ProvenanceHTTPServer((host, port), policy)


def main() -> int:
    parser = argparse.ArgumentParser(description="Run the credential-free Jingci provenance adapter")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8788)
    args = parser.parse_args()
    server = create_server(args.host, args.port, os.environ)
    print(f"Jingci provenance adapter listening on http://{args.host}:{server.server_port}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
