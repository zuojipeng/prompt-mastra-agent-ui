from __future__ import annotations

import hashlib
import tempfile
import unittest
from datetime import datetime, timezone
from pathlib import Path

from jingci_spike.approval_journal import DurableApprovalJournal
from jingci_spike.live_runway_b2_transaction import LiveApproval
from jingci_spike.transaction_failure_evidence import (
    EVIDENCE_MODE,
    FAILURE_SCHEMA,
    RECOVERY_SCHEMA,
    build_failure_record,
    build_interrupted_failure_record,
    build_recovery_record,
    canonical_evidence_bytes,
    write_private_evidence,
)


NOW = datetime(2026, 7, 15, 0, 1, 0, tzinfo=timezone.utc)
PREFIX = "jingci-smoke/20260715T000000Z/" + "1" * 32
ASSET_KEY = PREFIX + "/assets/" + "a" * 64 + ".mp4"
MANIFEST_KEY = PREFIX + "/manifests/" + "b" * 64 + ".json"


def failure(**changes: object) -> dict[str, object]:
    options = {
        "run_id": "run-001",
        "commit": "c" * 40,
        "approval_id": "approval-001",
        "approval_document_sha256": "d" * 64,
        "approval_consumed": True,
        "approval_consumed_at": datetime(2026, 7, 15, 0, 0, 0, tzinfo=timezone.utc),
        "campaign_id": "backblaze-genmedia-2026",
        "approval_marker_sha256": "e" * 64,
        "phase": "cleanup",
        "code": "cleanup_failed",
        "create_disposition": "completed",
        "provider_task_id": "task-001",
        "occurred_at": NOW,
        "owned_prefix": PREFIX,
        "owned_keys": [ASSET_KEY, MANIFEST_KEY],
        "deleted_keys": [ASSET_KEY],
        "residual_keys": [MANIFEST_KEY],
        "backend_closed": True,
        "local_media_removed": True,
    }
    options.update(changes)
    return build_failure_record(**options)


