from __future__ import annotations

import hashlib
import json
import unittest
from pathlib import Path
from unittest.mock import patch

from botocore.config import Config as BotoConfig
from genblaze_s3 import S3StorageBackend

from jingci_spike.contract import ShotProvenanceJob
from jingci_spike.b2_config import (
    B2Config,
    NoRetryS3StorageBackend,
    build_live_backblaze_backend,
    build_offline_backblaze_backend,
)
from jingci_spike.manifest_adapter import build_verified_manifest
from jingci_spike.local_pipeline import execute_local_storage_pipeline


ROOT = Path(__file__).resolve().parents[1]


class ManifestAdapterTest(unittest.TestCase):
    def fixture(self) -> dict:
        return json.loads((ROOT / "fixtures" / "shot-job.json").read_text(encoding="utf-8"))

    def test_builds_verified_manifest_with_shot_lineage(self) -> None:
        result = build_verified_manifest(ShotProvenanceJob.from_dict(self.fixture()))

        self.assertTrue(result["verified"])
        self.assertEqual(result["shot_id"], 1)
        self.assertEqual(result["unverified_asset_ids"], [])
        step = result["manifest"]["run"]["steps"][0]
        self.assertEqual(result["manifest"]["run"]["status"], "completed")
        self.assertEqual(step["provider"], "fixture")
        self.assertEqual(step["model"], "local-proof")
        self.assertEqual(step["negative_prompt"], self.fixture()["negative_prompt"])
        self.assertEqual(step["params"]["jingci_shot_id"], 1)
        self.assertEqual(step["assets"][0]["sha256"], self.fixture()["asset"]["sha256"])

    def test_rejects_missing_asset_digest(self) -> None:
        payload = self.fixture()
        payload["asset"]["sha256"] = ""
        with self.assertRaisesRegex(ValueError, "sha256"):
            ShotProvenanceJob.from_dict(payload)

    def test_rejects_unknown_contract_version(self) -> None:
        payload = self.fixture()
        payload["schema_version"] = "jingci.shot-provenance.v2"
        with self.assertRaisesRegex(ValueError, "unsupported schema_version"):
            ShotProvenanceJob.from_dict(payload)

    def test_rejects_non_string_metadata(self) -> None:
        payload = self.fixture()
        payload["metadata"]["attempt"] = 1
        with self.assertRaisesRegex(ValueError, "metadata"):
            ShotProvenanceJob.from_dict(payload)

    def test_executes_provider_and_content_addressed_storage_lifecycle(self) -> None:
        job = ShotProvenanceJob.from_dict(self.fixture())
        media_bytes = b"jingci deterministic local video fixture"
        result = execute_local_storage_pipeline(job, media_bytes)

        self.assertEqual(result["provider_call_count"], 1)
        self.assertEqual(result["run_status"], "completed")
        self.assertEqual(result["step_status"], "succeeded")
        self.assertEqual(result["asset_size_bytes"], len(media_bytes))
        self.assertEqual(result["asset_sha256"], hashlib.sha256(media_bytes).hexdigest())
        self.assertTrue(result["asset_url"].startswith("memory://jingci-spike/jingci-spike/assets/"))
        self.assertTrue(result["manifest_uri"].startswith("memory://jingci-spike/jingci-spike/manifests/"))
        self.assertIn(result["manifest_key"], result["stored_keys"])
        self.assertEqual(len(result["stored_keys"]), 2)
        persisted_values = result["stored_keys"] + [result["asset_url"], result["manifest_uri"]]
        self.assertFalse(any("X-Amz-" in value or "Credential" in value for value in persisted_values))

    def test_local_pipeline_rejects_empty_media(self) -> None:
        job = ShotProvenanceJob.from_dict(self.fixture())
        with self.assertRaisesRegex(ValueError, "must not be empty"):
            execute_local_storage_pipeline(job, b"")

    def test_b2_config_fails_closed_without_naming_secret_values(self) -> None:
        with self.assertRaisesRegex(ValueError, "B2_BUCKET, B2_REGION, B2_KEY_ID, B2_APP_KEY"):
            B2Config.from_env({})

    def test_b2_config_redacts_credentials(self) -> None:
        config = B2Config.from_env(
            {
                "B2_BUCKET": "jingci-spike",
                "B2_REGION": "us-west-004",
                "B2_KEY_ID": "test-key-id-1234",
                "B2_APP_KEY": "test-secret-value",
            }
        )
        summary = config.redacted_summary()
        self.assertEqual(summary["bucket"], "jingci-spike")
        self.assertEqual(summary["key_id"], "te...34")
        self.assertEqual(summary["app_key"], "[redacted]")
        self.assertNotIn(config.app_key, json.dumps(summary))

    def test_offline_b2_backend_disables_network_preflight_and_lifecycle(self) -> None:
        config = B2Config("bucket", "us-west-004", "key-id", "app-key")
        observed: dict = {}

        def factory(bucket: str, **kwargs):
            observed.update({"bucket": bucket, **kwargs})
            return "offline-backend"

        backend = build_offline_backblaze_backend(config, factory)
        self.assertEqual(backend, "offline-backend")
        self.assertEqual(observed["bucket"], "bucket")
        self.assertFalse(observed["preflight"])
        self.assertFalse(observed["auto_lifecycle"])

    def test_live_b2_backend_defaults_to_single_attempt_transport(self) -> None:
        default_factory = build_live_backblaze_backend.__defaults__[0]
        self.assertIs(default_factory.__self__, NoRetryS3StorageBackend)

        backend = NoRetryS3StorageBackend.__new__(NoRetryS3StorageBackend)
        base_config = BotoConfig(connect_timeout=30, retries={"max_attempts": 3, "mode": "adaptive"})
        with patch.object(S3StorageBackend, "_client_kwargs", return_value={"config": base_config}):
            kwargs = backend._client_kwargs()

        self.assertEqual(kwargs["config"].connect_timeout, 30)
        self.assertEqual(
            kwargs["config"].retries,
            {"total_max_attempts": 1, "mode": "standard"},
        )


if __name__ == "__main__":
    unittest.main()
