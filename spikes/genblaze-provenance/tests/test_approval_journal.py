from __future__ import annotations

import hashlib
import json
import multiprocessing
import os
import stat
import tempfile
import unittest
from dataclasses import replace
from datetime import datetime, timedelta, timezone
from pathlib import Path

from jingci_spike.approval_journal import ApprovalJournalError, DurableApprovalJournal, MARKER_SCHEMA
from jingci_spike.live_runway_b2_transaction import LiveApproval


CAMPAIGN_ID = "backblaze-genmedia-2026"
START = datetime(2026, 7, 15, 0, 0, 0, tzinfo=timezone.utc)


def approval() -> LiveApproval:
    return LiveApproval(
        approval_id="approval-001",
        run_id="run-001",
        commit="a" * 40,
        human_actor="human-owner",
        approved_at=START - timedelta(minutes=5),
        expires_at=START + timedelta(minutes=10),
        maximum_attempts=1,
        maximum_estimated_cost_usd=0.6,
        document_sha256="b" * 64,
    )


def consume_worker(
    directory: str,
    candidate: LiveApproval,
    provider_calls: str,
    barrier: multiprocessing.synchronize.Barrier,
    results: multiprocessing.queues.Queue,
) -> None:
    journal = DurableApprovalJournal(Path(directory), campaign_id=CAMPAIGN_ID, clock=lambda: START)
    barrier.wait()
    try:
        journal.consume(candidate, START)
    except PermissionError:
        results.put("denied")
    except BaseException as exc:
        results.put(f"error:{type(exc).__name__}")
    else:
        descriptor = os.open(provider_calls, os.O_WRONLY | os.O_CREAT | os.O_APPEND, 0o600)
        try:
            os.write(descriptor, f"{os.getpid()}\n".encode())
            os.fsync(descriptor)
        finally:
            os.close(descriptor)
        results.put("consumed")


