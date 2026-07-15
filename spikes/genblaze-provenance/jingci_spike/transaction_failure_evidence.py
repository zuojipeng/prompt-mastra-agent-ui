from __future__ import annotations

import hashlib
import json
import os
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Mapping, Sequence

from .approval_journal import DurableApprovalJournal, MARKER_SCHEMA, parse_marker_bytes
from .private_file_store import open_owner_directory, publish_immutable, read_private_file


FAILURE_SCHEMA = "jingci.combined-transaction-failure.v1"
RECOVERY_SCHEMA = "jingci.combined-transaction-recovery.v1"
EVIDENCE_MODE = "non_attestable"
FAILURE_PHASES = {
    "approval",
    "provider_create",
    "provider_poll",
    "download",
    "probe",
    "storage_write",
    "readback",
    "cleanup",
    "invariant",
    "interrupted",
}
FAILURE_CODES = {
    "approval_consumption_failed",
    "provider_create_failed",
    "provider_poll_failed",
    "download_failed",
    "output_probe_failed",
    "storage_write_failed",
    "readback_failed",
    "cleanup_failed",
    "invariant_failed",
    "execution_interrupted",
}
PHASE_CODE = {
    "approval": "approval_consumption_failed",
    "provider_create": "provider_create_failed",
    "provider_poll": "provider_poll_failed",
    "download": "download_failed",
    "probe": "output_probe_failed",
    "storage_write": "storage_write_failed",
    "readback": "readback_failed",
    "cleanup": "cleanup_failed",
    "invariant": "invariant_failed",
    "interrupted": "execution_interrupted",
}
CREATE_DISPOSITIONS = {"not_attempted", "attempted_unknown", "task_id_observed", "completed"}
CANCELLATION_DISPOSITIONS = {"not_applicable", "not_attempted", "attempted_unknown", "confirmed"}
_ID = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._:-]{2,127}$")
_COMMIT = re.compile(r"^[0-9a-f]{40}$")
_DIGEST = re.compile(r"^[0-9a-f]{64}$")
_PREFIX = re.compile(r"^jingci-smoke/[0-9]{8}T[0-9]{6}Z/[0-9a-f]{32}$")


def _stamp(value: datetime) -> str:
    if value.tzinfo is None:
        raise ValueError("evidence clock must be timezone-aware")
    return value.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def canonical_evidence_bytes(value: Mapping[str, Any]) -> bytes:
    return (json.dumps(value, indent=2, separators=(",", ": "), sort_keys=True, ensure_ascii=True) + "\n").encode(
        "ascii"
    )


def _validated_keys(values: Sequence[str], prefix: str) -> list[str]:
    keys = list(values)
    if len(keys) != len(set(keys)) or any(
        not key.startswith(f"{prefix}/")
        or not re.fullmatch(
            r"(?:assets/[0-9a-f]{64}\.mp4|manifests/[0-9a-f]{64}\.json)",
            key[len(prefix) + 1 :],
        )
        for key in keys
    ):
        raise ValueError("failure evidence contains an invalid owned key")
    return sorted(keys)


def _cleanup(
    *,
    prefix: str,
    owned_keys: Sequence[str],
    deleted_keys: Sequence[str],
    residual_keys: Sequence[str],
    absence_confirmed_keys: Sequence[str],
    backend_closed: bool,
    local_media_removed: bool,
) -> dict[str, Any]:
    if type(backend_closed) is not bool or type(local_media_removed) is not bool:
        raise ValueError("cleanup evidence flags must be booleans")
    owned = _validated_keys(owned_keys, prefix)
    deleted = _validated_keys(deleted_keys, prefix)
    residual = _validated_keys(residual_keys, prefix)
    absent = _validated_keys(absence_confirmed_keys, prefix)
    if set(deleted) & set(residual) or set(deleted) | set(residual) != set(owned):
        raise ValueError("cleanup evidence must partition every owned key")
    if not set(absent).issubset(set(deleted)):
        raise ValueError("absence evidence must refer to deleted owned keys")
    complete = not residual and set(absent) == set(owned) and backend_closed and local_media_removed
    return {
        "status": "complete" if complete else "incomplete",
        "deleted_keys": deleted,
        "residual_keys": residual,
        "absence_confirmed_keys": absent,
        "backend_closed": backend_closed,
        "local_media_removed": local_media_removed,
    }


