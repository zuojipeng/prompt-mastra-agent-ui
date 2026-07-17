from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import stat
import subprocess
import sys
import threading
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable, Mapping, Protocol

APPROVAL_SCHEMA = "jingci.hackathon-live-approval.v1"
FIXTURE_RESULT_SCHEMA = "jingci.combined-runway-b2-fixture-result.v1"
LIVE_RESULT_SCHEMA = "jingci.hackathon-live-result.v1"
CAMPAIGN_ID = "backblaze-genmedia-2026"
EXPECTED_SCOPES = ("b2_account_and_credentials", "runway_one_attempt_spend")
LIVE_CONFIRMATION_VALUE = "RUNWAY gen4.5 5s ONE ATTEMPT MAX $0.60"
_ID = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._:-]{2,127}$")
_ACTOR = re.compile(r"^[A-Za-z0-9][A-Za-z0-9 ._@+-]{1,127}$")
_COMMIT = re.compile(r"^[0-9a-f]{40}$")
_PREFIX = re.compile(r"^jingci-smoke/[0-9]{8}T[0-9]{6}Z/[0-9a-f]{32}$")


@dataclass(frozen=True)
class LiveApproval:
    approval_id: str
    run_id: str
    commit: str
    human_actor: str
    approved_at: datetime
    expires_at: datetime
    maximum_attempts: int
    maximum_estimated_cost_usd: float
    document_sha256: str


class InMemoryApprovalConsumer:
    """Fixture-only atomic consumer; a live root needs durable external state."""

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._consumed: set[str] = set()

    def consume(self, approval: LiveApproval, at: datetime) -> None:
        if at.tzinfo is None:
            raise ValueError("approval clock must be timezone-aware")
        instant = at.astimezone(timezone.utc)
        with self._lock:
            if approval.document_sha256 in self._consumed:
                raise PermissionError("one-shot approval was already consumed")
            if not approval.approved_at <= instant < approval.expires_at:
                raise PermissionError("one-shot approval is not active")
            self._consumed.add(approval.document_sha256)


class ApprovalConsumer(Protocol):
    def consume(self, approval: LiveApproval, at: datetime) -> None: ...


