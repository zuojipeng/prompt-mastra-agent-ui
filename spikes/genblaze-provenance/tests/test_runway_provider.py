from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path

from genblaze_core import KeyStrategy, Modality, ObjectStorageSink, Pipeline, Step
from genblaze_core.exceptions import PipelineError
from genblaze_core.models.enums import ProviderErrorCode

from jingci_spike.local_pipeline import InMemoryStorageBackend
from jingci_spike.runway_provider import (
    RUNWAY_DURATION_SECONDS,
    RUNWAY_ESTIMATED_COST_USD,
    RUNWAY_MODEL,
    DownloadedVideo,
    FakeRunwayTaskClient,
    RunwayProviderConfig,
    RunwayProviderError,
    RunwayVideoProvider,
)


class FakeClock:
    def __init__(self) -> None:
        self.value = 0.0

    def monotonic(self) -> float:
        return self.value

    def sleep(self, seconds: float) -> None:
        self.value += seconds


class RunwayProviderTest(unittest.TestCase):
    def setUp(self) -> None:
        self.temp_dir = tempfile.TemporaryDirectory(prefix="jingci-runway-test-")
        self.addCleanup(self.temp_dir.cleanup)
        self.output_dir = Path(self.temp_dir.name)
        self.url = "https://media.runway.test/output.mp4?token=must-not-persist"
        self.media = DownloadedVideo(
            b"\x00\x00\x00\x18ftypisomdeterministic-fake-mp4", "video/mp4", self.url
        )

    def config(self, **overrides: object) -> RunwayProviderConfig:
        values = {
            "output_dir": self.output_dir,
            "allowed_output_hosts": ("media.runway.test",),
            "timeout_seconds": 30.0,
            "poll_interval_seconds": 5.0,
            "max_output_bytes": 1024,
        }
        values.update(overrides)
        return RunwayProviderConfig(**values)

    def step(self, **overrides: object) -> Step:
        values = {
            "provider": "runway",
            "model": RUNWAY_MODEL,
            "modality": Modality.VIDEO,
            "prompt": "A locked camera watches light move across a studio table.",
        }
        values.update(overrides)
        return Step(**values)

    def provider(
        self,
        statuses: list[str],
        *,
        media: DownloadedVideo | None = None,
        config: RunwayProviderConfig | None = None,
    ) -> tuple[RunwayVideoProvider, FakeRunwayTaskClient, FakeClock]:
        client = FakeRunwayTaskClient(statuses, media or self.media, output_url=self.url)
        clock = FakeClock()
        provider = RunwayVideoProvider(
            client,
            config or self.config(),
            monotonic=clock.monotonic,
            sleep=clock.sleep,
        )
        return provider, client, clock

    def test_success_freezes_request_and_returns_one_hashed_local_asset(self) -> None:
        provider, client, _ = self.provider(["PENDING", "THROTTLED", "RUNNING", "SUCCEEDED"])

        result = provider.generate(self.step())

        self.assertEqual(len(client.create_calls), 1)
        self.assertEqual(client.create_calls[0]["model"], RUNWAY_MODEL)
        self.assertEqual(client.create_calls[0]["duration_seconds"], RUNWAY_DURATION_SECONDS)
        self.assertEqual(client.create_calls[0]["api_version"], "2024-11-06")
        self.assertEqual(client.create_calls[0]["timeout_seconds"], 30.0)
        self.assertEqual(client.poll_count, 4)
        self.assertEqual(client.download_count, 1)
        self.assertEqual(client.cancel_count, 0)
        self.assertEqual(len(result.assets), 1)
        self.assertEqual(result.assets[0].media_type, "video/mp4")
        self.assertEqual(result.assets[0].size_bytes, len(self.media.data))
        self.assertEqual(Path(result.assets[0].url.removeprefix("file://")).read_bytes(), self.media.data)
        self.assertEqual(result.cost_usd, RUNWAY_ESTIMATED_COST_USD)
        serialized = result.model_dump_json()
        self.assertNotIn("must-not-persist", serialized)
        self.assertNotIn(self.url, serialized)

    def test_timeout_is_bounded_and_cancels_once_without_download(self) -> None:
        provider, client, clock = self.provider(
            ["PENDING"], config=self.config(timeout_seconds=12.0)
        )

        with self.assertRaisesRegex(RunwayProviderError, "timeout"):
            provider.generate(self.step())

        self.assertEqual(clock.value, 12.0)
        self.assertEqual(client.cancel_count, 1)
        self.assertEqual(client.cancel_timeouts, [5.0])
        self.assertEqual(client.download_count, 0)

    def test_late_download_is_rejected_without_deleting_succeeded_task(self) -> None:
        provider, client, clock = self.provider(
            ["SUCCEEDED"], config=self.config(timeout_seconds=10.0)
        )
        original_download = client.download_video

        def late_download(output_url: str, **kwargs: object) -> DownloadedVideo:
            result = original_download(output_url, **kwargs)
            clock.value = 10.0
            return result

        client.download_video = late_download  # type: ignore[method-assign]

        with self.assertRaisesRegex(RunwayProviderError, "timeout"):
            provider.generate(self.step())

        self.assertEqual(client.cancel_count, 0)
        self.assertEqual(list(self.output_dir.iterdir()), [])

    def test_poll_transport_failure_preserves_type_and_cancels_once(self) -> None:
        provider, client, _ = self.provider(["PENDING"])

        def fail_poll(task_id: str, **kwargs: object) -> dict:
            raise RunwayProviderError("http_429", ProviderErrorCode.RATE_LIMIT)

        client.get_task = fail_poll  # type: ignore[method-assign]
        with self.assertRaises(RunwayProviderError) as raised:
            provider.generate(self.step())

        self.assertEqual(raised.exception.error_code, ProviderErrorCode.RATE_LIMIT)
        self.assertEqual(client.cancel_count, 1)

    def test_terminal_failures_never_download_or_create_asset(self) -> None:
        for status, code in (
            ("FAILED", "task_failed"),
            ("CANCELED", "task_canceled"),
            ("CANCELLED", "task_canceled"),
        ):
            with self.subTest(status=status):
                provider, client, _ = self.provider([status])
                step = self.step()
                with self.assertRaisesRegex(RunwayProviderError, code):
                    provider.generate(step)
                self.assertEqual(client.download_count, 0)
                self.assertEqual(step.assets, [])

    def test_unknown_and_malformed_statuses_fail_closed(self) -> None:
        provider, _, _ = self.provider(["PAUSED"])
        with self.assertRaisesRegex(RunwayProviderError, "unknown_task_status"):
            provider.generate(self.step())

    def test_malformed_succeeded_output_does_not_delete_completed_task(self) -> None:
        provider, client, _ = self.provider(["SUCCEEDED"])
        client.get_task = lambda task_id, **kwargs: {"id": task_id, "status": "SUCCEEDED", "output": []}  # type: ignore[method-assign]
        with self.assertRaisesRegex(RunwayProviderError, "malformed_output"):
            provider.generate(self.step())
        self.assertEqual(client.cancel_count, 0)

    def test_rejects_unallowlisted_and_deceptive_output_urls(self) -> None:
        bad_urls = (
            "http://media.runway.test/output.mp4",
            "https://media.runway.test.attacker.example/output.mp4",
            "https://user:pass@media.runway.test/output.mp4",
            "https://127.0.0.1/output.mp4",
            "file:///tmp/output.mp4",
        )
        for bad_url in bad_urls:
            with self.subTest(url=bad_url):
                client = FakeRunwayTaskClient(
                    ["SUCCEEDED"], self.media, output_url=bad_url
                )
                provider = RunwayVideoProvider(client, self.config())
                with self.assertRaisesRegex(RunwayProviderError, "output_url_not_allowed"):
                    provider.generate(self.step())
                self.assertEqual(client.download_count, 0)

    def test_revalidates_redirect_target_and_media_boundary(self) -> None:
        cases = (
            (DownloadedVideo(b"video", "text/html", self.url), "invalid_media_type"),
            (DownloadedVideo(b"", "video/mp4", self.url), "empty_output"),
            (DownloadedVideo(b"x" * 1025, "video/mp4", self.url), "output_too_large"),
            (DownloadedVideo(b"not-an-mp4", "video/mp4", self.url), "invalid_mp4_container"),
            (
                DownloadedVideo(b"video", "video/mp4", "https://attacker.example/out.mp4"),
                "output_url_not_allowed",
            ),
        )
        for media, code in cases:
            with self.subTest(code=code):
                provider, _, _ = self.provider(["SUCCEEDED"], media=media)
                with self.assertRaisesRegex(RunwayProviderError, code):
                    provider.generate(self.step())

    def test_rejects_redirect_before_the_fake_fetches_its_target(self) -> None:
        client = FakeRunwayTaskClient(
            ["SUCCEEDED"],
            self.media,
            output_url=self.url,
            redirect_chain=("https://127.0.0.1/internal",),
        )
        provider = RunwayVideoProvider(client, self.config())

        with self.assertRaisesRegex(RunwayProviderError, "output_url_not_allowed"):
            provider.generate(self.step())

        self.assertEqual(client.download_count, 0)

    def test_local_output_failure_is_stable_and_does_not_leak_path(self) -> None:
        blocked_output = self.output_dir / "not-a-directory"
        blocked_output.write_text("occupied", encoding="utf-8")
        provider, _, _ = self.provider(
            ["SUCCEEDED"], config=self.config(output_dir=blocked_output)
        )

        with self.assertRaisesRegex(RunwayProviderError, "output_write_failed") as raised:
            provider.generate(self.step())

        self.assertNotIn(str(blocked_output), str(raised.exception))

    def test_invalid_prompt_and_model_fail_before_client_call(self) -> None:
        for step in (
            self.step(prompt=" "),
            self.step(prompt="x" * 1001),
            self.step(model="gen4_turbo"),
            self.step(modality=Modality.IMAGE),
            self.step(negative_prompt="text overlay"),
            self.step(params={"duration": 10}),
        ):
            provider, client, _ = self.provider(["SUCCEEDED"])
            with self.assertRaises(RunwayProviderError):
                provider.generate(step)
            self.assertEqual(client.create_calls, [])

    def test_rejects_task_id_that_could_escape_output_directory(self) -> None:
        client = FakeRunwayTaskClient(
            ["SUCCEEDED"], self.media, task_id="../../escaped", output_url=self.url
        )
        provider = RunwayVideoProvider(client, self.config())

        with self.assertRaisesRegex(RunwayProviderError, "malformed_task"):
            provider.generate(self.step())

        self.assertEqual(client.download_count, 0)

    def test_runs_through_genblaze_provider_and_storage_lifecycle(self) -> None:
        provider, client, _ = self.provider(["PENDING", "SUCCEEDED"])
        backend = InMemoryStorageBackend()
        sink = ObjectStorageSink(
            backend,
            prefix="jingci-runway-contract",
            key_strategy=KeyStrategy.CONTENT_ADDRESSABLE,
            max_upload_workers=1,
        )

        result = (
            Pipeline("jingci-runway-contract")
            .step(
                provider,
                model=RUNWAY_MODEL,
                prompt="A locked camera watches light move across a studio table.",
                modality=Modality.VIDEO,
                jingci_shot_id=1,
            )
            .run(sink=sink, progress=False, raise_on_failure=True)
        )

        self.assertEqual(client.download_count, 1)
        self.assertEqual(result.run.status.value, "completed")
        self.assertEqual(result.run.steps[0].status.value, "succeeded")
        self.assertTrue(result.manifest.verify())
        self.assertEqual(len(backend.objects), 2)
        self.assertEqual(
            {record["content_type"] for record in backend.put_records},
            {"video/mp4", "application/json"},
        )

    def test_genblaze_does_not_resubmit_a_failed_paid_generation(self) -> None:
        provider, client, _ = self.provider(["FAILED"])

        with self.assertRaises(PipelineError):
            (
                Pipeline("jingci-runway-no-paid-retry")
                .step(
                    provider,
                    model=RUNWAY_MODEL,
                    prompt="A locked camera watches light move across a studio table.",
                    modality=Modality.VIDEO,
                    jingci_shot_id=1,
                )
                .run(progress=False, raise_on_failure=True)
            )

        self.assertEqual(len(client.create_calls), 1)
        self.assertEqual(client.download_count, 0)

    def test_config_is_redacted_and_requires_exact_hosts(self) -> None:
        summary = self.config().redacted_summary()
        self.assertEqual(summary["credentials"], "[not loaded by provider contract]")
        self.assertEqual(summary["model"], RUNWAY_MODEL)
        self.assertNotIn("secret", json.dumps(summary))
        with self.assertRaisesRegex(ValueError, "allowed_output_hosts"):
            self.config(allowed_output_hosts=())
        with self.assertRaisesRegex(ValueError, "at least 5"):
            self.config(poll_interval_seconds=4.9)
        with self.assertRaisesRegex(ValueError, "between 0 and 5"):
            self.config(cancellation_timeout_seconds=5.1)


if __name__ == "__main__":
    unittest.main()