def build_failure_record(
    *,
    run_id: str,
    commit: str,
    approval_id: str,
    approval_document_sha256: str,
    approval_consumed: bool,
    approval_consumed_at: datetime | None,
    campaign_id: str,
    approval_marker_sha256: str | None,
    phase: str,
    code: str,
    create_disposition: str | None = None,
    provider_task_id: str | None = None,
    cancellation_disposition: str = "not_applicable",
    occurred_at: datetime,
    owned_prefix: str,
    owned_keys: Sequence[str] = (),
    deleted_keys: Sequence[str] = (),
    residual_keys: Sequence[str] = (),
    absence_confirmed_keys: Sequence[str] = (),
    backend_closed: bool,
    local_media_removed: bool,
) -> dict[str, Any]:
    if type(approval_consumed) is not bool:
        raise ValueError("approval consumption evidence must be boolean")
    if occurred_at.tzinfo is None:
        raise ValueError("failure evidence clock must be timezone-aware")
    if (
        not _ID.fullmatch(run_id)
        or not _ID.fullmatch(approval_id)
        or not _COMMIT.fullmatch(commit)
        or not _DIGEST.fullmatch(approval_document_sha256)
        or not _ID.fullmatch(campaign_id)
        or phase not in FAILURE_PHASES
        or code not in FAILURE_CODES
        or PHASE_CODE.get(phase) != code
        or not _PREFIX.fullmatch(owned_prefix)
    ):
        raise ValueError("failure evidence identity or classification is invalid")
    cleanup = _cleanup(
        prefix=owned_prefix,
        owned_keys=owned_keys,
        deleted_keys=deleted_keys,
        residual_keys=residual_keys,
        absence_confirmed_keys=absence_confirmed_keys,
        backend_closed=backend_closed,
        local_media_removed=local_media_removed,
    )
    if not approval_consumed and phase != "approval":
        raise ValueError("post-approval failure evidence requires consumed approval")
    disposition = create_disposition or (
        "not_attempted" if phase == "approval" else "attempted_unknown"
    )
    if disposition not in CREATE_DISPOSITIONS or cancellation_disposition not in CANCELLATION_DISPOSITIONS:
        raise ValueError("provider recovery disposition is invalid")
    if disposition in {"task_id_observed", "completed"}:
        if not isinstance(provider_task_id, str) or not _ID.fullmatch(provider_task_id):
            raise ValueError("known provider disposition requires a bounded task id")
    elif provider_task_id is not None:
        raise ValueError("unknown provider disposition cannot retain a task id")
    if disposition == "not_attempted" and cancellation_disposition != "not_applicable":
        raise ValueError("unattempted provider work cannot have cancellation state")
    if disposition == "completed" and cancellation_disposition != "not_applicable":
        raise ValueError("completed provider work cannot have cancellation state")
    if cancellation_disposition == "confirmed" and disposition != "task_id_observed":
        raise ValueError("confirmed cancellation requires an observed task id")
    if phase == "approval" and disposition != "not_attempted":
        raise ValueError("approval failure cannot claim provider activity")
    if phase in {"provider_poll", "download", "probe", "storage_write", "readback", "cleanup", "invariant"} and disposition not in {
        "task_id_observed",
        "completed",
    }:
        raise ValueError("post-create phase requires known provider task state")
    if approval_consumed:
        if approval_consumed_at is None or approval_consumed_at.tzinfo is None:
            raise ValueError("consumed approval requires a canonical consumption time")
        if approval_consumed_at.astimezone(timezone.utc) > occurred_at.astimezone(timezone.utc):
            raise ValueError("failure cannot precede approval consumption")
        consumed_at = _stamp(approval_consumed_at)
        if not isinstance(approval_marker_sha256, str) or not _DIGEST.fullmatch(
            approval_marker_sha256
        ):
            raise ValueError("consumed approval requires a marker digest")
    elif approval_consumed_at is not None:
        raise ValueError("unconsumed approval cannot have a consumption time")
    elif approval_marker_sha256 is not None:
        raise ValueError("unconsumed approval cannot have a marker digest")
    else:
        consumed_at = None
    return {
        "schema_version": FAILURE_SCHEMA,
        "evidence_mode": EVIDENCE_MODE,
        "status": "failed",
        "run_id": run_id,
        "commit": commit,
        "approval": {
            "approval_id": approval_id,
            "campaign_id": campaign_id,
            "approval_document_sha256": approval_document_sha256,
            "consumed": approval_consumed,
            "consumed_at": consumed_at,
            "marker_sha256": approval_marker_sha256,
        },
        "failure": {"phase": phase, "code": code, "occurred_at": _stamp(occurred_at)},
        "provider": {
            "create_disposition": disposition,
            "task_id": provider_task_id,
            "cancellation_disposition": cancellation_disposition,
        },
        "storage": {"owned_prefix": owned_prefix, "owned_keys": _validated_keys(owned_keys, owned_prefix)},
        "cleanup": cleanup,
        "provider_recovery_required": disposition == "attempted_unknown"
        or (disposition == "task_id_observed" and cancellation_disposition != "confirmed"),
        "recovery_required": cleanup["status"] != "complete"
        or disposition == "attempted_unknown"
        or (disposition == "task_id_observed" and cancellation_disposition != "confirmed"),
    }