def _utc(value: str) -> datetime:
    if not isinstance(value, str) or not re.fullmatch(
        r"[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}Z", value
    ):
        raise ValueError("approval timestamps must be canonical UTC seconds")
    try:
        parsed = datetime.strptime(value, "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=timezone.utc)
    except ValueError as exc:
        raise ValueError("approval timestamp is invalid") from exc
    if _stamp(parsed) != value:
        raise ValueError("approval timestamp is not canonical")
    return parsed


def _stamp(value: datetime) -> str:
    if value.tzinfo is None:
        raise ValueError("clock must return timezone-aware UTC values")
    return value.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _canonical_bytes(value: Mapping[str, Any]) -> bytes:
    return (json.dumps(value, indent=2, separators=(",", ": "), ensure_ascii=True) + "\n").encode("utf-8")


def parse_live_approval(
    raw: bytes,
    *,
    expected_run_id: str,
    expected_commit: str,
    at: datetime,
) -> LiveApproval:
    if not raw or len(raw) > 32 * 1024 or b"\x00" in raw:
        raise ValueError("approval document size is invalid")
    try:
        decoded = raw.decode("utf-8", errors="strict")
        payload = json.loads(decoded)
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise ValueError("approval document must be UTF-8 JSON") from exc
    expected_keys = {
        "schema_version", "approval_id", "run_id", "commit", "human_actor",
        "approved_at", "expires_at", "maximum_attempts",
        "maximum_estimated_cost_usd", "confirmation", "scopes",
    }
    if not isinstance(payload, dict) or set(payload) != expected_keys or raw != _canonical_bytes(payload):
        raise ValueError("approval document shape or canonical encoding is invalid")
    if payload["schema_version"] != APPROVAL_SCHEMA:
        raise ValueError("approval schema is invalid")
    if not _ID.fullmatch(payload["approval_id"] or "") or not _ACTOR.fullmatch(payload["human_actor"] or ""):
        raise ValueError("approval identity is invalid")
    if payload["run_id"] != expected_run_id or payload["commit"] != expected_commit:
        raise ValueError("approval is not bound to this run and commit")
    if not _ID.fullmatch(expected_run_id) or not _COMMIT.fullmatch(expected_commit):
        raise ValueError("run or commit identity is invalid")
    if payload["maximum_attempts"] != 1 or payload["maximum_estimated_cost_usd"] != 0.6:
        raise ValueError("approval spend boundary is invalid")
    if payload["confirmation"] != LIVE_CONFIRMATION_VALUE or payload["scopes"] != list(EXPECTED_SCOPES):
        raise ValueError("approval scope or confirmation is invalid")
    approved_at = _utc(payload["approved_at"])
    expires_at = _utc(payload["expires_at"])
    normalized_at = at.astimezone(timezone.utc)
    if not approved_at <= normalized_at < expires_at:
        raise PermissionError("approval is not active")
    return LiveApproval(
        approval_id=payload["approval_id"],
        run_id=payload["run_id"],
        commit=payload["commit"],
        human_actor=payload["human_actor"],
        approved_at=approved_at,
        expires_at=expires_at,
        maximum_attempts=1,
        maximum_estimated_cost_usd=0.6,
        document_sha256=hashlib.sha256(raw).hexdigest(),
    )


def validate_campaign_paid_authorization(campaign: Mapping[str, Any]) -> None:
    authorization = campaign.get("authorization")
    if not isinstance(authorization, Mapping):
        raise PermissionError("campaign paid API authorization is missing")
    if authorization.get("may_use_paid_api") is not True:
        raise PermissionError("campaign paid API authorization is not approved")
    if authorization.get("max_external_spend") != 0.6:
        raise PermissionError("campaign external spend cap must equal $0.60")


class _ApprovalBoundClient:
    def __init__(
        self,
        delegate: Any,
        approval: LiveApproval,
        consumer: ApprovalConsumer,
        *,
        clock: Callable[[], datetime],
    ) -> None:
        self.delegate = delegate
        self.approval = approval
        self.consumer = consumer
        self.clock = clock
        self.create_calls: list[dict[str, object]] = []
        self.consumed_at: datetime | None = None
        self.provider_completed_at: datetime | None = None

    def create_text_video(self, **request: object) -> str:
        if self.consumed_at is not None:
            raise PermissionError("one-shot approval was already consumed")
        consumed_at = self.clock().astimezone(timezone.utc)
        self.consumer.consume(self.approval, consumed_at)
        self.consumed_at = consumed_at
        self.create_calls.append(dict(request))
        return self.delegate.create_text_video(**request)

    def get_task(self, task_id: str, **request: object) -> Mapping[str, object]:
        task = self.delegate.get_task(task_id, **request)
        if str(task.get("status", "")).upper() == "SUCCEEDED" and self.provider_completed_at is None:
            self.provider_completed_at = self.clock().astimezone(timezone.utc)
        return task

    def download_video(self, output_url: str, **request: object):
        downloaded = self.delegate.download_video(output_url, **request)
        return downloaded

    def cancel_task(self, task_id: str, **request: object) -> None:
        self.delegate.cancel_task(task_id, **request)


def run_combined_transaction_fixture(
    *,
    approval_bytes: bytes,
    run_id: str,
    commit: str,
    source_clean: bool,
    client: Any,
    backend: Any,
    probe: Callable[[Path], Any],
    prefix: str,
    output_host: str,
    clock: Callable[[], datetime],
    approval_consumer: ApprovalConsumer,
) -> dict[str, Any]:
    from .local_pipeline import InMemoryStorageBackend
    from .offline_runway_b2_transaction import _run_runway_b2_transaction
    from .runway_provider import FakeRunwayTaskClient

    if not isinstance(client, FakeRunwayTaskClient) or not isinstance(backend, InMemoryStorageBackend):
        raise PermissionError("combined fixture accepts only fake provider and in-memory storage")
    if not source_clean:
        raise PermissionError("combined transaction requires a clean pinned source")
    if not _PREFIX.fullmatch(prefix):
        raise ValueError("combined transaction prefix is invalid")
    started_at = clock().astimezone(timezone.utc)
    approval = parse_live_approval(
        approval_bytes, expected_run_id=run_id, expected_commit=commit, at=started_at
    )
    guarded_client = _ApprovalBoundClient(client, approval, approval_consumer, clock=clock)
    transaction = _run_runway_b2_transaction(
        client=guarded_client,
        backend=backend,
        probe=probe,
        prefix=prefix,
        output_host=output_host,
        network=False,
        schema_version="jingci.combined-runway-b2-fixture.v1",
    )
    cleanup_completed_at = clock().astimezone(timezone.utc)
    finished_at = clock().astimezone(timezone.utc)
    consumed_at = guarded_client.consumed_at
    provider_completed_at = guarded_client.provider_completed_at
    if consumed_at is None or provider_completed_at is None:
        raise RuntimeError("provider lifecycle timestamps are incomplete")
    if not started_at <= consumed_at <= provider_completed_at <= cleanup_completed_at <= finished_at < approval.expires_at:
        raise PermissionError("provider lifecycle escaped approval time boundary")
    if not 4.0 <= transaction.probe.duration_seconds <= 6.0:
        raise RuntimeError("probe duration is outside private evidence tolerance")
    if transaction.provider_create_count != 1 or not transaction.storage_cleanup or not transaction.local_cleanup:
        raise RuntimeError("combined transaction did not close every invariant")
    result = {
        "schema_version": FIXTURE_RESULT_SCHEMA,
        "evidence_mode": "fixture_non_attestable",
        "status": "passed",
        "run_id": run_id,
        "started_at": _stamp(started_at),
        "finished_at": _stamp(finished_at),
        "source": {"commit": commit, "clean": True},
        "approval": {
            "approval_id": approval.approval_id,
            "approval_document_sha256": approval.document_sha256,
            "run_id": run_id,
            "commit": commit,
            "human_actor": approval.human_actor,
            "approved_at": _stamp(approval.approved_at),
            "expires_at": _stamp(approval.expires_at),
            "consumed_at": _stamp(consumed_at),
            "maximum_attempts": 1,
            "maximum_estimated_cost_usd": 0.6,
        },
        "provider": {
            "name": "runway",
            "model": "gen4.5",
            "api_version": "2024-11-06",
            "task_id": transaction.task_id,
            "create_attempts": 1,
            "duration_seconds": 5,
            "ratio": "1280:720",
            "completed_at": _stamp(provider_completed_at),
        },
        "media": {
            "container": "mp4",
            "bytes": transaction.asset_size_bytes,
            "duration_seconds": transaction.probe.duration_seconds,
            "width": transaction.probe.width,
            "height": transaction.probe.height,
            "sha256": transaction.asset_sha256,
        },
        "storage": {
            "backend": "backblaze_b2",
            "owned_prefix": transaction.prefix,
            "asset_key": transaction.asset_key,
            "manifest_key": transaction.manifest_key,
            "asset_sha256": transaction.asset_sha256,
            "manifest_hash": transaction.manifest_hash,
            "readback_verified": True,
            "lineage_verified": True,
        },
        "cleanup": {
            "status": "complete",
            "deleted_keys": [transaction.manifest_key, transaction.asset_key],
            "absence_confirmed": True,
            "residual_keys": [],
            "backend_closed": True,
            "local_media_removed": True,
            "completed_at": _stamp(cleanup_completed_at),
        },
        "evidence": {"scan_requested": True},
    }
    return result


def run_combined_live_transaction(
    *,
    approval_bytes: bytes,
    run_id: str,
    commit: str,
    source_clean: bool,
    client: Any,
    backend: Any,
    probe: Callable[[Path], Any],
    prefix: str,
    output_host: str,
    clock: Callable[[], datetime],
    approval_consumer: ApprovalConsumer,
) -> dict[str, Any]:
    """Execute one approval-bound provider-to-storage transaction.

    Dependency construction stays outside this function so the complete live
    boundary can be exercised with fakes before credentials or network exist.
    """
    if not source_clean:
        raise PermissionError("combined transaction requires a clean pinned source")
    if not _PREFIX.fullmatch(prefix):
        raise ValueError("combined transaction prefix is invalid")
    started_at = clock().astimezone(timezone.utc)
    approval = parse_live_approval(
        approval_bytes, expected_run_id=run_id, expected_commit=commit, at=started_at
    )
    guarded_client = _ApprovalBoundClient(client, approval, approval_consumer, clock=clock)
    transaction = _run_live_dependencies(
        guarded_client=guarded_client,
        backend=backend,
        probe=probe,
        prefix=prefix,
        output_host=output_host,
    )
    cleanup_completed_at = clock().astimezone(timezone.utc)
    finished_at = clock().astimezone(timezone.utc)
    consumed_at = guarded_client.consumed_at
    provider_completed_at = guarded_client.provider_completed_at
    if consumed_at is None or provider_completed_at is None:
        raise RuntimeError("provider lifecycle timestamps are incomplete")
    if not started_at <= consumed_at <= provider_completed_at <= cleanup_completed_at <= finished_at < approval.expires_at:
        raise PermissionError("provider lifecycle escaped approval time boundary")
    if not 4.0 <= transaction.probe.duration_seconds <= 6.0:
        raise RuntimeError("probe duration is outside private evidence tolerance")
    if transaction.provider_create_count != 1 or not transaction.storage_cleanup or not transaction.local_cleanup:
        raise RuntimeError("combined transaction did not close every invariant")
    return {
        "schema_version": LIVE_RESULT_SCHEMA,
        "status": "passed",
        "run_id": run_id,
        "started_at": _stamp(started_at),
        "finished_at": _stamp(finished_at),
        "source": {"commit": commit, "clean": True},
        "approval": {
            "approval_id": approval.approval_id,
            "approval_document_sha256": approval.document_sha256,
            "run_id": run_id,
            "commit": commit,
            "human_actor": approval.human_actor,
            "approved_at": _stamp(approval.approved_at),
            "expires_at": _stamp(approval.expires_at),
            "consumed_at": _stamp(consumed_at),
            "maximum_attempts": 1,
            "maximum_estimated_cost_usd": 0.6,
        },
        "provider": {
            "name": "runway",
            "model": "gen4.5",
            "api_version": "2024-11-06",
            "task_id": transaction.task_id,
            "create_attempts": 1,
            "duration_seconds": 5,
            "ratio": "1280:720",
            "completed_at": _stamp(provider_completed_at),
        },
        "media": {
            "container": "mp4",
            "bytes": transaction.asset_size_bytes,
            "duration_seconds": transaction.probe.duration_seconds,
            "width": transaction.probe.width,
            "height": transaction.probe.height,
            "sha256": transaction.asset_sha256,
        },
        "storage": {
            "backend": "backblaze_b2",
            "owned_prefix": transaction.prefix,
            "asset_key": transaction.asset_key,
            "manifest_key": transaction.manifest_key,
            "asset_sha256": transaction.asset_sha256,
            "manifest_hash": transaction.manifest_hash,
            "readback_verified": True,
            "lineage_verified": True,
        },
        "cleanup": {
            "status": "complete",
            "deleted_keys": [transaction.manifest_key, transaction.asset_key],
            "absence_confirmed": True,
            "residual_keys": [],
            "backend_closed": True,
            "local_media_removed": True,
            "completed_at": _stamp(cleanup_completed_at),
        },
        "evidence": {"scan_requested": True},
    }


def _run_live_dependencies(*, guarded_client: Any, backend: Any, probe: Callable[[Path], Any], prefix: str, output_host: str):
    from .offline_runway_b2_transaction import _run_runway_b2_transaction

    return _run_runway_b2_transaction(
        client=guarded_client,
        backend=backend,
        probe=probe,
        prefix=prefix,
        output_host=output_host,
        network=True,
        schema_version=LIVE_RESULT_SCHEMA,
    )


def fixture_result_bytes(result: Mapping[str, Any]) -> bytes:
    if result.get("schema_version") != FIXTURE_RESULT_SCHEMA or result.get("evidence_mode") != "fixture_non_attestable":
        raise ValueError("fixture result schema is invalid")
    return _canonical_bytes(result)


def write_fixture_result(path: Path, result: Mapping[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    if path.parent.stat().st_mode & 0o777 != 0o700:
        raise PermissionError("private result directory must be mode 0700")
    descriptor = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    try:
        with os.fdopen(descriptor, "wb", closefd=True) as handle:
            handle.write(fixture_result_bytes(result))
            handle.flush()
            os.fsync(handle.fileno())
    except BaseException:
        try:
            path.unlink(missing_ok=True)
        finally:
            raise


def write_live_result(path: Path, result: Mapping[str, Any]) -> None:
    if result.get("schema_version") != LIVE_RESULT_SCHEMA or result.get("status") != "passed":
        raise ValueError("live result schema is invalid")
    path.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    if path.parent.stat().st_mode & 0o777 != 0o700:
        raise PermissionError("private result directory must be mode 0700")
    descriptor = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    try:
        with os.fdopen(descriptor, "wb", closefd=True) as handle:
            handle.write(_canonical_bytes(result))
            handle.flush()
            os.fsync(handle.fileno())
    except BaseException:
        path.unlink(missing_ok=True)
        raise


def build_plan() -> dict[str, Any]:
    return {
        "schema_version": "jingci.combined-runway-b2-plan.v1",
        "execution_enabled": True,
        "network": False,
        "credentials_loaded": False,
        "spend_authorized": False,
        "live_cli_mode": True,
        "approval": "canonical one-shot document bound to run, commit, scopes, expiry, and $0.60",
        "provider": "guarded Runway HTTP client; one create and zero retry",
        "probe": "bounded ffprobe before storage",
        "storage": "Genblaze content-addressed asset and manifest through scoped B2 backend",
        "cleanup": "explicit two-key delete, absence confirmation, backend close, local media removal",
        "evidence": "canonical mode-0600 fixture result for schema comparison only",
        "fixture_result": "explicitly non-attestable",
        "live_result": "mode-0600 canonical result; a separate scanner creates the redacted attestation",
    }


def main(argv: list[str] | None = None, env: Mapping[str, str] = os.environ) -> int:
    parser = argparse.ArgumentParser(description="Plan the guarded combined Runway-to-B2 transaction")
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--plan", action="store_true")
    mode.add_argument("--live", action="store_true")
    parser.add_argument("--approval")
    parser.add_argument("--run-id")
    args = parser.parse_args(argv)
    if args.plan:
        print(json.dumps(build_plan(), indent=2, sort_keys=True))
        return 0
    if not args.approval or not args.run_id or not _ID.fullmatch(args.run_id):
        parser.error("--live requires --approval and a valid --run-id")
    try:
        from .approval_journal import DurableApprovalJournal
        from .b2_config import B2Config, build_live_backblaze_backend
        from .live_genblaze_b2_smoke import build_smoke_prefix
        from .live_runway_smoke import RunwayLiveConfig, probe_video, validate_live_authorization
        from .runway_client import RunwayHttpClient, UrllibHttpTransport
        from .transaction_failure_evidence import (
            build_interrupted_failure_record,
            write_private_evidence,
        )

        validate_live_authorization(env)
        campaign_path = Path("docs/campaigns/backblaze-genmedia-2026/campaign.json")
        validate_campaign_paid_authorization(json.loads(campaign_path.read_text(encoding="utf-8")))
        commit = subprocess.run(
            ["git", "rev-parse", "HEAD"], check=True, capture_output=True, text=True
        ).stdout.strip()
        dirty = subprocess.run(
            ["git", "status", "--porcelain", "--untracked-files=no"],
            check=True, capture_output=True, text=True,
        ).stdout.strip()
        if dirty:
            raise PermissionError("tracked worktree must be clean before live execution")
        private_root = Path("artifacts/hackathon/backblaze-genmedia-2026/private").resolve()
        private_root.mkdir(parents=True, exist_ok=True, mode=0o700)
        if private_root.stat().st_mode & 0o777 != 0o700:
            raise PermissionError("private result directory must be mode 0700")
        approval_path = Path(args.approval).resolve()
        approval_lstat = os.lstat(args.approval)
        if (
            approval_path.parent != private_root
            or not stat.S_ISREG(approval_lstat.st_mode)
            or approval_lstat.st_nlink != 1
            or approval_lstat.st_mode & 0o777 != 0o600
            or (hasattr(os, "getuid") and approval_lstat.st_uid != os.getuid())
            or approval_lstat.st_size <= 0
            or approval_lstat.st_size > 32 * 1024
        ):
            raise PermissionError("approval must be a mode-0600 file directly below the private result directory")
        approval_bytes = approval_path.read_bytes()
        approval = parse_live_approval(
            approval_bytes,
            expected_run_id=args.run_id,
            expected_commit=commit,
            at=datetime.now(timezone.utc),
        )
        output = private_root / f"{args.run_id}.json"
        if output.exists() or output.is_symlink():
            raise FileExistsError("private live result already exists")
        runway = RunwayLiveConfig.from_env(env)
        if len(runway.output_hosts) != 1:
            raise ValueError("combined live execution requires exactly one reviewed Runway output host")
        journal_root = private_root / "approval-journal"
        journal_root.mkdir(mode=0o700, exist_ok=True)
        journal = DurableApprovalJournal(journal_root, campaign_id=CAMPAIGN_ID)
        prefix = build_smoke_prefix()
        try:
            result = run_combined_live_transaction(
                approval_bytes=approval_bytes,
                run_id=args.run_id,
                commit=commit,
                source_clean=True,
                client=RunwayHttpClient(runway.api_secret, UrllibHttpTransport()),
                backend=build_live_backblaze_backend(B2Config.from_env(env)),
                probe=probe_video,
                prefix=prefix,
                output_host=runway.output_hosts[0],
                clock=lambda: datetime.now(timezone.utc),
                approval_consumer=journal,
            )
        except BaseException:
            try:
                marker = journal.read_marker(approval.approval_id)
            except Exception:
                pass
            else:
                try:
                    failure_output = private_root / f"{args.run_id}.failure.json"
                    if not failure_output.exists() and not failure_output.is_symlink():
                        failure = build_interrupted_failure_record(
                            dict(marker),
                            occurred_at=datetime.now(timezone.utc),
                            owned_prefix=prefix,
                        )
                        write_private_evidence(
                            failure_output,
                            failure,
                            approval_journal=journal,
                        )
                except Exception:
                    pass
            raise
        write_live_result(output, result)
    except (PermissionError, ValueError) as error:
        print(str(error), file=sys.stderr)
        return 2
    except Exception as error:
        print(f"combined live transaction failed ({type(error).__name__}); no secret or signed URL was printed", file=sys.stderr)
        return 1
    print(f"private live result written: {output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
