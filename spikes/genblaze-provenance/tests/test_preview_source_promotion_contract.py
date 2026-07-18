from __future__ import annotations

import hashlib
import json
import stat
import tempfile
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path

from jingci_spike.approval_journal import DurableApprovalJournal
from jingci_spike.preview_source_promotion import SourcePromotionResult
from jingci_spike.preview_source_promotion_contract import (
    APPROVAL_SCHEMA,
    APPROVAL_SCOPE,
    CAMPAIGN_ID,
    CONFIRMATION,
    build_private_result,
    parse_source_promotion_approval,
    write_private_result,
)


NOW = datetime(2026, 7, 18, 9, 0, 0, tzinfo=timezone.utc)
COMMIT = "a" * 40
KEY = "jingci-preview/source/recovered-runway.mp4"
MEDIA = b"reviewed source"
DIGEST = hashlib.sha256(MEDIA).hexdigest()


def canonical(value: dict[str, object]) -> bytes:
    return (json.dumps(value, indent=2, separators=(",", ": "), ensure_ascii=True) + "\n").encode(
        "ascii"
    )


def approval_bytes(**changes: object) -> bytes:
    value: dict[str, object] = {
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
        "bucket": "fixture-bucket",
        "region": "us-east-005",
    }
    value.update(changes)
    return canonical(value)