def build_interrupted_failure_record(
    approval_marker: Mapping[str, Any],
    *,
    occurred_at: datetime,
    owned_prefix: str,
    owned_keys: Sequence[str] = (),
) -> dict[str, Any]:
    expected_marker_keys = {
        "schema_version",
        "campaign_id",
        "approval_id",
        "approval_document_sha256",
        "run_id",
        "commit",
        "consumed_at",
    }
    if not isinstance(approval_marker, dict) or set(approval_marker) != expected_marker_keys:
        raise ValueError("interrupted recovery requires a validated approval marker")
    try:
        consumed_at = datetime.strptime(
            approval_marker["consumed_at"], "%Y-%m-%dT%H:%M:%SZ"
        ).replace(tzinfo=timezone.utc)
    except (TypeError, ValueError) as exc:
        raise ValueError("interrupted recovery marker time is invalid") from exc
    if (
        approval_marker["schema_version"] != MARKER_SCHEMA
        or not _ID.fullmatch(str(approval_marker["campaign_id"]))
        or _stamp(consumed_at) != approval_marker["consumed_at"]
    ):
        raise ValueError("interrupted recovery marker is invalid")
    return build_failure_record(
        run_id=approval_marker["run_id"],
        commit=approval_marker["commit"],
        approval_id=approval_marker["approval_id"],
        approval_document_sha256=approval_marker["approval_document_sha256"],
        approval_consumed=True,
        approval_consumed_at=consumed_at,
        campaign_id=approval_marker["campaign_id"],
        approval_marker_sha256=hashlib.sha256(
            (json.dumps(approval_marker, separators=(",", ":"), sort_keys=True) + "\n").encode(
                "ascii"
            )
        ).hexdigest(),
        phase="interrupted",
        code="execution_interrupted",
        create_disposition="attempted_unknown",
        provider_task_id=None,
        cancellation_disposition="not_attempted",
        occurred_at=occurred_at,
        owned_prefix=owned_prefix,
        owned_keys=owned_keys,
        deleted_keys=(),
        residual_keys=owned_keys,
        absence_confirmed_keys=(),
        backend_closed=False,
        local_media_removed=False,
    )


def build_recovery_record(
    failure_record: Mapping[str, Any],
    *,
    recorded_at: datetime,
    deleted_keys: Sequence[str] = (),
    residual_keys: Sequence[str] = (),
    absence_confirmed_keys: Sequence[str] = (),
    backend_closed: bool,
    local_media_removed: bool,
) -> dict[str, Any]:
    _validate_failure_record(failure_record)
    prefix = str(failure_record.get("storage", {}).get("owned_prefix", ""))
    owned_keys = failure_record["storage"]["owned_keys"]
    cleanup = _cleanup(
        prefix=prefix,
        owned_keys=owned_keys,
        deleted_keys=deleted_keys,
        residual_keys=residual_keys,
        absence_confirmed_keys=absence_confirmed_keys,
        backend_closed=backend_closed,
        local_media_removed=local_media_removed,
    )
    complete = cleanup["status"] == "complete" and not failure_record[
        "provider_recovery_required"
    ]
    failure_time = datetime.strptime(
        failure_record["failure"]["occurred_at"], "%Y-%m-%dT%H:%M:%SZ"
    ).replace(tzinfo=timezone.utc)
    if recorded_at.tzinfo is None or recorded_at.astimezone(timezone.utc) < failure_time:
        raise ValueError("recovery evidence cannot precede its failure")
    return {
        "schema_version": RECOVERY_SCHEMA,
        "evidence_mode": EVIDENCE_MODE,
        "status": "recovered" if complete else "recovery_incomplete",
        "run_id": failure_record["run_id"],
        "commit": failure_record["commit"],
        "failure_record_sha256": hashlib.sha256(canonical_evidence_bytes(failure_record)).hexdigest(),
        "recorded_at": _stamp(recorded_at),
        "storage": {"owned_prefix": prefix, "owned_keys": owned_keys},
        "cleanup": cleanup,
        "provider_recovery_required": failure_record["provider_recovery_required"],
    }


