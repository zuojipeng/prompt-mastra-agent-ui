from __future__ import annotations

import io
import json
import signal
import unittest
from unittest.mock import MagicMock, patch

from jingci_spike.runtime_service import PUBLIC_HOST, RuntimeConfig, serve


class RuntimeServiceTest(unittest.TestCase):
    def environment(self, **overrides: str) -> dict[str, str]:
        values = {
            "PORT": "8788",
            "JINGCI_PUBLIC_PREVIEW_MODE": "YES",
            "JINGCI_PREVIEW_ALLOWED_ORIGIN": "https://preview.jingci.example",
            "JINGCI_PREVIEW_BEARER_TOKEN": "reviewer-service-token-that-is-long-enough",
            "JINGCI_PREVIEW_MAX_CONCURRENCY": "2",
            "JINGCI_PROVENANCE_ENABLED": "YES",
            "JINGCI_PROVENANCE_STORAGE_MODE": "MEMORY",
        }
        values.update(overrides)
        return values

    def test_runtime_config_uses_public_bind_and_railway_port(self) -> None:
        config = RuntimeConfig.from_environment(self.environment(PORT="4312"))
        self.assertEqual(config.host, PUBLIC_HOST)
        self.assertEqual(config.port, 4312)
        self.assertTrue(config.policy.enabled)
        self.assertEqual(config.storage_mode, "MEMORY")

    def test_runtime_config_rejects_missing_invalid_or_out_of_range_port(self) -> None:
        for value in ("", "not-a-port", "0", "65536"):
            with self.subTest(value=value), self.assertRaisesRegex(ValueError, "PORT"):
                RuntimeConfig.from_environment(self.environment(PORT=value))

    def test_runtime_config_rejects_incomplete_preview_security(self) -> None:
        environment = self.environment()
        environment.pop("JINGCI_PREVIEW_BEARER_TOKEN")
        with self.assertRaisesRegex(ValueError, "BEARER_TOKEN"):
            RuntimeConfig.from_environment(environment)

    def test_runtime_config_rejects_missing_storage_mode_and_incomplete_b2(self) -> None:
        with self.assertRaisesRegex(ValueError, "STORAGE_MODE"):
            RuntimeConfig.from_environment(self.environment(JINGCI_PROVENANCE_STORAGE_MODE=""))
        with self.assertRaisesRegex(ValueError, "SOURCE_KEY"):
            RuntimeConfig.from_environment(self.environment(JINGCI_PROVENANCE_STORAGE_MODE="B2"))

    def test_startup_event_excludes_origin_and_bearer_token(self) -> None:
        config = RuntimeConfig.from_environment(self.environment())
        encoded = json.dumps(config.startup_event())
        self.assertNotIn(config.policy.bearer_token, encoded)
        self.assertNotIn(config.policy.allowed_origin, encoded)
        self.assertEqual(config.startup_event()["mode"], "preview")

    def test_invalid_configuration_fails_closed_without_echoing_values(self) -> None:
        error_output = io.StringIO()
        environment = self.environment()
        environment.update({"JINGCI_PREVIEW_BEARER_TOKEN": "too-short-for-policy"})
        with patch("sys.stderr", error_output):
            result = serve(environment)
        self.assertEqual(result, 2)
        self.assertNotIn("too-short-for-policy", error_output.getvalue())
        self.assertIn("provenance_runtime_config_invalid", error_output.getvalue())

    @patch("jingci_spike.runtime_service.signal.signal")
    @patch("jingci_spike.runtime_service.build_executor")
    @patch("jingci_spike.runtime_service.create_server")
    def test_server_lifecycle_closes_and_restores_signal_handlers(
        self,
        create_server: MagicMock,
        build_executor: MagicMock,
        signal_signal: MagicMock,
    ) -> None:
        server = create_server.return_value
        signal_signal.side_effect = ["term-handler", "int-handler", None, None]
        result = serve(self.environment())
        self.assertEqual(result, 0)
        create_server.assert_called_once_with(PUBLIC_HOST, 8788, self.environment(), build_executor.return_value)
        server.serve_forever.assert_called_once_with()
        server.server_close.assert_called_once_with()
        self.assertEqual(signal_signal.call_args_list[-2].args, (signal.SIGTERM, "term-handler"))
        self.assertEqual(signal_signal.call_args_list[-1].args, (signal.SIGINT, "int-handler"))


if __name__ == "__main__":
    unittest.main()
