from __future__ import annotations

import hashlib
import inspect
import json
import os
import tempfile
import unittest
from datetime import datetime, timezone
from pathlib import Path

import jingci_spike.guarded_preview_source_live_adapter as adapter_module

from jingci_spike.approval_journal import DurableApprovalJournal
from jingci_spike.b2_config import B2Config, build_live_backblaze_backend
from jingci_spike.b2_credential_scope_attestation import (
    ALLOWED_CAPABILITIES,
    ATTESTATION_SCHEMA,
    AUTHORITY,
    SOURCE_PREFIX,
)
from jingci_spike.guarded_preview_source_live_adapter import (
    GuardedSourcePromotionError,
    _evidence_mode,
    run_guarded_source_promotion,
)
from jingci_spike.offline_preview_source_promotion import OfflinePromotionBackend
from jingci_spike.preview_source_promotion_contract import (
    APPROVAL_SCHEMA,
    APPROVAL_SCOPE,
    CAMPAIGN_ID,
    CONFIRMATION,
)


NOW = datetime(2026, 7, 18, 9, 0, 0, tzinfo=timezone.utc)
COMMIT = "a" * 40
RUN_ID = "source-run-001"
KEY = "jingci-preview/source/recovered-runway.mp4"
MEDIA = b"reviewed source"
DIGEST = hashlib.sha256(MEDIA).hexdigest()
BUCKET = "fixture-bucket"
REGION = "us-east-005"
KEY_ID = "fixture-key"


def approval_bytes(**changes: object) -> bytes:
    value = {
        "schema_version": APPROVAL_SCHEMA,
        "approval_id": "source-approval-001",
        "run_id": RUN_ID,
        "commit": COMMIT,
        "human_actor": "Human Owner",
        "approved_at": "2026-07-18T08:55:00Z",
        "expires_at": "2026-07-18T09:30:00Z",
        "maximum_attempts": 1,
        "confirmation": CONFIRMATION,
        "scope": APPROVAL_SCOPE,
        "source_key": KEY,
        "source_sha256": DIGEST,
        "source_size_bytes": len(MEDIA),
        "bucket": BUCKET,
        "region": REGION,
    }
    value.update(changes)
    return (json.dumps(value, indent=2, separators=(",", ": ")) + "\n").encode("ascii")


def scope_attestation_bytes(**changes: object) -> bytes:
    value = {
        "schema_version": ATTESTATION_SCHEMA,
        "campaign_id": CAMPAIGN_ID,
        "review_id": "scope-review-001",
        "reviewer": "Security Reviewer",
        "inspected_at": "2026-07-18T08:50:00Z",
        "expires_at": "2026-07-18T09:30:00Z",
        "inspection_method": "b2_authorize_account_allowed",
        "bucket": BUCKET,
        "region": REGION,
        "name_prefix": SOURCE_PREFIX,
        "capabilities": sorted(ALLOWED_CAPABILITIES),
        "key_id_sha256": hashlib.sha256(KEY_ID.encode()).hexdigest(),
        "secret_value_recorded": False,
        "authority": AUTHORITY,
        "execution_authorized": False,
    }
    value.update(changes)
    return (json.dumps(value, indent=2, separators=(",", ": ")) + "\n").encode("ascii")