def _validate_failure_record(record: Mapping[str, Any]) -> None:
    expected_keys = {
        "schema_version",
        "evidence_mode",
        "status",
        "run_id",
        "commit",
        "approval",
        "failure",
        "provider",
        "storage",
        "cleanup",
        "provider_recovery_required",
        "recovery_required",
    }
    if not isinstance(record, dict) or set(record) != expected_keys:
        raise ValueError("failure evidence shape is invalid")
    try:
        rebuilt = build_failure_record(
            run_id=record["run_id"],
            commit=record["commit"],
            approval_id=record["approval"]["approval_id"],
            approval_document_sha256=record["approval"]["approval_document_sha256"],
            approval_consumed=record["approval"]["consumed"],
            approval_consumed_at=(
                datetime.strptime(record["approval"]["consumed_at"], "%Y-%m-%dT%H:%M:%SZ").replace(
                    tzinfo=timezone.utc
                )
                if record["approval"]["consumed_at"] is not None
                else None
            ),
            campaign_id=record["approval"]["campaign_id"],
            approval_marker_sha256=record["approval"]["marker_sha256"],
            phase=record["failure"]["phase"],
            code=record["failure"]["code"],
            create_disposition=record["provider"]["create_disposition"],
            provider_task_id=record["provider"]["task_id"],
            cancellation_disposition=record["provider"]["cancellation_disposition"],
            occurred_at=datetime.strptime(
                record["failure"]["occurred_at"], "%Y-%m-%dT%H:%M:%SZ"
            ).replace(tzinfo=timezone.utc),
            owned_prefix=record["storage"]["owned_prefix"],
            owned_keys=record["storage"]["owned_keys"],
            deleted_keys=record["cleanup"]["deleted_keys"],
            residual_keys=record["cleanup"]["residual_keys"],
            absence_confirmed_keys=record["cleanup"]["absence_confirmed_keys"],
            backend_closed=record["cleanup"]["backend_closed"],
            local_media_removed=record["cleanup"]["local_media_removed"],
        )
    except (KeyError, TypeError, ValueError) as exc:
        raise ValueError("failure evidence is invalid") from exc
    if record != rebuilt:
        raise ValueError("failure evidence integrity is invalid")


def _validate_recovery_record(record: Mapping[str, Any]) -> None:
    expected_keys = {
        "schema_version",
        "evidence_mode",
        "status",
        "run_id",
        "commit",
        "failure_record_sha256",
        "recorded_at",
        "storage",
        "cleanup",
        "provider_recovery_required",
    }
    if not isinstance(record, dict) or set(record) != expected_keys:
        raise ValueError("recovery evidence shape is invalid")
    try:
        prefix = record["storage"]["owned_prefix"]
        owned_keys = record["storage"]["owned_keys"]
        if not _PREFIX.fullmatch(prefix):
            raise ValueError("recovery evidence prefix is invalid")
        cleanup = _cleanup(
            prefix=prefix,
            owned_keys=owned_keys,
            deleted_keys=record["cleanup"]["deleted_keys"],
            residual_keys=record["cleanup"]["residual_keys"],
            absence_confirmed_keys=record["cleanup"]["absence_confirmed_keys"],
            backend_closed=record["cleanup"]["backend_closed"],
            local_media_removed=record["cleanup"]["local_media_removed"],
        )
        recorded_at = datetime.strptime(record["recorded_at"], "%Y-%m-%dT%H:%M:%SZ").replace(
            tzinfo=timezone.utc
        )
        if _stamp(recorded_at) != record["recorded_at"]:
            raise ValueError("recovery evidence time is not canonical")
    except (KeyError, TypeError, ValueError) as exc:
        raise ValueError("recovery evidence is invalid") from exc
    expected_status = (
        "recovered"
        if cleanup["status"] == "complete" and record["provider_recovery_required"] is False
        else "recovery_incomplete"
    )
    if (
        record["schema_version"] != RECOVERY_SCHEMA
        or record["evidence_mode"] != EVIDENCE_MODE
        or record["status"] != expected_status
        or type(record["provider_recovery_required"]) is not bool
        or not _ID.fullmatch(str(record["run_id"]))
        or not _COMMIT.fullmatch(str(record["commit"]))
        or not _DIGEST.fullmatch(str(record["failure_record_sha256"]))
        or record["storage"]
        != {"owned_prefix": prefix, "owned_keys": _validated_keys(owned_keys, prefix)}
        or record["cleanup"] != cleanup
    ):
        raise ValueError("recovery evidence integrity is invalid")