class DurableApprovalJournalTest(unittest.TestCase):
    def test_marker_is_canonical_private_durable_and_replay_safe(self) -> None:
        with tempfile.TemporaryDirectory(prefix="jingci-approval-journal-") as directory:
            root = Path(directory).resolve() / "approvals"
            journal = DurableApprovalJournal(root, campaign_id=CAMPAIGN_ID, clock=lambda: START)
            candidate = approval()

            journal.consume(candidate, START)
            payload = journal.marker_bytes(candidate.approval_id)
            marker = next(root.glob("*.json"))
            decoded = json.loads(payload)

            self.assertEqual(decoded["schema_version"], MARKER_SCHEMA)
            self.assertEqual(decoded["approval_document_sha256"], candidate.document_sha256)
            self.assertNotIn(candidate.human_actor.encode(), payload)
            self.assertEqual(payload, (json.dumps(decoded, separators=(",", ":"), sort_keys=True) + "\n").encode())
            self.assertEqual(root.stat().st_mode & 0o777, 0o700)
            self.assertEqual(marker.stat().st_mode & 0o777, 0o600)
            self.assertEqual(marker.stat().st_nlink, 1)
            self.assertEqual(list(root.glob("*.tmp")), [])
            with self.assertRaisesRegex(PermissionError, "already consumed"):
                DurableApprovalJournal(root, campaign_id=CAMPAIGN_ID, clock=lambda: START).consume(
                    candidate, START
                )

    def test_same_approval_identity_with_different_document_is_denied(self) -> None:
        with tempfile.TemporaryDirectory(prefix="jingci-approval-alias-") as directory:
            root = Path(directory).resolve() / "approvals"
            journal = DurableApprovalJournal(root, campaign_id=CAMPAIGN_ID, clock=lambda: START)
            journal.consume(approval(), START)

            with self.assertRaisesRegex(PermissionError, "already consumed"):
                journal.consume(replace(approval(), document_sha256="c" * 64), START)

    def test_secret_shaped_identity_is_rejected_before_publication(self) -> None:
        with tempfile.TemporaryDirectory(prefix="jingci-approval-secret-") as directory:
            root = Path(directory).resolve() / "approvals"
            journal = DurableApprovalJournal(root, campaign_id=CAMPAIGN_ID, clock=lambda: START)
            with self.assertRaisesRegex(ValueError, "sensitive material"):
                journal.consume(replace(approval(), approval_id="AKIA" + "A" * 16), START)
            self.assertEqual(list(root.glob("*.json")), [])

    def test_spawned_processes_have_exactly_one_winner(self) -> None:
        with tempfile.TemporaryDirectory(prefix="jingci-approval-race-") as directory:
            root = str(Path(directory).resolve() / "approvals")
            provider_calls = str(Path(directory).resolve() / "provider-calls.log")
            context = multiprocessing.get_context("spawn")
            worker_count = 16
            barrier = context.Barrier(worker_count)
            results = context.Queue()
            processes = [
                context.Process(
                    target=consume_worker,
                    args=(root, approval(), provider_calls, barrier, results),
                )
                for _ in range(worker_count)
            ]
            for process in processes:
                process.start()
            for process in processes:
                process.join(20)
                self.assertEqual(process.exitcode, 0)
            outcomes = [results.get(timeout=2) for _ in processes]

            self.assertEqual(outcomes.count("consumed"), 1)
            self.assertEqual(outcomes.count("denied"), worker_count - 1)
            self.assertFalse(any(outcome.startswith("error:") for outcome in outcomes))
            self.assertEqual(Path(provider_calls).read_text().count("\n"), 1)

    def test_existing_corrupt_or_symlink_marker_is_never_reclaimed(self) -> None:
        with tempfile.TemporaryDirectory(prefix="jingci-approval-corrupt-") as directory:
            root = Path(directory).resolve() / "approvals"
            root.mkdir(mode=0o700)
            candidate = approval()
            name = hashlib.sha256(f"{CAMPAIGN_ID}\0{candidate.approval_id}".encode()).hexdigest() + ".json"
            (root / name).write_bytes(b'{"partial":')
            os.chmod(root / name, 0o600)
            journal = DurableApprovalJournal(root, campaign_id=CAMPAIGN_ID, clock=lambda: START)
            with self.assertRaisesRegex(PermissionError, "already consumed"):
                journal.consume(candidate, START)

            (root / name).unlink()
            (root / "target").write_text("not a marker")
            (root / name).symlink_to(root / "target")
            with self.assertRaisesRegex(PermissionError, "already consumed"):
                journal.consume(candidate, START)

    def test_expiry_after_publication_burns_marker_without_reuse(self) -> None:
        with tempfile.TemporaryDirectory(prefix="jingci-approval-expiry-") as directory:
            root = Path(directory).resolve() / "approvals"
            candidate = approval()
            journal = DurableApprovalJournal(
                root, campaign_id=CAMPAIGN_ID, clock=lambda: candidate.expires_at
            )
            with self.assertRaisesRegex(PermissionError, "expired after durable consumption"):
                journal.consume(candidate, START)
            self.assertEqual(len(list(root.glob("*.json"))), 1)
            with self.assertRaisesRegex(PermissionError, "already consumed"):
                DurableApprovalJournal(root, campaign_id=CAMPAIGN_ID, clock=lambda: START).consume(
                    candidate, START
                )

    def test_naive_time_and_unsafe_directory_fail_closed(self) -> None:
        with tempfile.TemporaryDirectory(prefix="jingci-approval-permissions-") as directory:
            root = Path(directory).resolve() / "approvals"
            root.mkdir(mode=0o755)
            journal = DurableApprovalJournal(root, campaign_id=CAMPAIGN_ID, clock=lambda: START)
            with self.assertRaises(PermissionError):
                journal.consume(approval(), START)
            with self.assertRaises(ValueError):
                journal.consume(approval(), START.replace(tzinfo=None))
            os.chmod(root, 0o700)
            with self.assertRaises(ApprovalJournalError):
                journal.marker_bytes("missing-marker")

    def test_symlinked_ancestor_is_rejected_without_writing_outside(self) -> None:
        with tempfile.TemporaryDirectory(prefix="jingci-approval-ancestor-") as directory:
            base = Path(directory).resolve()
            outside = base / "outside"
            outside.mkdir(mode=0o700)
            configured = base / "configured"
            configured.symlink_to(outside, target_is_directory=True)
            journal = DurableApprovalJournal(
                configured / "approvals", campaign_id=CAMPAIGN_ID, clock=lambda: START
            )

            with self.assertRaises(ApprovalJournalError):
                journal.consume(approval(), START)
            self.assertEqual(list(outside.iterdir()), [])

    def test_fifo_marker_fails_without_blocking(self) -> None:
        with tempfile.TemporaryDirectory(prefix="jingci-approval-fifo-") as directory:
            root = Path(directory).resolve() / "approvals"
            root.mkdir(mode=0o700)
            candidate = approval()
            name = hashlib.sha256(f"{CAMPAIGN_ID}\0{candidate.approval_id}".encode()).hexdigest() + ".json"
            os.mkfifo(root / name, mode=0o600)
            self.assertTrue(stat.S_ISFIFO((root / name).lstat().st_mode))
            journal = DurableApprovalJournal(root, campaign_id=CAMPAIGN_ID, clock=lambda: START)
            with self.assertRaises(PermissionError):
                journal.marker_bytes(candidate.approval_id)


if __name__ == "__main__":
    unittest.main()
