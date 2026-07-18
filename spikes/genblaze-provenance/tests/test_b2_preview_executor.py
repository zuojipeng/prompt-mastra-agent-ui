from __future__ import annotations

import hashlib
import json
import unittest

from jingci_spike.b2_config import B2Config
from jingci_spike.b2_preview_executor import B2PreviewConfig, B2PreviewExecutor
from jingci_spike.contract import ProvenanceRunRequest
from jingci_spike.local_pipeline import InMemoryStorageBackend


class PreviewBackend(InMemoryStorageBackend):
    def __init__(self, *, fail_put_number: int | None = None, fail_close: bool = False) -> None:
        super().__init__()
        self.fail_put_number = fail_put_number
        self.put_count = 0
        self.closed = False
        self.fail_close = fail_close

    def put(self, key: str, data: object, **kwargs: object) -> str:
        self.put_count += 1
        if self.put_count == self.fail_put_number:
            raise RuntimeError("injected write failure")
        return super().put(key, data, **kwargs)

    def close(self) -> None:
        if self.fail_close:
            raise RuntimeError("injected close failure")
        self.closed = True


class B2PreviewExecutorTest(unittest.TestCase):
    source_key = "jingci-preview/source/recovered-runway.mp4"
    media = b"reviewed recovered Runway output"

    def config(self, **overrides: object) -> B2PreviewConfig:
        values = {
            "b2": B2Config("bucket", "us-east-005", "key-id", "app-key"),
            "source_key": self.source_key,
            "source_sha256": hashlib.sha256(self.media).hexdigest(),
            "source_provider": "runway",
            "source_model": "gen4.5",
            "source_max_bytes": 10_000_000,
        }
        values.update(overrides)
        return B2PreviewConfig(**values)

    def request(self, **overrides: object) -> ProvenanceRunRequest:
        values = {
            "schema_version": "jingci.provenance-run-request.v1",
            "project_id": "project-1",
            "shot_id": 1,
            "parent_job_id": None,
            "attempt": 1,
            "prompt": "cinematic robot crossing a wasteland",
            "negative_prompt": "flicker",
            "provider": "runway",
            "model": "gen4.5",
            "modality": "video",
        }
        values.update(overrides)
        return ProvenanceRunRequest(**values)

    def backend(self, **kwargs: object) -> PreviewBackend:
        backend = PreviewBackend(**kwargs)
        backend.objects[self.source_key] = self.media
        return backend

    def test_b2_execution_retains_verified_owned_asset_and_manifest(self) -> None:
        backend = self.backend()
        result = B2PreviewExecutor(self.config(), lambda _: backend)(self.request())

        self.assertEqual(result["status"], "succeeded")
        self.assertEqual(result["provider"], "runway")
        self.assertEqual(result["model"], "gen4.5")
        self.assertEqual(result["result"]["asset"]["sha256"], self.config().source_sha256)
        self.assertTrue(result["result"]["manifest"]["verified"])
        self.assertTrue(result["result"]["asset"]["url"].startswith("memory://jingci-spike/jingci-preview/runs/"))
        self.assertEqual(len(backend.objects), 3)
        self.assertIn(self.source_key, backend.objects)
        manifest_key = next(key for key in backend.objects if "/manifests/" in key)
        manifest_payload = json.loads(backend.objects[manifest_key])
        self.assertEqual(manifest_payload["run"]["steps"][0]["provider"], "runway")
        self.assertEqual(manifest_payload["run"]["steps"][0]["model"], "gen4.5")
        self.assertTrue(backend.closed)

    def test_source_digest_mismatch_writes_nothing_and_preserves_source(self) -> None:
        backend = self.backend()
        executor = B2PreviewExecutor(self.config(source_sha256="0" * 64), lambda _: backend)

        with self.assertRaisesRegex(ValueError, "digest"):
            executor(self.request())

        self.assertEqual(backend.objects, {self.source_key: self.media})
        self.assertTrue(backend.closed)

    def test_partial_write_cleans_owned_keys_but_never_source(self) -> None:
        backend = self.backend(fail_put_number=2)
        executor = B2PreviewExecutor(self.config(), lambda _: backend)

        with self.assertRaisesRegex(Exception, "write failed"):
            executor(self.request())

        self.assertEqual(backend.objects, {self.source_key: self.media})
        self.assertTrue(backend.closed)

    def test_oversized_source_writes_nothing_and_preserves_source(self) -> None:
        backend = self.backend()
        executor = B2PreviewExecutor(self.config(source_max_bytes=len(self.media) - 1), lambda _: backend)

        with self.assertRaisesRegex(ValueError, "byte limit"):
            executor(self.request())

        self.assertEqual(backend.objects, {self.source_key: self.media})
        self.assertTrue(backend.closed)

    def test_close_failure_compensates_owned_keys_and_preserves_source(self) -> None:
        backend = self.backend(fail_close=True)
        executor = B2PreviewExecutor(self.config(), lambda _: backend)

        with self.assertRaisesRegex(RuntimeError, "close failure"):
            executor(self.request())

        self.assertEqual(backend.objects, {self.source_key: self.media})

    def test_request_cannot_change_reviewed_provider_lineage(self) -> None:
        backend = self.backend()
        executor = B2PreviewExecutor(self.config(), lambda _: backend)

        with self.assertRaisesRegex(ValueError, "lineage"):
            executor(self.request(provider="another-provider"))

        self.assertEqual(backend.objects, {self.source_key: self.media})
        self.assertFalse(backend.closed)

    def test_environment_requires_fixed_source_namespace_and_digest(self) -> None:
        environment = {
            "B2_BUCKET": "bucket",
            "B2_REGION": "us-east-005",
            "B2_KEY_ID": "key-id",
            "B2_APP_KEY": "app-key",
            "JINGCI_PREVIEW_SOURCE_KEY": self.source_key,
            "JINGCI_PREVIEW_SOURCE_SHA256": hashlib.sha256(self.media).hexdigest(),
            "JINGCI_PREVIEW_SOURCE_PROVIDER": "runway",
            "JINGCI_PREVIEW_SOURCE_MODEL": "gen4.5",
            "JINGCI_PREVIEW_SOURCE_MAX_BYTES": "10000000",
        }
        self.assertEqual(B2PreviewConfig.from_environment(environment).source_provider, "runway")
        for bad_key in ("source.mp4", "jingci-preview/source/../escape.mp4", "jingci-preview/source/"):
            invalid = dict(environment, JINGCI_PREVIEW_SOURCE_KEY=bad_key)
            with self.subTest(key=bad_key), self.assertRaises(ValueError):
                B2PreviewConfig.from_environment(invalid)


if __name__ == "__main__":
    unittest.main()
