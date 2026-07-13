from __future__ import annotations

import io
import json
import unittest
from contextlib import redirect_stderr, redirect_stdout
from datetime import datetime, timezone

from jingci_spike.b2_config import B2Config
from jingci_spike.live_genblaze_b2_smoke import (
    build_plan,
    build_smoke_prefix,
    main,
    run_genblaze_b2_smoke,
)
from jingci_spike.local_pipeline import InMemoryStorageBackend


class SmokeStorageBackend(InMemoryStorageBackend):
    def __init__(
        self,
        *,
        corrupt_manifest: bool = False,
        fail_put_number: int | None = None,
        fail_delete: bool = False,
    ) -> None:
        super().__init__()
        self.corrupt_manifest = corrupt_manifest
        self.fail_put_number = fail_put_number
        self.fail_delete = fail_delete
        self.put_count = 0
        self.deleted: list[str] = []
        self.closed = False

    def put(self, key: str, data: object, **kwargs: object) -> str:
        self.put_count += 1
        if self.fail_put_number == self.put_count:
            raise RuntimeError("injected put failure")
        return super().put(key, data, **kwargs)

    def get(self, key: str) -> bytes:
        if self.corrupt_manifest and "/manifests/" in key:
            return b'{"invalid":true}'
        return super().get(key)

    def delete(self, key: str) -> None:
        self.deleted.append(key)
        if self.fail_delete:
            raise RuntimeError("injected delete failure")
        super().delete(key)

    def close(self) -> None:
        self.closed = True


class LiveGenblazeB2SmokeTest(unittest.TestCase):
    def setUp(self) -> None:
        self.config = B2Config("bucket", "us-west-004", "key-id", "app-key")
        self.prefix = build_smoke_prefix(datetime(2026, 7, 14, tzinfo=timezone.utc), "b" * 32)
        self.payload = b"jingci Genblaze B2 pipeline smoke bytes"

    def test_plan_is_network_and_bucket_mutation_free(self) -> None:
        plan = build_plan()

        self.assertFalse(plan["network"])
        self.assertFalse(plan["bucket_mutations"])
        self.assertFalse(plan["prints_credentials"])
        self.assertEqual(len(plan["objects"]), 2)

    def test_pipeline_verifies_asset_manifest_and_cleanup(self) -> None:
        backend = SmokeStorageBackend()
        result = run_genblaze_b2_smoke(
            self.config,
            backend_factory=lambda _: backend,
            prefix=self.prefix,
            payload=self.payload,
        )

        self.assertEqual(result.status, "passed")
        self.assertTrue(result.asset_key.startswith(f"{self.prefix}/assets/"))
        self.assertTrue(result.manifest_key.startswith(f"{self.prefix}/manifests/"))
        self.assertTrue(result.manifest_verified)
        self.assertTrue(result.cleanup_deleted)
        self.assertEqual(len(backend.put_records), 2)
        self.assertEqual(set(backend.deleted), {result.asset_key, result.manifest_key})
        self.assertEqual(backend.objects, {})
        self.assertTrue(backend.closed)

    def test_corrupt_manifest_still_cleans_both_objects(self) -> None:
        backend = SmokeStorageBackend(corrupt_manifest=True)

        with self.assertRaises(Exception):
            run_genblaze_b2_smoke(
                self.config,
                backend_factory=lambda _: backend,
                prefix=self.prefix,
                payload=self.payload,
            )

        self.assertEqual(len(backend.deleted), 2)
        self.assertEqual(backend.objects, {})
        self.assertTrue(backend.closed)

    def test_partial_pipeline_upload_cleans_the_first_object(self) -> None:
        backend = SmokeStorageBackend(fail_put_number=2)

        with self.assertRaisesRegex(Exception, "injected put failure"):
            run_genblaze_b2_smoke(
                self.config,
                backend_factory=lambda _: backend,
                prefix=self.prefix,
                payload=self.payload,
            )

        self.assertEqual(len(backend.deleted), 1)
        self.assertEqual(backend.objects, {})
        self.assertTrue(backend.closed)

    def test_cleanup_failure_reports_owned_keys_and_closes(self) -> None:
        backend = SmokeStorageBackend(corrupt_manifest=True, fail_delete=True)

        with self.assertRaisesRegex(RuntimeError, self.prefix):
            run_genblaze_b2_smoke(
                self.config,
                backend_factory=lambda _: backend,
                prefix=self.prefix,
                payload=self.payload,
            )

        self.assertTrue(backend.closed)

    def test_live_cli_requires_exact_confirmation(self) -> None:
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
