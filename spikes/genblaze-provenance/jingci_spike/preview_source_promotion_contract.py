from __future__ import annotations

import hashlib
import json
import os
import re
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Mapping

from .approval_journal import MARKER_SCHEMA, DurableApprovalJournal
from .preview_source_promotion import MAX_SOURCE_BYTES, SOURCE_KEY_PATTERN, SourcePromotionResult
from .private_file_store import open_owner_directory, publish_immutable


APPROVAL_SCHEMA = "jingci.preview-source-promotion-approval.v1"
RESULT_SCHEMA = "jingci.preview-source-promotion-private-result.v1"
APPROVAL_SCOPE = "b2_private_preview_source_promotion"
CONFIRMATION = "PROMOTE ONE REVIEWED SOURCE TO PRIVATE B2"
CAMPAIGN_ID = "backblaze-genmedia-2026"
_ID = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._:-]{2,127}$")
_ACTOR = re.compile(r"^[A-Za-z0-9][A-Za-z0-9 ._@+-]{1,127}$")
_COMMIT = re.compile(r"^[0-9a-f]{40}$")
_DIGEST = re.compile(r"^[0-9a-f]{64}$")


@dataclass(frozen=True)
class SourcePromotionApproval:
    approval_id: str
    run_id: str
    commit: str
    human_actor: str
    approved_at: datetime
    expires_at: datetime
    maximum_attempts: int
    document_sha256: str
    source_key: str
    source_sha256: str
    source_size_bytes: int


def _stamp(value: datetime) -> str:
    if value.tzinfo is None:
        raise ValueError("clock must be timezone-aware")
    return value.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _utc(value: object) -> datetime:
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


def _canonical_bytes(value: Mapping[str, Any]) -> bytes:
    return (json.dumps(value, indent=2, separators=(",", ": "), ensure_ascii=True) + "\n").encode(
        "ascii"
    )


def parse_source_promotion_approval(
    raw: bytes,
    *,
    expected_run_id: str,
    expected_commit: str,
    expected_source_key: str,
    expected_source_sha256: str,
    expected_source_size_bytes: int,
    at: datetime,
) -> SourcePromotionApproval:
    if not raw or len(raw) > 32 * 1024 or b"\x00" in raw:
        raise ValueError("source-promotion approval document size is invalid")
    try:
        payload = json.loads(raw.decode("ascii", errors="strict"))
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise ValueError("source-promotion approval must be ASCII JSON") from exc
    expected_keys = {
        "schema_version",
        "approval_id",
        "run_id",
        "commit",
        "human_actor",
        "approved_at",
        "expires_at",
        "maximum_attempts",
        "confirmation",
        "scope",
        "source_key",
        "source_sha256",
        "source_size_bytes",
    }
    if not isinstance(payload, dict) or set(payload) != expected_keys or raw != _canonical_bytes(payload):
        raise ValueError("source-promotion approval shape or canonical encoding is invalid")
    if payload["schema_version"] != APPROVAL_SCHEMA:
        raise ValueError("source-promotion approval schema is invalid")
    if payload["scope"] != APPROVAL_SCOPE or payload["confirmation"] != CONFIRMATION:
        raise PermissionError("source-promotion approval authority is invalid")
    if payload["maximum_attempts"] != 1:
        raise PermissionError("source-promotion approval must authorize exactly one attempt")
    if not _ID.fullmatch(str(payload["approval_id"])) or not _ACTOR.fullmatch(
        str(payload["human_actor"])
    ):
        raise ValueError("source-promotion approval identity is invalid")
    if not _ID.fullmatch(expected_run_id) or not _COMMIT.fullmatch(expected_commit):
        raise ValueError("source-promotion run or commit identity is invalid")
    if payload["run_id"] != expected_run_id or payload["commit"] != expected_commit:
        raise PermissionError("source-promotion approval is not bound to this run and commit")
    if (
        payload["source_key"] != expected_source_key
        or payload["source_sha256"] != expected_source_sha256
        or payload["source_size_bytes"] != expected_source_size_bytes
    ):
        raise PermissionError("source-promotion approval is not bound to the reviewed source")
    if not SOURCE_KEY_PATTERN.fullmatch(expected_source_key) or not _DIGEST.fullmatch(
        expected_source_sha256
    ):
        raise ValueError("source-promotion source identity is invalid")
    if (
        type(expected_source_size_bytes) is not int
        or not 1 <= expected_source_size_bytes <= MAX_SOURCE_BYTES
    ):
        raise ValueError("source-promotion source size is invalid")
    approved_at = _utc(payload["approved_at"])
    expires_at = _utc(payload["expires_at"])
    if at.tzinfo is None:
        raise ValueError("approval clock must be timezone-aware")
    instant = at.astimezone(timezone.utc)
    if not approved_at <= instant < expires_at:
        raise PermissionError("source-promotion approval is not active")
    return SourcePromotionApproval(
        approval_id=payload["approval_id"],
        run_id=payload["run_id"],
        commit=payload["commit"],
        human_actor=payload["human_actor"],
        approved_at=approved_at,
        expires_at=expires_at,
        maximum_attempts=1,
        document_sha256=hashlib.sha256(raw).hexdigest(),
        source_key=payload["source_key"],
        source_sha256=payload["source_sha256"],
        source_size_bytes=payload["source_size_bytes"],
    )