class GuardedPreviewSourceLiveAdapterTest(unittest.TestCase):
    def test_module_has_no_cli_or_process_environment_read(self) -> None:
        source = inspect.getsource(adapter_module)
        self.assertNotIn("def main(", source)
        self.assertNotIn("os.environ", source)
        self.assertEqual(_evidence_mode(build_live_backblaze_backend), "live_private")
        self.assertEqual(_evidence_mode(lambda _: None), "fixture_non_attestable")

    def setup_run(self, root: str, *, backend: OfflinePromotionBackend | None = None):
        private = Path(root) / "private"
        private.mkdir(mode=0o700)
        approval_path = private / "approval.json"
        approval_path.write_bytes(approval_bytes())
        os.chmod(approval_path, 0o600)
        scope_path = private / "credential-scope.json"
        scope_path.write_bytes(scope_attestation_bytes())
        os.chmod(scope_path, 0o600)
        media_path = private / "source.mp4"
        media_path.write_bytes(MEDIA)
        os.chmod(media_path, 0o600)
        journal_path = private / "journal"
        journal_path.mkdir(mode=0o700)
        journal = DurableApprovalJournal(journal_path, campaign_id=CAMPAIGN_ID, clock=lambda: NOW)
        selected_backend = backend or OfflinePromotionBackend()
        calls: list[str] = []

        def config_loader() -> B2Config:
            calls.append("config")
            return B2Config(BUCKET, REGION, KEY_ID, "fixture-secret")

        def backend_factory(_: B2Config) -> OfflinePromotionBackend:
            calls.append("backend")
            return selected_backend

        arguments = {
            "run_id": RUN_ID,
            "commit": COMMIT,
            "source_clean": True,
            "source_key": KEY,
            "expected_bucket": BUCKET,
            "expected_region": REGION,
            "approval_path": approval_path,
            "credential_scope_attestation_path": scope_path,
            "source_media_path": media_path,
            "result_path": private / "result.json",
            "approval_journal": journal,
            "config_loader": config_loader,
            "backend_factory": backend_factory,
            "clock": lambda: NOW,
        }
        return journal, selected_backend, calls, arguments

    def test_injected_success_retains_source_but_stays_non_attestable(self) -> None:
        with tempfile.TemporaryDirectory(dir="/private/tmp") as root:
            journal, backend, calls, arguments = self.setup_run(root)
            result = run_guarded_source_promotion(**arguments)
            self.assertEqual(result["status"], "passed")
            self.assertEqual(result["evidence_mode"], "fixture_non_attestable")
            self.assertEqual(result["storage"]["backend"], "memory_fixture")
            self.assertEqual(result["credential_scope"]["review_id"], "scope-review-001")
            self.assertEqual(len(result["credential_scope"]["document_sha256"]), 64)
            self.assertEqual(backend.objects, {KEY: MEDIA})
            self.assertEqual(calls, ["config", "backend"])
            self.assertEqual(journal.read_marker("source-approval-001")["commit"], COMMIT)

    def test_invalid_private_media_fails_before_config_or_consumption(self) -> None:
        with tempfile.TemporaryDirectory(dir="/private/tmp") as root:
            journal, _, calls, arguments = self.setup_run(root)
            os.chmod(arguments["source_media_path"], 0o644)
            with self.assertRaises(PermissionError):
                run_guarded_source_promotion(**arguments)
            self.assertEqual(calls, [])
            with self.assertRaisesRegex(Exception, "does not exist"):
                journal.read_marker("source-approval-001")

    def test_target_mismatch_fails_before_config_or_consumption(self) -> None:
        with tempfile.TemporaryDirectory(dir="/private/tmp") as root:
            journal, _, calls, arguments = self.setup_run(root)
            arguments["expected_bucket"] = "another-bucket"
            with self.assertRaisesRegex(PermissionError, "target storage"):
                run_guarded_source_promotion(**arguments)
            self.assertEqual(calls, [])
            with self.assertRaisesRegex(Exception, "does not exist"):
                journal.read_marker("source-approval-001")

    def test_config_mismatch_fails_before_backend_or_consumption(self) -> None:
        with tempfile.TemporaryDirectory(dir="/private/tmp") as root:
            journal, _, calls, arguments = self.setup_run(root)

            def wrong_config() -> B2Config:
                calls.append("config")
                return B2Config("another-bucket", REGION, "key", "secret")

            arguments["config_loader"] = wrong_config
            with self.assertRaisesRegex(GuardedSourcePromotionError, "configuration preflight"):
                run_guarded_source_promotion(**arguments)
            self.assertEqual(calls, ["config"])
            with self.assertRaisesRegex(Exception, "does not exist"):
                journal.read_marker("source-approval-001")

    def test_scope_attestation_mismatch_fails_before_backend_or_consumption(self) -> None:
        with tempfile.TemporaryDirectory(dir="/private/tmp") as root:
            journal, _, calls, arguments = self.setup_run(root)
            path = arguments["credential_scope_attestation_path"]
            path.write_bytes(scope_attestation_bytes(name_prefix=""))
            os.chmod(path, 0o600)
            with self.assertRaisesRegex(GuardedSourcePromotionError, "configuration preflight"):
                run_guarded_source_promotion(**arguments)
            self.assertEqual(calls, ["config"])
            with self.assertRaisesRegex(Exception, "does not exist"):
                journal.read_marker("source-approval-001")

    def test_existing_key_closes_backend_without_consuming(self) -> None:
        with tempfile.TemporaryDirectory(dir="/private/tmp") as root:
            backend = OfflinePromotionBackend()
            backend.objects[KEY] = b"existing"
            journal, backend, _, arguments = self.setup_run(root, backend=backend)
            with self.assertRaisesRegex(PermissionError, "already exists"):
                run_guarded_source_promotion(**arguments)
            self.assertTrue(backend.closed)
            with self.assertRaisesRegex(Exception, "does not exist"):
                journal.read_marker("source-approval-001")

    def test_backend_preflight_error_is_stable_and_does_not_consume(self) -> None:
        with tempfile.TemporaryDirectory(dir="/private/tmp") as root:
            journal, _, _, arguments = self.setup_run(root)

            def broken_backend(_: B2Config):
                raise RuntimeError("https://signed.example?token=private")

            arguments["backend_factory"] = broken_backend
            with self.assertRaisesRegex(GuardedSourcePromotionError, "storage preflight") as caught:
                run_guarded_source_promotion(**arguments)
            self.assertNotIn("signed", str(caught.exception))
            with self.assertRaisesRegex(Exception, "does not exist"):
                journal.read_marker("source-approval-001")

    def test_post_consumption_failure_is_conservative_and_never_retries(self) -> None:
        with tempfile.TemporaryDirectory(dir="/private/tmp") as root:
            backend = OfflinePromotionBackend(corrupt_readback=True)
            journal, backend, calls, arguments = self.setup_run(root, backend=backend)
            with self.assertRaises(GuardedSourcePromotionError):
                run_guarded_source_promotion(**arguments)
            record = json.loads(arguments["result_path"].read_text())
            self.assertEqual(record["status"], "recovery_required")
            self.assertEqual(record["evidence_mode"], "fixture_non_attestable")
            self.assertEqual(record["failure"]["code"], "live_storage_failed")
            self.assertEqual(calls, ["config", "backend"])
            self.assertIsNotNone(journal.read_marker("source-approval-001"))

    def test_terminal_write_failure_leaves_consumed_marker_for_recovery(self) -> None:
        with tempfile.TemporaryDirectory(dir="/private/tmp") as root:
            journal, backend, _, arguments = self.setup_run(root)
            arguments["result_writer"] = lambda *_args, **_kwargs: (_ for _ in ()).throw(
                OSError("disk")
            )
            with self.assertRaisesRegex(GuardedSourcePromotionError, "terminal evidence write"):
                run_guarded_source_promotion(**arguments)
            self.assertEqual(backend.objects, {KEY: MEDIA})
            self.assertIsNotNone(journal.read_marker("source-approval-001"))


if __name__ == "__main__":
    unittest.main()
