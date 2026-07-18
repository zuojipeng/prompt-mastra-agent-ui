from __future__ import annotations

import hashlib
import io
import json
import unittest
from contextlib import redirect_stdout

from jingci_spike.b2_config import B2Config
from jingci_spike.preview_source_promotion import build_plan, main, promote_preview_source


class PromotionBackend:
    def __init__(self, *, corrupt_readback: bool = False) -> None:
        self.objects: dict[str, bytes] = {}
        self.corrupt_readback = corrupt_readback
        self.deleted: list[str] = []
        self.close_calls = 0

    def exists(self, key: str) -> bool:
        return key in self.objects

    def put(self, key: str, data: bytes, **_: object) -> str:
        self.objects[key] = data
        return key

    def get(self, key: str) -> bytes:
        return b"corrupt" if self.corrupt_readback else self.objects[key]

    def delete(self, key: str) -> None:
        self.deleted.append(key)
        self.objects.pop(key, None)

    def close(self) -> None:
        self.close_calls += 1


class PreviewSourcePromotionTest(unittest.TestCase):
    key = "jingci-preview/source/recovered-runway.mp4"
    media = b"reviewed recovered Runway media"
    digest = hashlib.sha256(media).hexdigest()
    config = B2Config("bucket", "us-east-005", "key-id", "app-key")

    def test_success_retains_exact_verified_source(self) -> None:
        backend = PromotionBackend()
        result = promote_preview_source(
            self.config,
            source_key=self.key,
            media=self.media,
            expected_sha256=self.digest,
            backend_factory=lambda _: backend,
        )
        self.assertTrue(result.retained)
        self.assertEqual(result.source_sha256, self.digest)
        self.assertEqual(backend.objects, {self.key: self.media})
        self.assertEqual(backend.deleted, [])

    def test_existing_key_is_never_overwritten(self) -> None:
        backend = PromotionBackend()
        backend.objects[self.key] = b"existing"
        with self.assertRaisesRegex(PermissionError, "refuses overwrite"):
            promote_preview_source(
                self.config,
                source_key=self.key,
                media=self.media,
                expected_sha256=self.digest,
                backend_factory=lambda _: backend,
            )
        self.assertEqual(backend.objects[self.key], b"existing")
        self.assertEqual(backend.deleted, [])

    def test_corrupt_readback_deletes_only_new_source(self) -> None:
        backend = PromotionBackend(corrupt_readback=True)
        with self.assertRaisesRegex(RuntimeError, "read-back"):
            promote_preview_source(
                self.config,
                source_key=self.key,
                media=self.media,
                expected_sha256=self.digest,
                backend_factory=lambda _: backend,
            )
        self.assertEqual(backend.objects, {})
        self.assertEqual(backend.deleted, [self.key])

    def test_invalid_key_or_digest_fails_before_backend_creation(self) -> None:
        called = False
        def factory(_: B2Config) -> PromotionBackend:
            nonlocal called
            called = True
            return PromotionBackend()
        for key, digest in (("other/source.mp4", self.digest), (self.key, "0" * 64)):
            with self.subTest(key=key), self.assertRaises(ValueError):
                promote_preview_source(
                    self.config,
                    source_key=key,
                    media=self.media,
                    expected_sha256=digest,
                    backend_factory=factory,
                )
        self.assertFalse(called)

    def test_plan_has_no_live_entrypoint_or_network(self) -> None:
        self.assertFalse(build_plan()["network"])
        self.assertFalse(build_plan()["live_entrypoint"])
        stdout = io.StringIO()
        with redirect_stdout(stdout):
            self.assertEqual(main(["--plan"]), 0)
        self.assertFalse(json.loads(stdout.getvalue())["prints_credentials"])


if __name__ == "__main__":
    unittest.main()
