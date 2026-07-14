from __future__ import annotations

import io
import json
import subprocess
import sys
import time
import unittest
from contextlib import redirect_stderr, redirect_stdout
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest.mock import patch

from genblaze_core.models.enums import ProviderErrorCode

from jingci_spike.live_runway_smoke import (
    LIVE_CONFIRMATION_ENV,
    LIVE_CONFIRMATION_VALUE,
    RunwayLiveConfig,
    VideoProbe,
    build_plan,
    main,
    probe_video,
    run_live_smoke,
)
import jingci_spike.runway_client as runway_client
from jingci_spike.runway_client import HttpResponse, RunwayHttpClient, UrllibHttpTransport
from jingci_spike.runway_provider import DownloadedVideo, FakeRunwayTaskClient, RunwayProviderError


class ScriptedTransport:
    def __init__(self, responses: list[HttpResponse]) -> None:
        self.responses = list(responses)
        self.requests: list[dict] = []

    def request(self, method: str, url: str, **kwargs: object) -> HttpResponse:
        self.requests.append({"method": method, "url": url, **kwargs})
        return self.responses.pop(0)


class FakeRawResponse:
    def __init__(self, body: bytes, headers: dict[str, str], status: int = 200, on_read=None) -> None:
        self._body = io.BytesIO(body)
        self.headers = headers
        self.status = status
        self.on_read = on_read
        self.closed = False

    def read(self, size: int) -> bytes:
        if self.on_read:
            self.on_read()
        return self._body.read(size)

    def geturl(self) -> str:
        return "https://media.runway.test/output.mp4"

    def close(self) -> None:
        self.closed = True


class FakeOpener:
    def __init__(self, response: FakeRawResponse) -> None:
        self.response = response

    def open(self, request, timeout: float):  # type: ignore[no-untyped-def]
        return self.response


class RaisingOpener:
    def open(self, request, timeout: float):  # type: ignore[no-untyped-def]
        raise TimeoutError("secret timeout detail")


class ReadTimeoutResponse(FakeRawResponse):
    def read(self, size: int) -> bytes:
        raise TimeoutError("secret read detail")


class TrackingEnv(dict[str, str]):
    def __init__(self, values: dict[str, str]) -> None:
        super().__init__(values)
        self.reads: list[str] = []

    def get(self, key: str, default=None):  # type: ignore[no-untyped-def]
        self.reads.append(key)
        return super().get(key, default)


