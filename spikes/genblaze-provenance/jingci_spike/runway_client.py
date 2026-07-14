from __future__ import annotations

import json
import re
import socket
import subprocess
import sys
import time
from dataclasses import dataclass
from typing import Callable, Mapping, Protocol
from urllib.error import HTTPError, URLError
from urllib.parse import urljoin, urlparse
from urllib.request import HTTPRedirectHandler, ProxyHandler, Request, build_opener

from genblaze_core.models.enums import ProviderErrorCode

from .runway_provider import DownloadedVideo, RunwayProviderError


RUNWAY_API_BASE = "https://api.dev.runwayml.com"
MAX_JSON_BYTES = 1024 * 1024
MAX_REDIRECTS = 3
MAX_DNS_RESULT_BYTES = 64 * 1024
_TASK_ID = re.compile(r"^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$", re.IGNORECASE)
_DNS_RESOLVER_CODE = """\
import json
import socket
import sys

addresses = sorted({
    item[4][0]
    for item in socket.getaddrinfo(sys.argv[1], 443, type=socket.SOCK_STREAM)
})
sys.stdout.write(json.dumps(addresses, separators=(",", ":")))
"""


@dataclass(frozen=True)
class HttpResponse:
    status: int
    headers: Mapping[str, str]
    body: bytes
    url: str


class HttpTransport(Protocol):
    def request(
        self,
        method: str,
        url: str,
        *,
        headers: Mapping[str, str],
        body: bytes | None,
        timeout_seconds: float,
        max_bytes: int,
    ) -> HttpResponse: ...


class _NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):  # type: ignore[no-untyped-def]
        return None


class UrllibHttpTransport:
    """Bounded stdlib transport; redirects are returned to the caller, never followed."""

    def __init__(self, opener=None, *, monotonic: Callable[[], float] = time.monotonic) -> None:
        self.opener = opener or build_opener(ProxyHandler({}), _NoRedirect())
        self.monotonic = monotonic

    def request(
        self,
        method: str,
        url: str,
        *,
        headers: Mapping[str, str],
        body: bytes | None,
        timeout_seconds: float,
        max_bytes: int,
    ) -> HttpResponse:
        request = Request(url, data=body, headers=dict(headers), method=method)
        deadline = self.monotonic() + timeout_seconds
        try:
            response = self.opener.open(request, timeout=timeout_seconds)
        except HTTPError as error:
            response = error
        except (TimeoutError, socket.timeout) as exc:
            raise RunwayProviderError("transport_timeout", ProviderErrorCode.TIMEOUT) from exc
        except URLError as exc:
            code = ProviderErrorCode.TIMEOUT if isinstance(exc.reason, TimeoutError) else ProviderErrorCode.SERVER_ERROR
            raise RunwayProviderError("transport_failed", code) from exc
        except OSError as exc:
            raise RunwayProviderError("transport_failed", ProviderErrorCode.SERVER_ERROR) from exc
        try:
            status = int(response.status)
            normalized_headers = {key.lower(): value for key, value in response.headers.items()}
            raw_length = normalized_headers.get("content-length")
            if raw_length is not None:
                try:
                    declared_length = int(raw_length)
                except ValueError as exc:
                    raise RunwayProviderError("invalid_content_length") from exc
                if declared_length < 0 or declared_length > max_bytes:
                    raise RunwayProviderError("response_too_large")
            chunks: list[bytes] = []
            total = 0
            while True:
                remaining = deadline - self.monotonic()
                if remaining <= 0:
                    raise RunwayProviderError("transport_timeout", ProviderErrorCode.TIMEOUT)
                _set_response_timeout(response, remaining)
                try:
                    chunk = response.read(min(64 * 1024, max_bytes + 1 - total))
                except (TimeoutError, socket.timeout) as exc:
                    raise RunwayProviderError("transport_timeout", ProviderErrorCode.TIMEOUT) from exc
                except OSError as exc:
                    raise RunwayProviderError("transport_failed", ProviderErrorCode.SERVER_ERROR) from exc
                if not chunk:
                    break
                chunks.append(chunk)
                total += len(chunk)
                if total > max_bytes:
                    raise RunwayProviderError("response_too_large")
            if raw_length is not None and total != int(raw_length):
                raise RunwayProviderError("content_length_mismatch")
            final_url = response.geturl()
            if final_url != url:
                raise RunwayProviderError("unexpected_implicit_redirect")
            return HttpResponse(status, normalized_headers, b"".join(chunks), final_url)
        finally:
            close = getattr(response, "close", None)
            if close is not None:
                close()


