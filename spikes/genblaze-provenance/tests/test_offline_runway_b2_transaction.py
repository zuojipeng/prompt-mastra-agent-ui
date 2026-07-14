from __future__ import annotations

import asyncio
import json
import tempfile
import unittest
from dataclasses import asdict
from datetime import datetime, timezone
from pathlib import Path

from genblaze_core import Modality, Pipeline, Step
from genblaze_core.exceptions import PipelineError
from genblaze_core.models.enums import ProviderErrorCode

from jingci_spike.live_genblaze_b2_smoke import build_smoke_prefix
from jingci_spike.live_runway_smoke import VideoProbe
from jingci_spike.local_pipeline import InMemoryStorageBackend
from jingci_spike.offline_runway_b2_transaction import (
    OfflineRunwayB2Error,
    build_offline_plan,
    run_offline_runway_b2_transaction,
)
from jingci_spike.runway_provider import (
    RUNWAY_MODEL,
    DownloadedVideo,
    FakeRunwayTaskClient,
    RunwayProviderConfig,
    RunwayProviderError,
    RunwayVideoProvider,
)


MEDIA = b"\x00\x00\x00\x18ftypisomdeterministic-offline-runway-mp4"
SIGNED_URL = "https://media.runway.test/output.mp4?token=must-not-persist"


class TransactionBackend(InMemoryStorageBackend):
    def __init__(
        self,
        *,
        fail_after_commit: int | None = None,
        corrupt_asset: bool = False,
        corrupt_manifest: bool = False,
        fail_delete_content_type: str | None = None,
        fail_close: bool = False,
        false_cleanup_success: bool = False,
        store_outside_prefix: bool = False,
    ) -> None:
        super().__init__()
        self.fail_after_commit = fail_after_commit
        self.corrupt_asset = corrupt_asset
        self.corrupt_manifest = corrupt_manifest
        self.fail_delete_content_type = fail_delete_content_type
        self.fail_close = fail_close
        self.false_cleanup_success = false_cleanup_success
        self.store_outside_prefix = store_outside_prefix
        self.put_count = 0
        self.delete_attempts: list[str] = []
        self.close_count = 0
        self.read_bodies: list[bytes] = []

    def put(self, key: str, data: object, **kwargs: object) -> str:
        self.put_count += 1
        stored_key = super().put(key, data, **kwargs)
        if self.store_outside_prefix:
            outside_key = f"outside-owned-prefix/object-{self.put_count}"
            self.objects[outside_key] = self.objects.pop(key)
            stored_key = outside_key
        if self.fail_after_commit == self.put_count:
            raise RuntimeError("injected ambiguous upload failure")
        return stored_key

    def get(self, key: str) -> bytes:
        body = super().get(key)
        if self.corrupt_asset and "/assets/" in key:
            body += b"corrupt"
        if self.corrupt_manifest and "/manifests/" in key:
            body = b'{"invalid":true}'
        self.read_bodies.append(body)
        return body

    def delete(self, key: str) -> None:
        self.delete_attempts.append(key)
        record = next((value for value in self.put_records if value["key"] == key), None)
        if record and record["content_type"] == self.fail_delete_content_type:
            raise RuntimeError("injected delete failure")
        if self.false_cleanup_success:
            return
        super().delete(key)

    def exists(self, key: str) -> bool:
        if self.false_cleanup_success:
            return False
        return super().exists(key)

    def close(self) -> None:
        self.close_count += 1
        if self.fail_close:
            raise RuntimeError("injected close failure")