class RunwayClientTest(unittest.TestCase):
    def client(self, transport: ScriptedTransport) -> RunwayHttpClient:
        return RunwayHttpClient("key_" + "a" * 128, transport, resolve_host=lambda _: ("8.8.8.8",))

    def test_create_uses_current_rest_contract_and_secret_headers(self) -> None:
        transport = ScriptedTransport([
            HttpResponse(200, {"content-type": "application/json"}, b'{"id":"17f20503-6c24-4c16-946b-35dbbce2af2f"}', "")
        ])
        task_id = self.client(transport).create_text_video(
            prompt="prompt", model="gen4.5", ratio="1280:720", duration_seconds=5,
            api_version="2024-11-06", timeout_seconds=30,
        )
        request = transport.requests[0]
        self.assertEqual(task_id, "17f20503-6c24-4c16-946b-35dbbce2af2f")
        self.assertEqual(request["url"], "https://api.dev.runwayml.com/v1/text_to_video")
        self.assertEqual(json.loads(request["body"]), {
            "model": "gen4.5", "promptText": "prompt", "ratio": "1280:720", "duration": 5,
        })
        self.assertEqual(request["headers"]["X-Runway-Version"], "2024-11-06")
        self.assertTrue(request["headers"]["Authorization"].startswith("Bearer key_"))

    def test_cancel_uses_delete_and_accepts_empty_204(self) -> None:
        transport = ScriptedTransport([HttpResponse(204, {}, b"", "")])
        self.client(transport).cancel_task(
            "17f20503-6c24-4c16-946b-35dbbce2af2f",
            api_version="2024-11-06", timeout_seconds=5,
        )
        self.assertEqual(transport.requests[0]["method"], "DELETE")

    def test_cancel_treats_documented_404_as_idempotent(self) -> None:
        transport = ScriptedTransport([
            HttpResponse(404, {"content-type": "application/json"}, b'{"error":"gone"}', "")
        ])
        self.client(transport).cancel_task(
            "17f20503-6c24-4c16-946b-35dbbce2af2f",
            api_version="2024-11-06", timeout_seconds=5,
        )
        self.assertEqual(len(transport.requests), 1)

    def test_http_error_classification_survives_client(self) -> None:
        for status, code in ((400, ProviderErrorCode.INVALID_INPUT), (401, ProviderErrorCode.AUTH_FAILURE), (429, ProviderErrorCode.RATE_LIMIT), (503, ProviderErrorCode.SERVER_ERROR)):
            with self.subTest(status=status):
                transport = ScriptedTransport([HttpResponse(status, {"content-type": "application/json"}, b'{"error":"secret"}', "")])
                with self.assertRaises(RunwayProviderError) as raised:
                    self.client(transport).get_task("17f20503-6c24-4c16-946b-35dbbce2af2f", api_version="2024-11-06", timeout_seconds=5)
                self.assertEqual(raised.exception.error_code, code)
                self.assertNotIn("secret", str(raised.exception))

    def test_download_validates_redirect_before_second_request_and_strips_auth(self) -> None:
        transport = ScriptedTransport([
            HttpResponse(302, {"location": "https://cdn.runway.test/final.mp4"}, b"", ""),
            HttpResponse(200, {"content-type": "video/mp4"}, b"0000ftypvideo", ""),
        ])
        allowed = {"media.runway.test", "cdn.runway.test"}
        client = self.client(transport)
        video = client.download_video(
            "https://media.runway.test/start", timeout_seconds=10, max_bytes=100,
            validate_redirect=lambda url: self.assertIn(url.split("/")[2], allowed),
        )
        self.assertEqual(video.final_url, "https://cdn.runway.test/final.mp4")
        self.assertEqual(len(transport.requests), 2)
        self.assertEqual(transport.requests[1]["headers"], {})

    def test_private_dns_answer_is_rejected_before_fetch(self) -> None:
        transport = ScriptedTransport([])
        client = RunwayHttpClient("key_" + "a" * 128, transport, resolve_host=lambda _: ("127.0.0.1",))
        with self.assertRaisesRegex(RunwayProviderError, "output_host_not_public"):
            client.download_video(
                "https://media.runway.test/start", timeout_seconds=10, max_bytes=100,
                validate_redirect=lambda _: None,
            )
        self.assertEqual(transport.requests, [])

    def test_urllib_transport_rejects_declared_and_actual_length_errors(self) -> None:
        cases = (
            (b"12345", {"Content-Length": "5"}, 4, "response_too_large"),
            (b"1234", {"Content-Length": "5"}, 10, "content_length_mismatch"),
            (b"12345", {}, 4, "response_too_large"),
        )
        for body, headers, limit, code in cases:
            with self.subTest(code=code):
                transport = UrllibHttpTransport(FakeOpener(FakeRawResponse(body, headers)))
                with self.assertRaisesRegex(RunwayProviderError, code):
                    transport.request("GET", "https://media.runway.test/output.mp4", headers={}, body=None, timeout_seconds=1, max_bytes=limit)

    def test_urllib_transport_sanitizes_timeout(self) -> None:
        transport = UrllibHttpTransport(RaisingOpener())
        with self.assertRaises(RunwayProviderError) as raised:
            transport.request("GET", "https://media.runway.test/output.mp4", headers={}, body=None, timeout_seconds=1, max_bytes=10)
        self.assertEqual(raised.exception.error_code, ProviderErrorCode.TIMEOUT)
        self.assertNotIn("secret", str(raised.exception))

    def test_urllib_stream_uses_overall_deadline_and_closes_response(self) -> None:
        clock = [0.0]
        response = FakeRawResponse(b"1234", {}, on_read=lambda: clock.__setitem__(0, 2.0))
        transport = UrllibHttpTransport(FakeOpener(response), monotonic=lambda: clock[0])
        with self.assertRaisesRegex(RunwayProviderError, "transport_timeout"):
            transport.request("GET", "https://media.runway.test/output.mp4", headers={}, body=None, timeout_seconds=1, max_bytes=10)
        self.assertTrue(response.closed)

    def test_urllib_read_timeout_is_typed_and_response_closes(self) -> None:
        response = ReadTimeoutResponse(b"", {})
        transport = UrllibHttpTransport(FakeOpener(response))
        with self.assertRaises(RunwayProviderError) as raised:
            transport.request("GET", "https://media.runway.test/output.mp4", headers={}, body=None, timeout_seconds=1, max_bytes=10)
        self.assertEqual(raised.exception.error_code, ProviderErrorCode.TIMEOUT)
        self.assertNotIn("secret", str(raised.exception))
        self.assertTrue(response.closed)

    def test_redirect_chain_shares_one_deadline(self) -> None:
        clock = [0.0]
        transport = ScriptedTransport([
            HttpResponse(302, {"location": "https://cdn.runway.test/final.mp4"}, b"", "")
        ])
        original_request = transport.request
        def advancing_request(*args, **kwargs):  # type: ignore[no-untyped-def]
            response = original_request(*args, **kwargs)
            clock[0] = 11.0
            return response
        transport.request = advancing_request  # type: ignore[method-assign]
        client = RunwayHttpClient(
            "key_" + "a" * 128, transport, resolve_host=lambda _: ("8.8.8.8",),
            monotonic=lambda: clock[0],
        )
        with self.assertRaisesRegex(RunwayProviderError, "transport_timeout"):
            client.download_video(
                "https://media.runway.test/start", timeout_seconds=10, max_bytes=100,
                validate_redirect=lambda _: None,
            )
        self.assertEqual(len(transport.requests), 1)

    def test_dns_resolution_consumes_shared_deadline_before_fetch(self) -> None:
        clock = [0.0]
        transport = ScriptedTransport([])
        def resolver(host: str) -> tuple[str, ...]:
            clock[0] = 11.0
            return ("8.8.8.8",)
        client = RunwayHttpClient(
            "key_" + "a" * 128, transport, resolve_host=resolver, monotonic=lambda: clock[0]
        )
        with self.assertRaisesRegex(RunwayProviderError, "transport_timeout"):
            client.download_video(
                "https://media.runway.test/start", timeout_seconds=10, max_bytes=100,
                validate_redirect=lambda _: None,
            )
        self.assertEqual(transport.requests, [])

    def test_default_dns_timeout_kills_resolver_process(self) -> None:
        started = time.monotonic()
        with patch.object(runway_client, "_DNS_RESOLVER_CODE", "import time; time.sleep(60)"):
            with self.assertRaises(RunwayProviderError) as raised:
                runway_client._resolve_host_bounded("media.runway.test", 0.05)
        self.assertEqual(raised.exception.error_code, ProviderErrorCode.TIMEOUT)
        self.assertLess(time.monotonic() - started, 2.0)

    def test_plan_is_deterministic_and_environment_free(self) -> None:
        class BombEnv(dict):
            def get(self, key, default=None):  # type: ignore[no-untyped-def]
                raise AssertionError("plan accessed environment")
        stdout = io.StringIO()
        with redirect_stdout(stdout):
            self.assertEqual(main(["--plan"], BombEnv()), 0)
        self.assertFalse(json.loads(stdout.getvalue())["network"])
        self.assertEqual(build_plan()["maximum_attempts"], 1)

    def test_unauthorized_live_reads_only_confirmation(self) -> None:
        env = TrackingEnv({"RUNWAYML_API_SECRET": "secret"})
        with redirect_stderr(io.StringIO()):
            self.assertEqual(main(["--live"], env), 2)
        self.assertEqual(env.reads, [LIVE_CONFIRMATION_ENV])

    def test_live_config_is_strict_and_redacted(self) -> None:
        env = {
            LIVE_CONFIRMATION_ENV: LIVE_CONFIRMATION_VALUE,
            "RUNWAYML_API_SECRET": "key_" + "a" * 128,
            "JINGCI_RUNWAY_OUTPUT_HOSTS": "media.runway.test,cdn.runway.test",
        }
        config = RunwayLiveConfig.from_env(env)
        self.assertEqual(config.redacted_summary()["api_secret"], "[redacted]")
        self.assertNotIn(config.api_secret, json.dumps(config.redacted_summary()))

    def test_probe_requires_expected_stream_dimensions_and_duration(self) -> None:
        payload = {"streams": [{"codec_type": "video", "codec_name": "h264", "width": 1280, "height": 720}], "format": {"duration": "5.02"}}
        observed = {}
        def runner(*args, **kwargs):  # type: ignore[no-untyped-def]
            observed.update(kwargs)
            kwargs["stdout"].write(json.dumps(payload).encode())
            return subprocess.CompletedProcess(args[0], 0)
        probe = probe_video(Path("/tmp/fake.mp4"), runner=runner)
        self.assertEqual(probe, VideoProbe("h264", 1280, 720, 5.02))
        self.assertEqual(observed["env"], {"LC_ALL": "C"})
        self.assertIs(observed["stdin"], subprocess.DEVNULL)

    def test_probe_output_file_limit_rejects_overflowing_child(self) -> None:
        def overflow_runner(command, **kwargs):  # type: ignore[no-untyped-def]
            return subprocess.run(
                [sys.executable, "-c", "import os; os.write(1, b'x' * (1024 * 1024 + 1))"],
                **kwargs,
            )
        with self.assertRaises(RuntimeError):
            probe_video(Path("/tmp/fake.mp4"), runner=overflow_runner)

    def test_live_smoke_fake_cleans_temporary_output(self) -> None:
        url = "https://media.runway.test/output.mp4"
        media = DownloadedVideo(b"0000ftypfake-video", "video/mp4", url)
        fake = FakeRunwayTaskClient(["SUCCEEDED"], media, output_url=url)
        config = RunwayLiveConfig("key_" + "a" * 128, ("media.runway.test",))
        result = run_live_smoke(
            config,
            client_factory=lambda _: fake,
            probe=lambda path: VideoProbe("h264", 1280, 720, 5.0),
        )
        self.assertTrue(result.local_cleanup)
        self.assertEqual(fake.create_calls.__len__(), 1)


if __name__ == "__main__":
    unittest.main()