class PreviewSourcePromotionContractTest(unittest.TestCase):
    def parse(self, raw: bytes | None = None):
        return parse_source_promotion_approval(
            raw or approval_bytes(),
            expected_run_id="source-run-001",
            expected_commit=COMMIT,
            expected_source_key=KEY,
            expected_source_sha256=DIGEST,
            expected_source_size_bytes=len(MEDIA),
            expected_bucket="fixture-bucket",
            expected_region="us-east-005",
            at=NOW,
        )

    def test_approval_binds_exact_operation_source_commit_and_time(self) -> None:
        approval = self.parse()
        self.assertEqual(approval.source_key, KEY)
        for changes, message in (
            ({"scope": "runway_one_attempt_spend"}, "authority"),
            ({"commit": "b" * 40}, "run and commit"),
            ({"source_sha256": "0" * 64}, "reviewed source"),
            ({"bucket": "another-bucket"}, "target storage"),
            ({"maximum_attempts": 2}, "exactly one"),
        ):
            with self.subTest(changes=changes), self.assertRaisesRegex(PermissionError, message):
                self.parse(approval_bytes(**changes))
        with self.assertRaisesRegex(PermissionError, "not active"):
            parse_source_promotion_approval(
                approval_bytes(),
                expected_run_id="source-run-001",
                expected_commit=COMMIT,
                expected_source_key=KEY,
                expected_source_sha256=DIGEST,
                expected_source_size_bytes=len(MEDIA),
                expected_bucket="fixture-bucket",
                expected_region="us-east-005",
                at=NOW + timedelta(hours=1),
            )

    def test_existing_durable_journal_enforces_at_most_once(self) -> None:
        approval = self.parse()
        with tempfile.TemporaryDirectory(dir="/private/tmp") as root:
            directory = Path(root) / "journal"
            directory.mkdir(mode=0o700)
            journal = DurableApprovalJournal(directory, campaign_id=CAMPAIGN_ID, clock=lambda: NOW)
            journal.consume(approval, NOW)
            with self.assertRaisesRegex(PermissionError, "already consumed"):
                journal.consume(approval, NOW)

    def marker(self, approval) -> dict[str, object]:
        return {
            "schema_version": "jingci.local-approval-consumption.v1",
            "campaign_id": CAMPAIGN_ID,
            "approval_id": approval.approval_id,
            "approval_document_sha256": approval.document_sha256,
            "run_id": approval.run_id,
            "commit": approval.commit,
            "consumed_at": "2026-07-18T09:00:00Z",
        }

    def test_success_record_is_source_bound_and_grants_no_adjacent_authority(self) -> None:
        approval = self.parse()
        outcome = SourcePromotionResult(
            schema_version="jingci.preview-source-promotion-result.v1",
            status="passed",
            source_key=KEY,
            source_sha256=DIGEST,
            source_size_bytes=len(MEDIA),
            retained=True,
        )
        record = build_private_result(
            approval=approval,
            approval_marker=self.marker(approval),
            recorded_at=NOW,
            outcome=outcome,
        )
        self.assertEqual(record["status"], "passed")
        self.assertFalse(any(record["authorizations"].values()))
        self.assertFalse(record["recovery_required"])

    def test_failure_contract_distinguishes_compensation_and_recovery(self) -> None:
        approval = self.parse()
        compensated = build_private_result(
            approval=approval,
            approval_marker=self.marker(approval),
            recorded_at=NOW,
            outcome=None,
            failure_phase="storage",
            failure_code="readback_failed",
            cleanup_confirmed=True,
        )
        uncertain = build_private_result(
            approval=approval,
            approval_marker=self.marker(approval),
            recorded_at=NOW,
            outcome=None,
            failure_phase="storage",
            failure_code="cleanup_unconfirmed",
            cleanup_confirmed=False,
        )
        self.assertEqual(compensated["status"], "failed_compensated")
        self.assertFalse(compensated["recovery_required"])
        self.assertEqual(uncertain["status"], "recovery_required")
        self.assertTrue(uncertain["recovery_required"])

    def test_private_result_is_owner_only_immutable_and_rejects_secret_material(self) -> None:
        approval = self.parse()
        record = build_private_result(
            approval=approval,
            approval_marker=self.marker(approval),
            recorded_at=NOW,
            outcome=None,
            failure_phase="storage",
            failure_code="cleanup_unconfirmed",
            cleanup_confirmed=False,
        )
        with tempfile.TemporaryDirectory(dir="/private/tmp") as root:
            journal_directory = Path(root) / "journal"
            journal_directory.mkdir(mode=0o700)
            journal = DurableApprovalJournal(
                journal_directory, campaign_id=CAMPAIGN_ID, clock=lambda: NOW
            )
            journal.consume(approval, NOW)
            record = build_private_result(
                approval=approval,
                approval_marker=journal.read_marker(approval.approval_id),
                recorded_at=NOW,
                outcome=None,
                failure_phase="storage",
                failure_code="cleanup_unconfirmed",
                cleanup_confirmed=False,
            )
            directory = Path(root) / "private"
            directory.mkdir(mode=0o700)
            output = directory / "result.json"
            write_private_result(output, record, approval_journal=journal)
            self.assertEqual(stat.S_IMODE(output.stat().st_mode), 0o600)
            with self.assertRaises(FileExistsError):
                write_private_result(output, record, approval_journal=journal)
            poisoned = dict(record)
            poisoned["failure"] = {"phase": "storage", "code": "https://secret.example"}
            with self.assertRaisesRegex(ValueError, "state"):
                write_private_result(
                    directory / "poisoned.json", poisoned, approval_journal=journal
                )
            widened = dict(record)
            widened["authorizations"] = dict(record["authorizations"], deployment=True)
            with self.assertRaisesRegex(ValueError, "integrity"):
                write_private_result(
                    directory / "widened.json", widened, approval_journal=journal
                )
            forged = dict(record)
            forged["approval"] = dict(record["approval"], marker_sha256="0" * 64)
            with self.assertRaisesRegex(ValueError, "durable marker"):
                write_private_result(directory / "forged.json", forged, approval_journal=journal)
            reversed_time = dict(record, recorded_at="2026-07-18T08:59:59Z")
            with self.assertRaisesRegex(ValueError, "precedes"):
                write_private_result(
                    directory / "time-reversed.json", reversed_time, approval_journal=journal
                )


if __name__ == "__main__":
    unittest.main()
