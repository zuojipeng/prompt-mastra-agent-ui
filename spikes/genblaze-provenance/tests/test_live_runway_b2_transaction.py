from __future__ import annotations

import json
import io
import tempfile
import unittest
from contextlib import redirect_stderr, redirect_stdout
from datetime import datetime, timedelta, timezone
from pathlib import Path

from jingci_spike.live_genblaze_b2_smoke import build_smoke_prefix
from jingci_spike.live_runway_b2_transaction import (
    APPROVAL_SCHEMA,
    InMemoryApprovalConsumer,
    build_plan,
    fixture_result_bytes,
    main,
    parse_live_approval,
    run_combined_transaction_fixture,
    write_fixture_result,
)
from jingci_spike.live_runway_smoke import LIVE_CONFIRMATION_VALUE, VideoProbe
from jingci_spike.local_pipeline import InMemoryStorageBackend
from jingci_spike.runway_provider import DownloadedVideo, FakeRunwayTaskClient


MEDIA = b"\x00\x00\x00\x18ftypisomcombined-runway-b2-fixture-mp4"
SIGNED_URL = "https://media.runway.test/output.mp4?token=never-persist"
COMMIT = "a" * 40
RUN_ID = "run-001"


class Clock:
    def __init__(self, *values: datetime) -> None:
        self.values = iter(values)

    def __call__(self) -> datetime:
        return next(self.values)


class TransactionBackend(InMemoryStorageBackend):
    def __init__(self, *, fail_delete: bool = False) -> None:
        super().__init__()
        self.fail_delete = fail_delete

    def delete(self, key: str) -> None:
        if self.fail_delete:
            raise RuntimeError("injected cleanup failure")
        super().delete(key)


def canonical(value: object) -> bytes:
    return (json.dumps(value, indent=2, separators=(",", ": "), ensure_ascii=True) + "\n").encode()