class RunwayHttpClient:
    def __init__(
        self,
        api_secret: str,
        transport: HttpTransport,
        *,
        resolve_host: Callable[[str], tuple[str, ...]] | None = None,
        monotonic: Callable[[], float] = time.monotonic,
    ) -> None:
        self._api_secret = api_secret
        self.transport = transport
        self.resolve_host = resolve_host
        self.monotonic = monotonic

    def create_text_video(self, **request: object) -> str:
        payload = {
            "model": request["model"],
            "promptText": request["prompt"],
            "ratio": request["ratio"],
            "duration": request["duration_seconds"],
        }
        result = self._json_request(
            "POST", "/v1/text_to_video", payload, str(request["api_version"]), float(request["timeout_seconds"])
        )
        task_id = result.get("id")
        if not isinstance(task_id, str):
            raise RunwayProviderError("malformed_task")
        return task_id

    def get_task(self, task_id: str, **request: object) -> Mapping[str, object]:
        return self._json_request(
            "GET", self._task_path(task_id), None, str(request["api_version"]), float(request["timeout_seconds"])
        )

    def cancel_task(self, task_id: str, **request: object) -> None:
        try:
            self._json_request(
                "DELETE", self._task_path(task_id), None, str(request["api_version"]),
                float(request["timeout_seconds"]), allow_empty=True,
            )
        except RunwayProviderError as error:
            if error.code != "http_404":
                raise

    def download_video(
        self,
        output_url: str,
        *,
        timeout_seconds: float,
        max_bytes: int,
        validate_redirect: Callable[[str], None],
    ) -> DownloadedVideo:
        current_url = output_url
        deadline = self.monotonic() + timeout_seconds
        for redirect_count in range(MAX_REDIRECTS + 1):
            remaining = deadline - self.monotonic()
            if remaining <= 0:
                raise RunwayProviderError("transport_timeout", ProviderErrorCode.TIMEOUT)
            validate_redirect(current_url)
            self._validate_public_resolution(current_url, deadline)
            remaining = deadline - self.monotonic()
            if remaining <= 0:
                raise RunwayProviderError("transport_timeout", ProviderErrorCode.TIMEOUT)
            response = self.transport.request(
                "GET", current_url, headers={}, body=None,
                timeout_seconds=remaining, max_bytes=max_bytes,
            )
            if response.status in {301, 302, 303, 307, 308}:
                if redirect_count == MAX_REDIRECTS:
                    raise RunwayProviderError("too_many_redirects")
                location = response.headers.get("location")
                if not location:
                    raise RunwayProviderError("malformed_redirect")
                next_url = urljoin(current_url, location)
                validate_redirect(next_url)
                current_url = next_url
                continue
            if response.status != 200:
                self._raise_http_error(response.status)
            return DownloadedVideo(
                response.body,
                response.headers.get("content-type", ""),
                current_url,
            )
        raise RunwayProviderError("too_many_redirects")

    def _json_request(
        self,
        method: str,
        path: str,
        payload: Mapping[str, object] | None,
        api_version: str,
        timeout_seconds: float,
        *,
        allow_empty: bool = False,
    ) -> dict[str, object]:
        body = None if payload is None else json.dumps(payload, separators=(",", ":")).encode("utf-8")
        headers = {
            "Authorization": f"Bearer {self._api_secret}",
            "X-Runway-Version": api_version,
            "Accept": "application/json",
        }
        if body is not None:
            headers["Content-Type"] = "application/json"
        response = self.transport.request(
            method, f"{RUNWAY_API_BASE}{path}", headers=headers, body=body,
            timeout_seconds=timeout_seconds, max_bytes=MAX_JSON_BYTES,
        )
        if not 200 <= response.status < 300:
            self._raise_http_error(response.status)
        if not response.body and allow_empty:
            return {}
        if response.headers.get("content-type", "").split(";", 1)[0].lower() != "application/json":
            raise RunwayProviderError("invalid_json_media_type")
        try:
            decoded = json.loads(response.body)
        except (UnicodeDecodeError, json.JSONDecodeError) as exc:
            raise RunwayProviderError("malformed_json") from exc
        if not isinstance(decoded, dict):
            raise RunwayProviderError("malformed_json")
        return decoded

    def _validate_public_resolution(self, url: str, deadline: float) -> None:
        host = urlparse(url).hostname
        if not host:
            raise RunwayProviderError("output_url_not_allowed")
        remaining = deadline - self.monotonic()
        if remaining <= 0:
            raise RunwayProviderError("transport_timeout", ProviderErrorCode.TIMEOUT)
        if self.resolve_host is None:
            addresses = _resolve_host_bounded(host, remaining)
        else:
            # Resolver injection is an offline test seam. Live execution always uses
            # the killable subprocess path above.
            addresses = self.resolve_host(host)
        import ipaddress
        for value in addresses:
            address = ipaddress.ip_address(value)
            if not address.is_global:
                raise RunwayProviderError("output_host_not_public")

    @staticmethod
    def _raise_http_error(status: int) -> None:
        mapping = {
            400: ProviderErrorCode.INVALID_INPUT,
            401: ProviderErrorCode.AUTH_FAILURE,
            403: ProviderErrorCode.AUTH_FAILURE,
            429: ProviderErrorCode.RATE_LIMIT,
            502: ProviderErrorCode.SERVER_ERROR,
            503: ProviderErrorCode.SERVER_ERROR,
            504: ProviderErrorCode.SERVER_ERROR,
        }
        raise RunwayProviderError(f"http_{status}", mapping.get(status, ProviderErrorCode.UNKNOWN))

    @staticmethod
    def _task_path(task_id: str) -> str:
        if not _TASK_ID.fullmatch(task_id):
            raise RunwayProviderError("malformed_task")
        return f"/v1/tasks/{task_id}"