def _read_failure_file(path: Path) -> tuple[Mapping[str, Any], bytes]:
    raw = read_private_file(path)
    try:
        record = json.loads(raw.decode("ascii", errors="strict"))
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise ValueError("failure source encoding is invalid") from exc
    _validate_failure_record(record)
    if raw != canonical_evidence_bytes(record):
        raise ValueError("failure source is not canonical")
    return record, raw


def write_private_evidence(
    path: Path,
    record: Mapping[str, Any],
    *,
    approval_journal: DurableApprovalJournal | None = None,
    failure_path: Path | None = None,
) -> None:
    if record.get("schema_version") == FAILURE_SCHEMA:
        _validate_failure_record(record)
        if record["approval"]["consumed"]:
            if approval_journal is None:
                raise ValueError("consumed failure evidence requires its approval marker")
            if approval_journal.campaign_id != record["approval"]["campaign_id"]:
                raise ValueError("failure evidence uses the wrong approval journal")
            marker_raw = approval_journal.marker_bytes(record["approval"]["approval_id"])
            marker = parse_marker_bytes(
                marker_raw,
                campaign_id=record["approval"]["campaign_id"],
                approval_id=record["approval"]["approval_id"],
            )
            if (
                hashlib.sha256(marker_raw).hexdigest() != record["approval"]["marker_sha256"]
                or marker["approval_document_sha256"]
                != record["approval"]["approval_document_sha256"]
                or marker["run_id"] != record["run_id"]
                or marker["commit"] != record["commit"]
                or marker["consumed_at"] != record["approval"]["consumed_at"]
            ):
                raise ValueError("failure evidence is not bound to its approval marker")
    elif record.get("schema_version") == RECOVERY_SCHEMA:
        _validate_recovery_record(record)
        if failure_path is None:
            raise ValueError("recovery evidence requires its immutable failure source")
        failure_record, failure_raw = _read_failure_file(failure_path)
        if (
            hashlib.sha256(failure_raw).hexdigest() != record["failure_record_sha256"]
            or failure_record["run_id"] != record["run_id"]
            or failure_record["commit"] != record["commit"]
            or failure_record["storage"] != record["storage"]
            or failure_record["provider_recovery_required"]
            != record["provider_recovery_required"]
        ):
            raise ValueError("recovery evidence is not bound to its failure source")
        recovery_time = datetime.strptime(record["recorded_at"], "%Y-%m-%dT%H:%M:%SZ").replace(
            tzinfo=timezone.utc
        )
        failure_time = datetime.strptime(
            failure_record["failure"]["occurred_at"], "%Y-%m-%dT%H:%M:%SZ"
        ).replace(tzinfo=timezone.utc)
        if recovery_time < failure_time:
            raise ValueError("recovery evidence cannot precede its bound failure")
    else:
        raise ValueError("private failure evidence schema is invalid")
    if not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9._-]{1,127}", path.name):
        raise ValueError("private evidence filename is invalid")
    directory_descriptor = open_owner_directory(path.parent)
    try:
        publish_immutable(directory_descriptor, path.name, canonical_evidence_bytes(record))
    finally:
        os.close(directory_descriptor)