class TransactionFailureEvidenceTest(unittest.TestCase):
    def test_failure_is_stable_non_attestable_and_conservative(self) -> None:
        record = failure()
        encoded = canonical_evidence_bytes(record)

        self.assertEqual(record["schema_version"], FAILURE_SCHEMA)
        self.assertEqual(record["evidence_mode"], EVIDENCE_MODE)
        self.assertEqual(record["status"], "failed")
        self.assertEqual(record["provider"]["create_disposition"], "completed")
        self.assertEqual(record["provider"]["task_id"], "task-001")
        self.assertTrue(record["recovery_required"])
        self.assertEqual(record["cleanup"]["status"], "incomplete")
        self.assertNotIn(b"https://", encoded)
        self.assertNotIn(b"token=", encoded)

    def test_preapproval_failure_cannot_claim_provider_activity(self) -> None:
        record = failure(
            approval_consumed=False,
            approval_consumed_at=None,
            approval_marker_sha256=None,
            phase="approval",
            code="approval_consumption_failed",
            create_disposition="not_attempted",
            provider_task_id=None,
            deleted_keys=[],
            residual_keys=[],
            owned_keys=[],
            backend_closed=False,
            local_media_removed=False,
        )
        self.assertEqual(record["provider"]["create_disposition"], "not_attempted")
        with self.assertRaises(ValueError):
            failure(approval_consumed=False, phase="provider_create", code="provider_create_failed")

    def test_keys_and_cleanup_claims_fail_closed(self) -> None:
        with self.assertRaises(ValueError):
            failure(residual_keys=["outside/prefix/object"])
        with self.assertRaises(ValueError):
            failure(deleted_keys=[ASSET_KEY], residual_keys=[ASSET_KEY])
        with self.assertRaises(ValueError):
            failure(backend_closed="yes")
        with self.assertRaises(ValueError):
            failure(phase="approval", code="cleanup_failed")
        with self.assertRaises(ValueError):
            failure(create_disposition="task_id_observed", provider_task_id=None)
        with self.assertRaises(ValueError):
            failure(
                phase="provider_create",
                code="provider_create_failed",
                create_disposition="attempted_unknown",
                provider_task_id=None,
                cancellation_disposition="confirmed",
            )

    def test_known_task_and_cancellation_state_are_preserved(self) -> None:
        record = failure(
            phase="provider_poll",
            code="provider_poll_failed",
            create_disposition="task_id_observed",
            provider_task_id="task-001",
            cancellation_disposition="confirmed",
            owned_keys=[],
            deleted_keys=[],
            residual_keys=[],
            absence_confirmed_keys=[],
            backend_closed=False,
            local_media_removed=True,
        )
        self.assertEqual(record["provider"], {
            "create_disposition": "task_id_observed",
            "task_id": "task-001",
            "cancellation_disposition": "confirmed",
        })

    def test_ambiguous_create_requires_recovery_even_without_storage_keys(self) -> None:
        record = failure(
            phase="provider_create",
            code="provider_create_failed",
            create_disposition="attempted_unknown",
            provider_task_id=None,
            cancellation_disposition="not_attempted",
            owned_keys=[],
            deleted_keys=[],
            residual_keys=[],
            absence_confirmed_keys=[],
            backend_closed=True,
            local_media_removed=True,
        )
        self.assertEqual(record["cleanup"]["status"], "complete")
        self.assertTrue(record["provider_recovery_required"])
        self.assertTrue(record["recovery_required"])
        recovery = build_recovery_record(
            record,
            recorded_at=NOW,
            deleted_keys=[],
            residual_keys=[],
            absence_confirmed_keys=[],
            backend_closed=True,
            local_media_removed=True,
        )
        self.assertEqual(recovery["status"], "recovery_incomplete")

    def test_recovery_references_failure_but_never_becomes_attestable(self) -> None:
        source = failure()
        incomplete = build_recovery_record(
            source,
            recorded_at=NOW,
            deleted_keys=[ASSET_KEY],
            residual_keys=[MANIFEST_KEY],
            absence_confirmed_keys=[ASSET_KEY],
            backend_closed=True,
            local_media_removed=True,
        )
        complete = build_recovery_record(
            source,
            recorded_at=NOW,
            deleted_keys=[ASSET_KEY, MANIFEST_KEY],
            residual_keys=[],
            absence_confirmed_keys=[ASSET_KEY, MANIFEST_KEY],
            backend_closed=True,
            local_media_removed=True,
        )

        self.assertEqual(incomplete["status"], "recovery_incomplete")
        self.assertEqual(complete["status"], "recovered")
        self.assertEqual(complete["evidence_mode"], EVIDENCE_MODE)
        self.assertEqual(complete["schema_version"], RECOVERY_SCHEMA)
        self.assertEqual(
            complete["failure_record_sha256"], hashlib.sha256(canonical_evidence_bytes(source)).hexdigest()
        )

    def test_consumed_marker_without_terminal_result_becomes_interrupted_unknown(self) -> None:
        marker = {
            "schema_version": "jingci.local-approval-consumption.v1",
            "campaign_id": "backblaze-genmedia-2026",
            "approval_id": "approval-001",
            "approval_document_sha256": "d" * 64,
            "run_id": "run-001",
            "commit": "c" * 40,
            "consumed_at": "2026-07-15T00:00:00Z",
        }
        record = build_interrupted_failure_record(
            marker, occurred_at=NOW, owned_prefix=PREFIX, owned_keys=[ASSET_KEY, MANIFEST_KEY]
        )

        self.assertEqual(record["failure"], {
            "phase": "interrupted",
            "code": "execution_interrupted",
            "occurred_at": "2026-07-15T00:01:00Z",
        })
        self.assertEqual(record["provider"]["create_disposition"], "attempted_unknown")
        self.assertEqual(record["cleanup"]["residual_keys"], sorted([ASSET_KEY, MANIFEST_KEY]))
        self.assertTrue(record["recovery_required"])

    def test_writer_is_immutable_owner_only_and_rejects_tampering(self) -> None:
        with tempfile.TemporaryDirectory(prefix="jingci-failure-evidence-") as directory:
            root = Path(directory).resolve()
            approvals = root / "approvals"
            candidate = LiveApproval(
                approval_id="approval-001",
                run_id="run-001",
                commit="c" * 40,
                human_actor="human-owner",
                approved_at=NOW.replace(minute=0),
                expires_at=NOW.replace(minute=10),
                maximum_attempts=1,
                maximum_estimated_cost_usd=0.6,
                document_sha256="d" * 64,
            )
            journal = DurableApprovalJournal(
                approvals, campaign_id="backblaze-genmedia-2026", clock=lambda: NOW
            )
            journal.consume(candidate, NOW.replace(minute=0))
            source = build_interrupted_failure_record(
                journal.read_marker(candidate.approval_id),
                occurred_at=NOW,
                owned_prefix=PREFIX,
                owned_keys=[ASSET_KEY, MANIFEST_KEY],
            )
            private = root / "private"
            output = private / "failure-001.json"
            with self.assertRaisesRegex(ValueError, "requires its approval marker"):
                write_private_evidence(output, source)
            wrong_journal = DurableApprovalJournal(
                approvals, campaign_id="another-campaign", clock=lambda: NOW
            )
            with self.assertRaisesRegex(ValueError, "wrong approval journal"):
                write_private_evidence(
                    private / "wrong-journal-failure.json",
                    source,
                    approval_journal=wrong_journal,
                )
            write_private_evidence(output, source, approval_journal=journal)
            self.assertEqual(private.stat().st_mode & 0o777, 0o700)
            self.assertEqual(output.stat().st_mode & 0o777, 0o600)
            self.assertEqual(output.stat().st_nlink, 1)
            self.assertEqual(output.read_bytes(), canonical_evidence_bytes(source))
            self.assertEqual(list(private.glob("*.tmp")), [])
            with self.assertRaises(FileExistsError):
                write_private_evidence(output, source, approval_journal=journal)

            recovery = build_recovery_record(
                source,
                recorded_at=NOW,
                deleted_keys=[ASSET_KEY, MANIFEST_KEY],
                residual_keys=[],
                absence_confirmed_keys=[ASSET_KEY, MANIFEST_KEY],
                backend_closed=True,
                local_media_removed=True,
            )
            recovery_path = private / "recovery-001.json"
            with self.assertRaisesRegex(ValueError, "requires its immutable failure"):
                write_private_evidence(recovery_path, recovery)
            write_private_evidence(recovery_path, recovery, failure_path=output)
            orphan = dict(recovery)
            orphan["failure_record_sha256"] = "f" * 64
            with self.assertRaises(ValueError):
                write_private_evidence(private / "orphan.json", orphan, failure_path=output)
            impossible_time = dict(recovery)
            impossible_time["recorded_at"] = "2026-07-14T23:59:00Z"
            with self.assertRaisesRegex(ValueError, "cannot precede"):
                write_private_evidence(
                    private / "impossible-time.json", impossible_time, failure_path=output
                )

            tampered = dict(source)
            tampered["secret"] = "https://evil.test/?token=LEAK"
            with self.assertRaises(ValueError):
                write_private_evidence(
                    private / "tampered.json", tampered, approval_journal=journal
                )

            secret_carrier = failure(
                approval_id="AKIA" + "A" * 16,
                approval_consumed=False,
                approval_consumed_at=None,
                approval_marker_sha256=None,
                phase="approval",
                code="approval_consumption_failed",
                create_disposition="not_attempted",
                provider_task_id=None,
                owned_keys=[],
                deleted_keys=[],
                residual_keys=[],
                absence_confirmed_keys=[],
                backend_closed=False,
                local_media_removed=False,
            )
            with self.assertRaisesRegex(ValueError, "sensitive material"):
                write_private_evidence(private / "secret-carrier.json", secret_carrier)

    def test_writer_rejects_symlinked_ancestor(self) -> None:
        source = failure(
            approval_consumed=False,
            approval_consumed_at=None,
            approval_marker_sha256=None,
            phase="approval",
            code="approval_consumption_failed",
            create_disposition="not_attempted",
            provider_task_id=None,
            owned_keys=[],
            deleted_keys=[],
            residual_keys=[],
            absence_confirmed_keys=[],
            backend_closed=False,
            local_media_removed=False,
        )
        with tempfile.TemporaryDirectory(prefix="jingci-failure-ancestor-") as directory:
            base = Path(directory).resolve()
            outside = base / "outside"
            outside.mkdir(mode=0o700)
            configured = base / "configured"
            configured.symlink_to(outside, target_is_directory=True)

            with self.assertRaises(OSError):
                write_private_evidence(configured / "private" / "failure.json", source)
            self.assertEqual(list(outside.iterdir()), [])


if __name__ == "__main__":
    unittest.main()
