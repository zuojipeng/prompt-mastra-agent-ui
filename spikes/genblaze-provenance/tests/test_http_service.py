from __future__ import annotations

import json
import unittest
from unittest.mock import patch

from jingci_spike.contract import ProvenanceRunRequest
from jingci_spike.http_service import MAX_BODY_BYTES, dispatch_request


class HttpServiceTest(unittest.TestCase):
    def request(self, **overrides) -> dict:
        payload = {
            "schema_version": "jingci.provenance-run-request.v1",
            "project_id": "project-1",
            "shot_id": 1,
            "parent_job_id": None,
            "attempt": 1,
            "prompt": "slow tracking shot",
            "negative_prompt": "flicker",
            "provider": "genblaze-local",
            "model": "local-proof",
            "modality": "video",
        }
        payload.update(overrides)
        return payload

    def test_request_contract_enforces_retry_lineage(self) -> None:
        self.assertEqual(ProvenanceRunRequest.from_dict(self.request()).attempt, 1)
        with self.assertRaisesRegex(ValueError, "must not include parent"):
            ProvenanceRunRequest.from_dict(self.request(parent_job_id="parent"))
        with self.assertRaisesRegex(ValueError, "require parent"):
            ProvenanceRunRequest.from_dict(self.request(attempt=2))

    def test_health_and_local_cors_are_bounded(self) -> None:
        local = dispatch_request("GET", "/health", {"Origin": "http://127.0.0.1:3000"})
        external = dispatch_request("GET", "/health", {"Origin": "https://example.com"})
        self.assertEqual(local.status, 200)
        self.assertEqual(local.body, {"status": "ok", "mode": "local-fixture"})
        self.assertEqual(local.headers["Access-Control-Allow-Origin"], "http://127.0.0.1:3000")
        self.assertNotIn("Access-Control-Allow-Origin", external.headers)

    def test_post_executes_genblaze_pipeline_and_returns_wire_contract(self) -> None:
        result = dispatch_request(
            "POST",
            "/v1/provenance-runs",
            {"Origin": "http://localhost:3000", "Content-Type": "application/json; charset=utf-8"},
            json.dumps(self.request()).encode(),
        )
        self.assertEqual(result.status, 200)
        self.assertEqual(result.body["schema_version"], "jingci.provenance-run.v1")
        self.assertEqual(result.body["status"], "succeeded")
        self.assertEqual(result.body["provider"], "jingci-local-video")
        self.assertTrue(result.body["result"]["manifest"]["verified"])
        self.assertTrue(result.body["result"]["asset"]["url"].startswith("memory://jingci-spike/"))

    def test_invalid_json_unknown_route_and_large_payload_fail_closed(self) -> None:
        headers = {"Content-Type": "application/json"}
        invalid = dispatch_request("POST", "/v1/provenance-runs", headers, b"not-json")
        missing = dispatch_request("POST", "/unknown", {}, b"{}")
        large = dispatch_request("POST", "/v1/provenance-runs", headers, b"x" * (MAX_BODY_BYTES + 1))
        wrong_type = dispatch_request("POST", "/v1/provenance-runs", {"Content-Type": "text/plain"}, b"{}")
        self.assertEqual(invalid.status, 400)
        self.assertEqual(invalid.body["error"]["code"], "invalid_request")
        self.assertEqual(missing.status, 404)
        self.assertEqual(large.status, 413)
        self.assertEqual(wrong_type.status, 415)

    def test_execution_failure_is_redacted(self) -> None:
        with patch("jingci_spike.http_service.execute_local_provenance_run", side_effect=RuntimeError("secret")):
            result = dispatch_request(
                "POST",
                "/v1/provenance-runs",
                {"Content-Type": "application/json"},
                json.dumps(self.request()).encode(),
            )
        self.assertEqual(result.status, 500)
        self.assertEqual(result.body["error"]["code"], "execution_failed")
        self.assertNotIn("secret", json.dumps(result.body))


if __name__ == "__main__":
    unittest.main()
