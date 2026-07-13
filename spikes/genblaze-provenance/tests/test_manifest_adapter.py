from __future__ import annotations

import json
import unittest
from pathlib import Path

from jingci_spike.contract import ShotProvenanceJob
from jingci_spike.manifest_adapter import build_verified_manifest


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


if __name__ == "__main__":
    unittest.main()