def build_private_result(
    *,
    approval: SourcePromotionApproval,
    approval_marker: Mapping[str, Any],
    recorded_at: datetime,
    outcome: SourcePromotionResult | None,
    failure_phase: str | None = None,
    failure_code: str | None = None,
    cleanup_confirmed: bool | None = None,
) -> dict[str, Any]:
    marker_keys = {
        "schema_version",
        "campaign_id",
        "approval_id",
        "approval_document_sha256",
        "run_id",
        "commit",
        "consumed_at",
    }
    if not isinstance(approval_marker, dict) or set(approval_marker) != marker_keys:
        raise ValueError("source-promotion result requires a validated approval marker")
    if (
        approval_marker["schema_version"] != MARKER_SCHEMA
        or approval_marker["campaign_id"] != CAMPAIGN_ID
        or approval_marker["approval_id"] != approval.approval_id
        or approval_marker["approval_document_sha256"] != approval.document_sha256
        or approval_marker["run_id"] != approval.run_id
        or approval_marker["commit"] != approval.commit
    ):
        raise ValueError("source-promotion result is not bound to its approval marker")
    consumed_at = _utc(approval_marker["consumed_at"])
    if recorded_at.tzinfo is None or recorded_at.astimezone(timezone.utc) < consumed_at:
        raise ValueError("source-promotion result cannot precede approval consumption")

    if outcome is not None:
        if any(value is not None for value in (failure_phase, failure_code, cleanup_confirmed)):
            raise ValueError("passed source-promotion result cannot include failure state")
        if (
            outcome.schema_version != "jingci.preview-source-promotion-result.v1"
            or outcome.status != "passed"
            or not outcome.retained
            or outcome.source_key != approval.source_key
            or outcome.source_sha256 != approval.source_sha256
            or outcome.source_size_bytes != approval.source_size_bytes
        ):
            raise ValueError("source-promotion outcome is not bound to its approval")
        status = "passed"
        retained = True
        recovery_required = False
        failure = None
    else:
        if failure_phase not in {"approval", "preflight", "storage"}:
            raise ValueError("source-promotion failure phase is invalid")
        if not isinstance(failure_code, str) or not _ID.fullmatch(failure_code):
            raise ValueError("source-promotion failure code is invalid")
        if type(cleanup_confirmed) is not bool:
            raise ValueError("source-promotion cleanup state is required")
        status = "failed_compensated" if cleanup_confirmed else "recovery_required"
        retained = False
        recovery_required = not cleanup_confirmed
        failure = {"phase": failure_phase, "code": failure_code}

    marker_sha256 = hashlib.sha256(
        (json.dumps(approval_marker, separators=(",", ":"), sort_keys=True) + "\n").encode("ascii")
    ).hexdigest()
    record = {
        "schema_version": RESULT_SCHEMA,
        "status": status,
        "recorded_at": _stamp(recorded_at),
        "run_id": approval.run_id,
        "source": {
            "commit": approval.commit,
            "key": approval.source_key,
            "sha256": approval.source_sha256,
            "size_bytes": approval.source_size_bytes,
        },
        "approval": {
            "approval_id": approval.approval_id,
            "document_sha256": approval.document_sha256,
            "marker_sha256": marker_sha256,
            "consumed_at": approval_marker["consumed_at"],
        },
        "storage": {
            "backend": "backblaze_b2",
            "private": True,
            "retained": retained,
            "readback_verified": outcome is not None,
        },
        "failure": failure,
        "recovery_required": recovery_required,
        "authorizations": {
            "deployment": False,
            "publication": False,
            "submission": False,
            "paid_api": False,
        },
    }
    _validate_private_result(record)
    return record