def _resolve_host_bounded(host: str, timeout_seconds: float) -> tuple[str, ...]:
    try:
        process = subprocess.Popen(
            [sys.executable, "-I", "-c", _DNS_RESOLVER_CODE, host],
            stdin=subprocess.DEVNULL,
            stdout=subprocess.PIPE,
            stderr=subprocess.DEVNULL,
            env={"LC_ALL": "C"},
            close_fds=True,
        )
    except OSError as exc:
        raise RunwayProviderError("transport_failed", ProviderErrorCode.SERVER_ERROR) from exc
    try:
        stdout, _ = process.communicate(timeout=timeout_seconds)
    except subprocess.TimeoutExpired as exc:
        process.kill()
        process.communicate()
        raise RunwayProviderError("transport_timeout", ProviderErrorCode.TIMEOUT) from exc
    if process.returncode != 0:
        raise RunwayProviderError("transport_failed", ProviderErrorCode.SERVER_ERROR)
    if len(stdout) > MAX_DNS_RESULT_BYTES:
        raise RunwayProviderError("dns_result_too_large")
    try:
        decoded = json.loads(stdout)
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise RunwayProviderError("malformed_dns_result") from exc
    if not isinstance(decoded, list) or not decoded or not all(isinstance(value, str) for value in decoded):
        raise RunwayProviderError("malformed_dns_result")
    return tuple(decoded)


def _set_response_timeout(response: object, timeout_seconds: float) -> None:
    try:
        response.fp.raw._sock.settimeout(timeout_seconds)  # type: ignore[attr-defined]
    except AttributeError:
        pass
