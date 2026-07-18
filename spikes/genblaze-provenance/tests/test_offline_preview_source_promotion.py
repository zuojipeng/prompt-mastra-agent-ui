from __future__ import annotations

import hashlib
import json
import tempfile
import unittest
from datetime import datetime, timezone
from pathlib import Path

from jingci_spike.approval_journal import DurableApprovalJournal
from jingci_spike.b2_config import B2Config
from jingci_spike.offline_preview_source_promotion import (
    OfflinePromotionBackend,
    OfflineSourcePromotionError,
    recover_interrupted_offline_promotion,
    run_offline_source_promotion,
)
from jingci_spike.preview_source_promotion_contract import (
    APPROVAL_SCHEMA,
    APPROVAL_SCOPE,
    CAMPAIGN_ID,
    CONFIRMATION,
    parse_source_promotion_approval,
)


NOW = datetime(2026, 7, 18, 9, 0, 0, tzinfo=timezone.utc)
COMMIT = "a" * 40
KEY = "jingci-preview/source/recovered-runway.mp4"
MEDIA = b"reviewed source"
DIGEST = hashlib.sha256(MEDIA).hexdigest()
CONFIG = B2Config("fixture", "us-east-005", "fixture-key", "fixture-secret")


def approval_bytes() -> bytes:
    value = {
        "schema_version": APPROVAL_SCHEMA,
        "approval_id": "source-approval-001",
        "run_id": "source-run-001",
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
    }
    return (json.dumps(value, indent=2, separators=(",", ": ")) + "\n").encode("ascii")