class OfflineRunwayB2TransactionTest(unittest.TestCase):
    def setUp(self) -> None:
        self.prefix = build_smoke_prefix(
            datetime(2026, 7, 14, 15, tzinfo=timezone.utc), "c" * 32
        )
        self.media = DownloadedVideo(MEDIA, "video/mp4", SIGNED_URL)

    def client(self, statuses: list[str] | None = None) -> FakeRunwayTaskClient:
        return FakeRunwayTaskClient(
            statuses or ["SUCCEEDED"], self.media, output_url=SIGNED_URL
        )

    @staticmethod
    def probe(paths: list[Path]):
        def verify(path: Path) -> VideoProbe:
            paths.append(path)
            if path.read_bytes() != MEDIA:
                raise AssertionError("probe did not receive provider media")
            return VideoProbe("h264", 1280, 720, 5.0)

        return verify

    def test_composes_one_fake_runway_output_through_probe_sink_readback_and_cleanup(self) -> None:
        backend = TransactionBackend()
        client = self.client(["PENDING", "SUCCEEDED"])
        probed_paths: list[Path] = []

        result = run_offline_runway_b2_transaction(
            client=client,
            backend=backend,
            probe=self.probe(probed_paths),
            prefix=self.prefix,
        )

        self.assertEqual(result.status, "passed")
        self.assertFalse(result.network)
        self.assertEqual(result.provider_create_count, 1)
        self.assertEqual(len(client.create_calls), 1)
        self.assertEqual(client.download_count, 1)
        self.assertEqual(client.cancel_count, 0)
        self.assertEqual(len(probed_paths), 1)
        self.assertFalse(probed_paths[0].exists())
        self.assertEqual(backend.objects, {})
        self.assertEqual(len(backend.delete_attempts), 2)
        self.assertEqual(backend.close_count, 1)
        persisted = b"\n".join(backend.read_bodies)
        self.assertNotIn(SIGNED_URL.encode(), persisted)
        self.assertNotIn(b"must-not-persist", persisted)
        self.assertEqual(result.task_id, client.task_id)
        self.assertNotIn("token", json.dumps(asdict(result)))

    def test_probe_rejection_prevents_storage_and_preserves_succeeded_task(self) -> None:
        backend = TransactionBackend()
        client = self.client()

        with self.assertRaisesRegex(PipelineError, "output_probe_failed"):
            run_offline_runway_b2_transaction(
                client=client,
                backend=backend,
                probe=lambda _: (_ for _ in ()).throw(RuntimeError("bad codec")),
                prefix=self.prefix,
            )

        self.assertEqual(len(client.create_calls), 1)
        self.assertEqual(client.cancel_count, 0)
        self.assertEqual(backend.put_records, [])
        self.assertEqual(backend.close_count, 1)

    def test_ambiguous_asset_or_manifest_commit_is_compensated(self) -> None:
        for fail_number in (1, 2):
            with self.subTest(fail_number=fail_number):
                backend = TransactionBackend(fail_after_commit=fail_number)
                client = self.client()
                with self.assertRaises(Exception):
                    run_offline_runway_b2_transaction(
                        client=client,
                        backend=backend,
                        probe=self.probe([]),
                        prefix=self.prefix,
                    )
                self.assertEqual(backend.objects, {})
                self.assertEqual(len(client.create_calls), 1)
                self.assertEqual(backend.close_count, 1)

    def test_asset_and_manifest_integrity_failures_cleanup_both_objects(self) -> None:
        for option in ("corrupt_asset", "corrupt_manifest"):
            with self.subTest(option=option):
                backend = TransactionBackend(**{option: True})
                with self.assertRaises(Exception):
                    run_offline_runway_b2_transaction(
                        client=self.client(),
                        backend=backend,
                        probe=self.probe([]),
                        prefix=self.prefix,
                    )
                self.assertEqual(backend.objects, {})
                self.assertEqual(len(backend.delete_attempts), 2)
                self.assertEqual(backend.close_count, 1)

    def test_cleanup_failure_preserves_primary_cause_and_attempts_every_key(self) -> None:
        backend = TransactionBackend(
            corrupt_asset=True,
            fail_delete_content_type="video/mp4",
        )

        with self.assertRaises(OfflineRunwayB2Error) as raised:
            run_offline_runway_b2_transaction(
                client=self.client(),
                backend=backend,
                probe=self.probe([]),
                prefix=self.prefix,
            )

        self.assertEqual(raised.exception.code, "primary_and_cleanup_failed")
        self.assertIsNotNone(raised.exception.__cause__)
        self.assertEqual(len(backend.delete_attempts), 2)
        self.assertEqual(len(backend.objects), 1)
        self.assertEqual(backend.close_count, 1)

    def test_backend_close_failure_fails_after_storage_cleanup(self) -> None:
        backend = TransactionBackend(fail_close=True)
        with self.assertRaises(OfflineRunwayB2Error) as raised:
            run_offline_runway_b2_transaction(
                client=self.client(), backend=backend, probe=self.probe([]), prefix=self.prefix
            )
        self.assertEqual(raised.exception.code, "backend_close_failed")
        self.assertEqual(backend.objects, {})
        self.assertEqual(backend.close_count, 1)

    def test_false_negative_exists_cannot_make_cleanup_pass(self) -> None:
        backend = TransactionBackend(false_cleanup_success=True)
        with self.assertRaises(OfflineRunwayB2Error) as raised:
            run_offline_runway_b2_transaction(
                client=self.client(), backend=backend, probe=self.probe([]), prefix=self.prefix
            )
        self.assertEqual(raised.exception.code, "storage_cleanup_failed")
        self.assertEqual(len(raised.exception.residual_keys), 2)
        self.assertEqual(len(backend.objects), 2)

    def test_out_of_prefix_stored_keys_are_reported_but_never_deleted(self) -> None:
        backend = TransactionBackend(store_outside_prefix=True)
        with self.assertRaises(OfflineRunwayB2Error) as raised:
            run_offline_runway_b2_transaction(
                client=self.client(), backend=backend, probe=self.probe([]), prefix=self.prefix
            )
        self.assertEqual(raised.exception.code, "primary_and_cleanup_failed")
        self.assertTrue(all(key.startswith("outside-owned-prefix/") for key in raised.exception.residual_keys))
        self.assertTrue(all(key.startswith(f"{self.prefix}/") for key in backend.delete_attempts))
        self.assertEqual(set(backend.objects), set(raised.exception.residual_keys))

    def test_runway_provider_ignores_caller_requested_paid_retries(self) -> None:
        client = self.client()
        create_count = 0

        def fail_create(**_: object) -> str:
            nonlocal create_count
            create_count += 1
            raise RunwayProviderError("http_429", ProviderErrorCode.RATE_LIMIT)

        client.create_text_video = fail_create  # type: ignore[method-assign]
        with tempfile.TemporaryDirectory(prefix="jingci-paid-retry-") as directory:
            provider = RunwayVideoProvider(
                client,
                RunwayProviderConfig(Path(directory), ("media.runway.test",)),
            )
            result = (
                Pipeline("paid-retry-guard")
                .step(
                    provider,
                    model=RUNWAY_MODEL,
                    prompt="A locked camera watches light move across a table.",
                    modality=Modality.VIDEO,
                    jingci_shot_id=1,
                )
                .run(progress=False, max_retries=3, raise_on_failure=False)
            )
        self.assertEqual(result.run.status.value, "failed")
        self.assertEqual(create_count, 1)

    def test_runway_provider_async_ignores_caller_requested_paid_retries(self) -> None:
        client = self.client()
        create_count = 0

        def fail_create(**_: object) -> str:
            nonlocal create_count
            create_count += 1
            raise RunwayProviderError("http_429", ProviderErrorCode.RATE_LIMIT)

        client.create_text_video = fail_create  # type: ignore[method-assign]
        with tempfile.TemporaryDirectory(prefix="jingci-paid-async-retry-") as directory:
            provider = RunwayVideoProvider(
                client,
                RunwayProviderConfig(Path(directory), ("media.runway.test",)),
            )
            result = asyncio.run(
                provider.ainvoke(
                    Step(
                        provider="runway",
                        model=RUNWAY_MODEL,
                        modality=Modality.VIDEO,
                        prompt="A locked camera watches light move across a table.",
                    ),
                    {"max_retries": 3},
                )
            )
        self.assertEqual(result.status.value, "failed")
        self.assertEqual(create_count, 1)

    def test_offline_plan_is_explicit_about_injected_boundaries(self) -> None:
        plan = build_offline_plan()
        self.assertFalse(plan["network"])
        self.assertFalse(plan["credentials"])
        self.assertFalse(plan["spend"])
        self.assertIn("injected", plan["probe"])


if __name__ == "__main__":
    unittest.main()
