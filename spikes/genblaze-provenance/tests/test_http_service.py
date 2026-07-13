from __future__ import annotations

import json
import unittest
from unittest.mock import patch

from jingci_spike.contract import ProvenanceRunRequest
from jingci_spike.http_service import (
    MAX_BODY_BYTES,
    ConcurrencyGate,
    PreviewSecurityPolicy,
    build_request_log,
    create_server,
    dispatch_request,
)


class HttpServiceTest(unittest.TestCase):
    token = "reviewer-service-token-that-is-long-enough"
    origin = "https://preview.jingci.example"

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

    def preview_policy(self, **overrides) -> PreviewSecurityPolicy:
        values = {
            "allowed_origin": self.origin,
            "bearer_token": self.token,
            "enabled": True,
            "max_concurrency": 2,
        }
        values.update(overrides)
        return PreviewSecurityPolicy(**values)

    def preview_headers(self, **overrides) -> dict[str, str]:
        headers = {
            "Origin": self.origin,
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json",
        }
        headers.update(overrides)
        return headers

    def test_preview_policy_requires_explicit_safe_configuration(self) -> None:
        base = {
            "JINGCI_PUBLIC_PREVIEW_MODE": "YES",
            "JINGCI_PREVIEW_ALLOWED_ORIGIN": self.origin,
            "JINGCI_PREVIEW_BEARER_TOKEN": self.token,
            "JINGCI_PROVENANCE_ENABLED": "YES",
            "JINGCI_PREVIEW_MAX_CONCURRENCY": "2",
        }
        policy = PreviewSecurityPolicy.from_environment(base)
        self.assertTrue(policy.enabled)
        self.assertEqual(policy.max_concurrency, 2)
        for key in ("JINGCI_PUBLIC_PREVIEW_MODE", "JINGCI_PREVIEW_ALLOWED_ORIGIN", "JINGCI_PREVIEW_BEARER_TOKEN"):
            invalid = dict(base)
            invalid.pop(key)
            with self.subTest(key=key), self.assertRaises(ValueError):
                PreviewSecurityPolicy.from_environment(invalid)

    def test_preview_requests_require_exact_origin_and_authorization(self) -> None:
        policy = self.preview_policy()
        body = json.dumps(self.request()).encode()
        allowed = dispatch_request("POST", "/v1/provenance-runs", self.preview_headers(), body, policy)
        denied_origin = dispatch_request(
            "POST",
            "/v1/provenance-runs",
            self.preview_headers(Origin=f"{self.origin}.attacker.invalid"),
            body,
            policy,
        )
        denied_token = dispatch_request(
            "POST",
            "/v1/provenance-runs",
            self.preview_headers(Authorization="Bearer wrong"),
            body,
            policy,
        )
        leaked_validation = dispatch_request(
            "POST",
            "/v1/provenance-runs",
            self.preview_headers(),
            json.dumps(self.request(schema_version="secret-schema-value")).encode(),
            policy,
        )
        denied_preflight = dispatch_request(
            "OPTIONS",
            "/v1/provenance-runs",
            {"Origin": "https://attacker.invalid"},
            policy=policy,
        )
        self.assertEqual(allowed.status, 200)
        self.assertEqual(allowed.headers["Access-Control-Allow-Origin"], self.origin)
        self.assertEqual(denied_origin.status, 403)
        self.assertNotIn("Access-Control-Allow-Origin", denied_origin.headers)
        self.assertEqual(denied_token.status, 401)
        self.assertNotIn(self.token, json.dumps(denied_token.body))
        self.assertEqual(leaked_validation.status, 400)
        self.assertNotIn("secret-schema-value", json.dumps(leaked_validation.body))
        self.assertEqual(denied_preflight.status, 403)

    def test_preview_disable_switch_and_health_fail_closed(self) -> None:
        policy = self.preview_policy(enabled=False)
        health = dispatch_request("GET", "/health", {"Origin": self.origin}, policy=policy)
        run = dispatch_request(
            "POST",
            "/v1/provenance-runs",
            self.preview_headers(),
            json.dumps(self.request()).encode(),
            policy,
        )
        self.assertEqual(health.status, 503)
        self.assertEqual(health.body, {"status": "disabled", "mode": "preview"})
        self.assertEqual(run.status, 503)
        self.assertEqual(run.body["error"]["code"], "service_disabled")

    def test_concurrency_gate_rejects_excess_work_and_recovers(self) -> None:
        gate = ConcurrencyGate(1)
        self.assertTrue(gate.acquire())
        self.assertFalse(gate.acquire())
        gate.release()
        self.assertTrue(gate.acquire())
        gate.release()

    def test_public_bind_requires_preview_policy_but_loopback_does_not(self) -> None:
        with patch("jingci_spike.http_service.ProvenanceHTTPServer") as server_class:
            create_server("127.0.0.1", 0, {})
            self.assertIsNone(server_class.call_args.args[1])
            with self.assertRaisesRegex(ValueError, "PUBLIC_PREVIEW_MODE"):
                create_server("0.0.0.0", 0, {})

    def test_structured_log_excludes_headers_body_and_secrets(self) -> None:
        event = build_request_log("request-1", "POST", "/v1/provenance-runs?token=secret", 401, 4)
        encoded = json.dumps(event)
        self.assertEqual(set(event), {"event", "request_id", "method", "path", "status", "duration_ms"})
        self.assertNotIn(self.token, encoded)
        self.assertNotIn("prompt", encoded)
        self.assertNotIn("secret", encoded)


if __name__ == "__main__":
    unittest.main()
