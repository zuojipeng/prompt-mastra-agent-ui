from __future__ import annotations

import hashlib
import io
import json
import unittest
from contextlib import redirect_stderr, redirect_stdout
from datetime import datetime, timezone

from jingci_spike.b2_config import B2Config, build_live_backblaze_backend
from jingci_spike.live_b2_smoke import build_plan, build_smoke_key, main, run_live_smoke


class RecordingBackend:
    def __init__(
        self,
        *,
        corrupt_readback: bool = False,
        returned_key: str | None = None,
        fail_delete: bool = False,
    ) -> None:
        self.objects: dict[str, bytes] = {}
        self.corrupt_readback = corrupt_readback
        self.returned_key = returned_key
        self.fail_delete = fail_delete
        self.deleted: list[str] = []
        self.closed = False

    def put(self, key: str, data: bytes, **_: object) -> str:
        self.objects[key] = data
        return self.returned_key or key

    def exists(self, key: str) -> bool:
        return key in self.objects

    def get(self, key: str) -> bytes:
        return b"corrupt" if self.corrupt_readback else self.objects[key]

    def delete(self, key: str) -> None:
        self.deleted.append(key)
        if self.fail_delete:
            raise RuntimeError("delete denied")
        self.objects.pop(key, None)

    def close(self) -> None:
        self.closed = True


class LiveB2SmokeTest(unittest.TestCase):
    def setUp(self) -> None:
        self.config = B2Config("bucket", "us-west-004", "key-id", "app-key")
        self.key = build_smoke_key(datetime(2026, 7, 14, tzinfo=timezone.utc), "a" * 32)

    def test_plan_is_credential_free_and_network_free(self) -> None:
        plan = build_plan()

        self.assertFalse(plan["network"])
        self.assertFalse(plan["bucket_mutations"])
        self.assertFalse(plan["prints_credentials"])
        self.assertEqual(plan["object_prefix"], "jingci-smoke/")

    def test_live_backend_enables_preflight_without_lifecycle_mutation(self) -> None:
        calls: list[tuple[object, dict[str, object]]] = []

        def factory(bucket: object, **kwargs: object) -> object:
            calls.append((bucket, kwargs))
            return object()

        build_live_backblaze_backend(self.config, factory)

        self.assertEqual(calls[0][0], "bucket")
        self.assertTrue(calls[0][1]["preflight"])
        self.assertFalse(calls[0][1]["auto_lifecycle"])

    def test_live_smoke_verifies_readback_and_cleanup(self) -> None:
        backend = RecordingBackend()
        payload = b"verified smoke bytes"
        result = run_live_smoke(
            self.config,
            backend_factory=lambda _: backend,
            object_key=self.key,
            payload=payload,
        )

        expected = hashlib.sha256(payload).hexdigest()
        self.assertEqual(result.payload_sha256, expected)
        self.assertEqual(result.readback_sha256, expected)
        self.assertTrue(result.cleanup_deleted)
        self.assertEqual(backend.deleted, [self.key])
        self.assertTrue(backend.closed)

    def test_digest_failure_still_deletes_and_closes(self) -> None:
        backend = RecordingBackend(corrupt_readback=True)

        with self.assertRaisesRegex(RuntimeError, "digest mismatch"):
            run_live_smoke(
                self.config,
                backend_factory=lambda _: backend,
                object_key=self.key,
                payload=b"verified smoke bytes",
            )

        self.assertEqual(backend.deleted, [self.key])
        self.assertTrue(backend.closed)

    def test_unexpected_put_result_still_deletes_and_closes(self) -> None:
        backend = RecordingBackend(returned_key="unexpected-key")

        with self.assertRaisesRegex(RuntimeError, "not observable"):
            run_live_smoke(
                self.config,
                backend_factory=lambda _: backend,
                object_key=self.key,
                payload=b"verified smoke bytes",
            )

        self.assertEqual(backend.deleted, [self.key])
        self.assertTrue(backend.closed)

    def test_cleanup_failure_names_only_the_object_key(self) -> None:
        backend = RecordingBackend(corrupt_readback=True, fail_delete=True)

        with self.assertRaisesRegex(RuntimeError, self.key):
            run_live_smoke(
                self.config,
                backend_factory=lambda _: backend,
                object_key=self.key,
                payload=b"verified smoke bytes",
            )

        self.assertTrue(backend.closed)

    def test_live_cli_fails_before_config_without_exact_confirmation(self) -> None:
        stderr = io.StringIO()
        with redirect_stderr(stderr):
            result = main(["--live"], {})

        self.assertEqual(result, 2)
        self.assertIn("JINGCI_ALLOW_LIVE_B2_SMOKE=YES", stderr.getvalue())

    def test_plan_cli_outputs_json_without_configuration(self) -> None:
        stdout = io.StringIO()
        with redirect_stdout(stdout):
            result = main(["--plan"], {})

        self.assertEqual(result, 0)
        self.assertFalse(json.loads(stdout.getvalue())["network"])


if __name__ == "__main__":
    unittest.main()