def _validate_private_result(record: Mapping[str, Any]) -> None:
    expected_keys = {
        "schema_version",
        "status",
        "recorded_at",
        "run_id",
        "source",
        "approval",
        "storage",
        "failure",
        "recovery_required",
        "authorizations",
    }
    if not isinstance(record, dict) or set(record) != expected_keys:
        raise ValueError("private source-promotion result shape is invalid")
    source = record["source"]
    approval = record["approval"]
    storage = record["storage"]
    authorizations = record["authorizations"]
    if (
        record["schema_version"] != RESULT_SCHEMA
        or record["status"] not in {"passed", "failed_compensated", "recovery_required"}
        or not _ID.fullmatch(str(record["run_id"]))
        or not isinstance(source, dict)
        or set(source) != {"commit", "key", "sha256", "size_bytes"}
        or not _COMMIT.fullmatch(str(source["commit"]))
        or not SOURCE_KEY_PATTERN.fullmatch(str(source["key"]))
        or not _DIGEST.fullmatch(str(source["sha256"]))
        or type(source["size_bytes"]) is not int
        or not 1 <= source["size_bytes"] <= MAX_SOURCE_BYTES
        or not isinstance(approval, dict)
        or set(approval) != {
            "approval_id",
            "document_sha256",
            "marker_sha256",
            "consumed_at",
        }
        or not _ID.fullmatch(str(approval["approval_id"]))
        or not _DIGEST.fullmatch(str(approval["document_sha256"]))
        or not _DIGEST.fullmatch(str(approval["marker_sha256"]))
        or not isinstance(storage, dict)
        or set(storage) != {"backend", "private", "retained", "readback_verified"}
        or storage["backend"] != "backblaze_b2"
        or storage["private"] is not True
        or not isinstance(authorizations, dict)
        or set(authorizations) != {"deployment", "publication", "submission", "paid_api"}
        or any(value is not False for value in authorizations.values())
        or type(record["recovery_required"]) is not bool
    ):
        raise ValueError("private source-promotion result integrity is invalid")
    _utc(record["recorded_at"])
    _utc(approval["consumed_at"])
    expected_state = {
        "passed": (True, True, False, None),
        "failed_compensated": (False, False, False, "failure"),
        "recovery_required": (False, False, True, "failure"),
    }[record["status"]]
    retained, readback, recovery_required, failure_mode = expected_state
    failure = record["failure"]
    if (
        storage["retained"] is not retained
        or storage["readback_verified"] is not readback
        or record["recovery_required"] is not recovery_required
        or (failure_mode is None and failure is not None)
        or (
            failure_mode == "failure"
            and (
                not isinstance(failure, dict)
                or set(failure) != {"phase", "code"}
                or failure["phase"] not in {"approval", "preflight", "storage"}
                or not _ID.fullmatch(str(failure["code"]))
            )
        )
    ):
        raise ValueError("private source-promotion result state is invalid")


def write_private_result(
    path: Path,
    record: Mapping[str, Any],
    *,
    approval_journal: DurableApprovalJournal,
) -> None:
    _validate_private_result(record)
    if approval_journal.campaign_id != CAMPAIGN_ID:
        raise ValueError("private source-promotion result uses the wrong approval journal")
    approval = record["approval"]
    marker_raw = approval_journal.marker_bytes(approval["approval_id"])
    marker = approval_journal.read_marker(approval["approval_id"])
    if (
        hashlib.sha256(marker_raw).hexdigest() != approval["marker_sha256"]
        or marker["approval_document_sha256"] != approval["document_sha256"]
        or marker["run_id"] != record["run_id"]
        or marker["commit"] != record["source"]["commit"]
        or marker["consumed_at"] != approval["consumed_at"]
    ):
        raise ValueError("private source-promotion result is not bound to its durable marker")
    payload = _canonical_bytes(record)
    directory_descriptor = open_owner_directory(path.parent)
    try:
        publish_immutable(directory_descriptor, path.name, payload)
    finally:
        os.close(directory_descriptor)