class OfflinePreviewSourcePromotionTest(unittest.TestCase):
    def setup_run(self, root: str, backend: OfflinePromotionBackend, **changes: object):
        journal_dir = Path(root) / "journal"
        journal_dir.mkdir(mode=0o700)
        result_dir = Path(root) / "results"
        result_dir.mkdir(mode=0o700)
        journal = DurableApprovalJournal(journal_dir, campaign_id=CAMPAIGN_ID, clock=lambda: NOW)
        arguments = {
            "approval_bytes": approval_bytes(),
            "run_id": "source-run-001",
            "commit": COMMIT,
            "source_clean": True,
            "source_key": KEY,
            "media": MEDIA,
            "expected_sha256": DIGEST,
            "config": CONFIG,
            "backend": backend,
            "approval_journal": journal,
            "result_path": result_dir / "result.json",
            "clock": lambda: NOW,
        }
        arguments.update(changes)
        return journal, arguments

    def test_success_consumes_once_retains_source_and_writes_non_attestable_result(self) -> None:
        with tempfile.TemporaryDirectory(dir="/private/tmp") as root:
            backend = OfflinePromotionBackend()
            journal, arguments = self.setup_run(root, backend)
            record = run_offline_source_promotion(**arguments)
            self.assertEqual(record["status"], "passed")
            self.assertEqual(record["evidence_mode"], "fixture_non_attestable")
            self.assertEqual(record["storage"]["backend"], "memory_fixture")
            self.assertEqual(backend.objects, {KEY: MEDIA})
            with self.assertRaisesRegex(PermissionError, "already consumed"):
                journal.consume(
                    parse_source_promotion_approval(
                        approval_bytes(),
                        expected_run_id="source-run-001",
                        expected_commit=COMMIT,
                        expected_source_key=KEY,
                        expected_source_sha256=DIGEST,
                        expected_source_size_bytes=len(MEDIA),
                        at=NOW,
                    ),
                    NOW,
                )

    def test_invalid_preflight_does_not_consume_approval(self) -> None:
        with tempfile.TemporaryDirectory(dir="/private/tmp") as root:
            backend = OfflinePromotionBackend()
            journal, arguments = self.setup_run(root, backend, source_clean=False)
            with self.assertRaisesRegex(PermissionError, "clean pinned"):
                run_offline_source_promotion(**arguments)
            with self.assertRaisesRegex(Exception, "does not exist"):
                journal.read_marker("source-approval-001")

    def test_existing_source_does_not_consume_approval(self) -> None:
        with tempfile.TemporaryDirectory(dir="/private/tmp") as root:
            backend = OfflinePromotionBackend()
            backend.objects[KEY] = b"existing"
            journal, arguments = self.setup_run(root, backend)
            with self.assertRaisesRegex(PermissionError, "existing source"):
                run_offline_source_promotion(**arguments)
            with self.assertRaisesRegex(Exception, "does not exist"):
                journal.read_marker("source-approval-001")

    def test_wrong_campaign_journal_does_not_consume_approval(self) -> None:
        with tempfile.TemporaryDirectory(dir="/private/tmp") as root:
            backend = OfflinePromotionBackend()
            _, arguments = self.setup_run(root, backend)
            wrong_directory = Path(root) / "wrong-journal"
            wrong_directory.mkdir(mode=0o700)
            wrong = DurableApprovalJournal(
                wrong_directory, campaign_id="another-campaign", clock=lambda: NOW
            )
            arguments["approval_journal"] = wrong
            with self.assertRaisesRegex(PermissionError, "campaign approval journal"):
                run_offline_source_promotion(**arguments)
            with self.assertRaisesRegex(Exception, "does not exist"):
                wrong.read_marker("source-approval-001")

    def test_corrupt_readback_writes_compensated_failure(self) -> None:
        with tempfile.TemporaryDirectory(dir="/private/tmp") as root:
            backend = OfflinePromotionBackend(corrupt_readback=True)
            _, arguments = self.setup_run(root, backend)
            with self.assertRaises(OfflineSourcePromotionError):
                run_offline_source_promotion(**arguments)
            record = json.loads(arguments["result_path"].read_text())
            self.assertEqual(record["status"], "failed_compensated")
            self.assertEqual(backend.objects, {})

    def test_failed_cleanup_writes_recovery_required(self) -> None:
        with tempfile.TemporaryDirectory(dir="/private/tmp") as root:
            backend = OfflinePromotionBackend(corrupt_readback=True, fail_delete=True)
            _, arguments = self.setup_run(root, backend)
            with self.assertRaises(OfflineSourcePromotionError):
                run_offline_source_promotion(**arguments)
            record = json.loads(arguments["result_path"].read_text())
            self.assertEqual(record["status"], "recovery_required")
            self.assertIn(KEY, backend.objects)

    def test_non_fixture_backend_is_rejected_before_consumption(self) -> None:
        class SubclassedBackend(OfflinePromotionBackend):
            pass

        with tempfile.TemporaryDirectory(dir="/private/tmp") as root:
            backend = SubclassedBackend()
            journal, arguments = self.setup_run(root, backend)
            with self.assertRaisesRegex(PermissionError, "exact memory"):
                run_offline_source_promotion(**arguments)
            with self.assertRaisesRegex(Exception, "does not exist"):
                journal.read_marker("source-approval-001")

    def test_interrupted_terminal_write_can_be_recovered_conservatively(self) -> None:
        with tempfile.TemporaryDirectory(dir="/private/tmp") as root:
            backend = OfflinePromotionBackend()
            journal, arguments = self.setup_run(
                root,
                backend,
                result_writer=lambda *_args, **_kwargs: (_ for _ in ()).throw(OSError("disk")),
            )
            with self.assertRaisesRegex(OSError, "disk"):
                run_offline_source_promotion(**arguments)
            approval = parse_source_promotion_approval(
                approval_bytes(),
                expected_run_id="source-run-001",
                expected_commit=COMMIT,
                expected_source_key=KEY,
                expected_source_sha256=DIGEST,
                expected_source_size_bytes=len(MEDIA),
                at=NOW,
            )
            recovered = recover_interrupted_offline_promotion(
                approval=approval,
                approval_journal=journal,
                backend=backend,
                result_path=Path(root) / "results" / "recovered.json",
                recorded_at=NOW,
            )
            self.assertEqual(recovered["status"], "recovery_required")
            self.assertEqual(recovered["failure"]["code"], "terminal_write_interrupted")


if __name__ == "__main__":
    unittest.main()
