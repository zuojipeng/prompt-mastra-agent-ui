from __future__ import annotations

import hashlib
import json
import unittest
from pathlib import Path

from jingci_spike.contract import ShotProvenanceJob
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


if __name__ == "__main__":
    unittest.main()