class LiveRunwayB2TransactionTest(unittest.TestCase):
    def setUp(self) -> None:
        self.start = datetime(2026, 7, 15, 0, 0, 0, tzinfo=timezone.utc)
        self.prefix = build_smoke_prefix(self.start, "1" * 32)
        self.media = DownloadedVideo(MEDIA, "video/mp4", SIGNED_URL)

    def approval(self, **changes: object) -> bytes:
        payload = {
            "schema_version": APPROVAL_SCHEMA,
            "approval_id": "approval-001",
            "run_id": RUN_ID,
            "commit": COMMIT,
            "human_actor": "human-owner",
            "approved_at": "2026-07-14T23:55:00Z",
            "expires_at": "2026-07-15T00:10:00Z",
            "maximum_attempts": 1,
            "maximum_estimated_cost_usd": 0.6,
            "confirmation": LIVE_CONFIRMATION_VALUE,
            "scopes": ["b2_account_and_credentials", "runway_one_attempt_spend"],
        }
        payload.update(changes)
        return canonical(payload)

    def client(self) -> FakeRunwayTaskClient:
        return FakeRunwayTaskClient(["PENDING", "SUCCEEDED"], self.media, output_url=SIGNED_URL)

    @staticmethod
    def probe(path: Path) -> VideoProbe:
        if path.read_bytes() != MEDIA:
            raise AssertionError("unexpected probe bytes")
        return VideoProbe("h264", 1280, 720, 5.0)

    def clock(self) -> Clock:
        return Clock(
            self.start,
            self.start + timedelta(seconds=1),
            self.start + timedelta(seconds=30),
            self.start + timedelta(seconds=40),
            self.start + timedelta(seconds=41),
        )

    def run_fixture(self, **changes: object):
        options = {
            "approval_bytes": self.approval(),
            "run_id": RUN_ID,
            "commit": COMMIT,
            "source_clean": True,
            "client": self.client(),
            "backend": TransactionBackend(),
            "probe": self.probe,
            "prefix": self.prefix,
            "output_host": "media.runway.test",
            "clock": self.clock(),
            "approval_consumer": InMemoryApprovalConsumer(),
        }
        options.update(changes)
        return run_combined_transaction_fixture(**options)

    def test_fixture_emits_canonical_private_contract_after_cleanup(self) -> None:
        result = self.run_fixture()

        self.assertEqual(result["schema_version"], "jingci.combined-runway-b2-fixture-result.v1")
        self.assertEqual(result["evidence_mode"], "fixture_non_attestable")
        self.assertEqual(result["approval"]["run_id"], RUN_ID)
        self.assertEqual(result["approval"]["commit"], COMMIT)
        self.assertEqual(result["provider"]["create_attempts"], 1)
        self.assertEqual(result["media"]["sha256"], result["storage"]["asset_sha256"])
        self.assertEqual(result["cleanup"]["residual_keys"], [])
        encoded = fixture_result_bytes(result)
        self.assertEqual(encoded, canonical(result))
        self.assertNotIn(b"https://", encoded)
        self.assertNotIn(b"token=", encoded)

    def test_approval_is_canonical_bound_active_and_single_attempt(self) -> None:
        approval = parse_live_approval(
            self.approval(), expected_run_id=RUN_ID, expected_commit=COMMIT, at=self.start
        )
        self.assertEqual(approval.maximum_attempts, 1)
        self.assertEqual(approval.maximum_estimated_cost_usd, 0.6)

        cases = [
            self.approval(run_id="another-run"),
            self.approval(commit="b" * 40),
            self.approval(maximum_attempts=2),
            self.approval(scopes=["runway_one_attempt_spend"]),
            json.dumps(json.loads(self.approval()), separators=(",", ":")).encode(),
        ]
        for raw in cases:
            with self.subTest(raw=raw[:30]):
                with self.assertRaises((ValueError, PermissionError)):
                    parse_live_approval(
                        raw, expected_run_id=RUN_ID, expected_commit=COMMIT, at=self.start
                    )

    def test_expired_approval_and_real_dependencies_fail_before_create(self) -> None:
        client = self.client()
        with self.assertRaises(PermissionError):
            self.run_fixture(
                approval_bytes=self.approval(expires_at="2026-07-14T23:59:59Z"),
                client=client,
            )
        self.assertEqual(client.create_calls, [])

        with self.assertRaisesRegex(PermissionError, "only fake"):
            self.run_fixture(backend=object())

    def test_approval_consumer_prevents_reuse_across_runs(self) -> None:
        consumer = InMemoryApprovalConsumer()
        self.run_fixture(approval_consumer=consumer)
        second_client = self.client()
        with self.assertRaises(Exception):
            self.run_fixture(approval_consumer=consumer, client=second_client)
        self.assertEqual(second_client.create_calls, [])

    def test_probe_or_cleanup_failure_never_returns_private_result(self) -> None:
        client = self.client()
        backend = TransactionBackend()
        with self.assertRaises(Exception):
            self.run_fixture(
                client=client,
                backend=backend,
                probe=lambda _: (_ for _ in ()).throw(RuntimeError("probe failed")),
            )
        self.assertEqual(len(client.create_calls), 1)
        self.assertEqual(backend.objects, {})

        with self.assertRaises(Exception):
            self.run_fixture(backend=TransactionBackend(fail_delete=True))

    def test_storage_exception_secrets_do_not_escape_to_process_output(self) -> None:
        secret = "key_" + "a" * 128
        signed_url = "https://evil.test/output?token=LEAK"
        backend = TransactionBackend()
        backend.put = lambda *args, **kwargs: (_ for _ in ()).throw(
            RuntimeError(f"{secret} {signed_url}")
        )
        stdout = io.StringIO()
        stderr = io.StringIO()

        with redirect_stdout(stdout), redirect_stderr(stderr):
            with self.assertRaises(Exception) as raised:
                self.run_fixture(backend=backend)

        observed = stdout.getvalue() + stderr.getvalue() + str(raised.exception)
        self.assertNotIn(secret, observed)
        self.assertNotIn(signed_url, observed)
        self.assertNotIn("token=", observed)

    def test_private_writer_is_owner_only_and_exclusive(self) -> None:
        result = self.run_fixture()
        with tempfile.TemporaryDirectory(prefix="jingci-private-result-") as directory:
            private_dir = Path(directory) / "private"
            private_dir.mkdir(mode=0o700)
            output = private_dir / "run-001.json"
            write_fixture_result(output, result)
            self.assertEqual(output.stat().st_mode & 0o777, 0o600)
            self.assertEqual(output.read_bytes(), fixture_result_bytes(result))
            with self.assertRaises(FileExistsError):
                write_fixture_result(output, result)

    def test_plan_has_no_live_cli_or_external_side_effect(self) -> None:
        plan = build_plan()
        self.assertFalse(plan["execution_enabled"])
        self.assertFalse(plan["network"])
        self.assertFalse(plan["credentials_loaded"])
        self.assertFalse(plan["spend_authorized"])
        self.assertFalse(plan["live_cli_mode"])
        self.assertEqual(main(["--plan"]), 0)
        with self.assertRaises(SystemExit):
            main([])


if __name__ == "__main__":
    unittest.main()
