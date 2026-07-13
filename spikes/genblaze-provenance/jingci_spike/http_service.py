from __future__ import annotations

import argparse
import hashlib
import json
from dataclasses import dataclass
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Any, Mapping
from urllib.parse import urlparse

from .contract import AssetEvidence, ProvenanceRunRequest, SCHEMA_VERSION, ShotProvenanceJob
from .local_pipeline import execute_local_storage_pipeline


MAX_BODY_BYTES = 65_536
FIXTURE_MEDIA_BYTES = b"jingci deterministic local video fixture"


@dataclass(frozen=True)
class HttpResult:
    status: int
    body: dict[str, Any]
    headers: dict[str, str]


def _cors_headers(headers: Mapping[str, str]) -> dict[str, str]:
    origin = headers.get("Origin", "")
    parsed = urlparse(origin)
    if parsed.scheme in {"http", "https"} and parsed.hostname in {"127.0.0.1", "localhost"}:
        return {
            "Access-Control-Allow-Origin": origin,
            "Access-Control-Allow-Headers": "Content-Type",
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            "Vary": "Origin",
        }
    return {}


def _json_error(status: int, code: str, message: str, headers: Mapping[str, str]) -> HttpResult:
    return HttpResult(status, {"error": {"code": code, "message": message}}, _cors_headers(headers))


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


def dispatch_request(method: str, path: str, headers: Mapping[str, str], body: bytes = b"") -> HttpResult:
    cors = _cors_headers(headers)
    if method == "OPTIONS":
        return HttpResult(204, {}, cors)
    if method == "GET" and path == "/health":
        return HttpResult(200, {"status": "ok", "mode": "local-fixture"}, cors)
    if method != "POST" or path != "/v1/provenance-runs":
        return _json_error(404, "not_found", "Route not found", headers)
    content_type = headers.get("Content-Type", "").split(";", 1)[0].strip().lower()
    if content_type != "application/json":
        return _json_error(415, "unsupported_media_type", "Content-Type must be application/json", headers)
    if len(body) > MAX_BODY_BYTES:
        return _json_error(413, "payload_too_large", "JSON body exceeds 65536 bytes", headers)
    try:
        payload = json.loads(body.decode("utf-8"))
        request = ProvenanceRunRequest.from_dict(payload)
        response = execute_local_provenance_run(request)
    except (UnicodeDecodeError, json.JSONDecodeError, ValueError) as error:
        return _json_error(400, "invalid_request", str(error), headers)
    except Exception:
        return _json_error(500, "execution_failed", "Local provenance execution failed", headers)
    return HttpResult(200, response, cors)


class ProvenanceRequestHandler(BaseHTTPRequestHandler):
    server_version = "JingciProvenance/1"

    def _handle(self) -> None:
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
        result = dispatch_request(self.command, self.path, self.headers, body)
        encoded = b"" if result.status == 204 else json.dumps(result.body, ensure_ascii=False).encode("utf-8")
        self.send_response(result.status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(encoded)))
        for key, value in result.headers.items():
            self.send_header(key, value)
        self.end_headers()
        if encoded:
            self.wfile.write(encoded)

    do_GET = _handle
    do_POST = _handle
    do_OPTIONS = _handle

    def log_message(self, format: str, *args: Any) -> None:
        return


def create_local_server(port: int = 8788) -> ThreadingHTTPServer:
    return ThreadingHTTPServer(("127.0.0.1", port), ProvenanceRequestHandler)


def main() -> int:
    parser = argparse.ArgumentParser(description="Run the credential-free Jingci provenance adapter")
    parser.add_argument("--port", type=int, default=8788)
    args = parser.parse_args()
    server = create_local_server(args.port)
    print(f"Jingci provenance adapter listening on http://127.0.0.1:{server.server_port}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
