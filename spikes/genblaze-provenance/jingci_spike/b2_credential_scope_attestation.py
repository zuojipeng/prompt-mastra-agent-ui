from __future__ import annotations

import hashlib
import json
import os
import re
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Mapping

from .private_file_store import open_owner_directory, publish_immutable


ATTESTATION_SCHEMA = "jingci.b2-credential-scope-attestation.v1"
INSPECTION_SCHEMA = "jingci.b2-credential-scope-inspection.v1"
CAMPAIGN_ID = "backblaze-genmedia-2026"
AUTHORITY = "credential_scope_evidence_only"
SOURCE_PREFIX = "jingci-preview/"
REQUIRED_CAPABILITIES = frozenset(
    {
        "deleteFiles",
        "listAllBucketNames",
        "listBuckets",
        "listFiles",
        "readFiles",
        "writeFiles",
    }
)
ALLOWED_CAPABILITIES = REQUIRED_CAPABILITIES | {
    "readBuckets",
    "readBucketEncryption",
    "readBucketRetentions",
    "readFileLegalHolds",
    "readFileRetentions",
}
INSPECTION_METHODS = {"b2_authorize_account_allowed", "backblaze_console"}
_ID = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._:-]{2,127}$")
_ACTOR = re.compile(r"^[A-Za-z0-9][A-Za-z0-9 ._@+-]{1,127}$")
_DIGEST = re.compile(r"^[0-9a-f]{64}$")
_BUCKET = re.compile(r"^[a-z0-9][a-z0-9.-]{4,61}[a-z0-9]$")
_REGION = re.compile(r"^[a-z]{2}-[a-z]+-[0-9]{3}$")
_POLICY_ERRORS = {
    "prefix_mismatch",
    "missing_required_capabilities",
    "dangerous_or_unnecessary_capabilities",
}


@dataclass(frozen=True)
class B2CredentialScopeAttestation:
    review_id: str
    reviewer: str
    inspected_at: datetime
    expires_at: datetime
    bucket: str
    region: str
    name_prefix: str
    capabilities: tuple[str, ...]
    key_id_sha256: str
    document_sha256: str


def build_b2_scope_inspection_record(
    *,
    inspection_id: str,
    inspected_at: datetime,
    bucket: str,
    region: str,
    name_prefix: str | None,
    capabilities: list[str],
    key_id: str,
) -> dict[str, Any]:
    if not _ID.fullmatch(inspection_id) or not _BUCKET.fullmatch(bucket) or not _REGION.fullmatch(
        region
    ):
        raise ValueError("credential-scope inspection identity is invalid")
    if inspected_at.tzinfo is None:
        raise ValueError("credential-scope inspection clock must be timezone-aware")
    if (
        not capabilities
        or any(not isinstance(item, str) for item in capabilities)
        or capabilities != sorted(set(capabilities))
    ):
        raise ValueError("credential-scope inspection capabilities must be sorted and unique")
    capability_set = set(capabilities)
    policy_errors: list[str] = []
    if name_prefix != SOURCE_PREFIX:
        policy_errors.append("prefix_mismatch")
    if not REQUIRED_CAPABILITIES <= capability_set:
        policy_errors.append("missing_required_capabilities")
    if not capability_set <= ALLOWED_CAPABILITIES:
        policy_errors.append("dangerous_or_unnecessary_capabilities")
    policy_errors.sort()
    return {
        "schema_version": INSPECTION_SCHEMA,
        "campaign_id": CAMPAIGN_ID,
        "inspection_id": inspection_id,
        "inspected_at": _stamp(inspected_at),
        "bucket": bucket,
        "region": region,
        "name_prefix": name_prefix,
        "capabilities": capabilities,
        "key_id_sha256": hashlib.sha256(key_id.encode("utf-8")).hexdigest(),
        "policy_status": "passed" if not policy_errors else "rejected",
        "policy_errors": policy_errors,
        "secret_value_recorded": False,
        "authorization_token_recorded": False,
        "execution_authorized": False,
    }


def write_private_b2_scope_inspection(path: Path, record: Mapping[str, Any]) -> None:
    expected_keys = {
        "schema_version",
        "campaign_id",
        "inspection_id",
        "inspected_at",
        "bucket",
        "region",
        "name_prefix",
        "capabilities",
        "key_id_sha256",
        "policy_status",
        "policy_errors",
        "secret_value_recorded",
        "authorization_token_recorded",
        "execution_authorized",
    }
    if not isinstance(record, dict) or set(record) != expected_keys:
        raise ValueError("credential-scope inspection record shape is invalid")
    capabilities = record["capabilities"]
    errors = record["policy_errors"]
    if (
        record["schema_version"] != INSPECTION_SCHEMA
        or record["campaign_id"] != CAMPAIGN_ID
        or not _ID.fullmatch(str(record["inspection_id"]))
        or not _BUCKET.fullmatch(str(record["bucket"]))
        or not _REGION.fullmatch(str(record["region"]))
        or record["name_prefix"] is not None
        and not isinstance(record["name_prefix"], str)
        or not isinstance(capabilities, list)
        or not capabilities
        or any(not isinstance(item, str) for item in capabilities)
        or capabilities != sorted(set(capabilities))
        or not _DIGEST.fullmatch(str(record["key_id_sha256"]))
        or record["policy_status"] not in {"passed", "rejected"}
        or not isinstance(errors, list)
        or errors != sorted(set(errors))
        or any(error not in _POLICY_ERRORS for error in errors)
        or (record["policy_status"] == "passed") != (not errors)
        or record["secret_value_recorded"] is not False
        or record["authorization_token_recorded"] is not False
        or record["execution_authorized"] is not False
    ):
        raise ValueError("credential-scope inspection record integrity is invalid")
    _utc(record["inspected_at"])
    payload = _canonical_bytes(record)
    directory = open_owner_directory(path.parent)
    try:
        publish_immutable(directory, path.name, payload)
    finally:
        os.close(directory)


def _stamp(value: datetime) -> str:
    if value.tzinfo is None:
        raise ValueError("credential-scope clock must be timezone-aware")
    return value.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _utc(value: object) -> datetime:
    if not isinstance(value, str) or not re.fullmatch(
        r"[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}Z", value
    ):
        raise ValueError("credential-scope timestamps must be canonical UTC seconds")
    try:
        parsed = datetime.strptime(value, "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=timezone.utc)
    except ValueError as exc:
        raise ValueError("credential-scope timestamp is invalid") from exc
    if _stamp(parsed) != value:
        raise ValueError("credential-scope timestamp is not canonical")
    return parsed


def _canonical_bytes(value: Mapping[str, Any]) -> bytes:
    return (json.dumps(value, indent=2, separators=(",", ": "), ensure_ascii=True) + "\n").encode(
        "ascii"
    )


def parse_b2_credential_scope_attestation(
    raw: bytes,
    *,
    expected_bucket: str,
    expected_region: str,
    expected_key_id: str,
    at: datetime,
) -> B2CredentialScopeAttestation:
    if not raw or len(raw) > 32 * 1024 or b"\x00" in raw:
        raise ValueError("credential-scope attestation size is invalid")
    try:
        payload = json.loads(raw.decode("ascii", errors="strict"))
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise ValueError("credential-scope attestation must be ASCII JSON") from exc
    expected_keys = {
        "schema_version",
        "campaign_id",
        "review_id",
        "reviewer",
        "inspected_at",
        "expires_at",
        "inspection_method",
        "bucket",
        "region",
        "name_prefix",
        "capabilities",
        "key_id_sha256",
        "secret_value_recorded",
        "authority",
        "execution_authorized",
    }
    if not isinstance(payload, dict) or set(payload) != expected_keys or raw != _canonical_bytes(payload):
        raise ValueError("credential-scope attestation shape or canonical encoding is invalid")
    if payload["schema_version"] != ATTESTATION_SCHEMA or payload["campaign_id"] != CAMPAIGN_ID:
        raise ValueError("credential-scope attestation identity is invalid")
    if (
        payload["authority"] != AUTHORITY
        or payload["execution_authorized"] is not False
        or payload["secret_value_recorded"] is not False
    ):
        raise PermissionError("credential-scope attestation cannot authorize execution or carry secrets")
    if payload["inspection_method"] not in INSPECTION_METHODS:
        raise ValueError("credential-scope inspection method is invalid")
    if not _ID.fullmatch(str(payload["review_id"])) or not _ACTOR.fullmatch(
        str(payload["reviewer"])
    ):
        raise ValueError("credential-scope reviewer identity is invalid")
    if not _BUCKET.fullmatch(expected_bucket) or not _REGION.fullmatch(expected_region):
        raise ValueError("credential-scope expected target is invalid")
    if payload["bucket"] != expected_bucket or payload["region"] != expected_region:
        raise PermissionError("credential-scope attestation is not bound to the target storage")
    if payload["name_prefix"] != SOURCE_PREFIX:
        raise PermissionError("credential scope must be restricted to the campaign preview prefix")
    expected_key_digest = hashlib.sha256(expected_key_id.encode("utf-8")).hexdigest()
    if not _DIGEST.fullmatch(str(payload["key_id_sha256"])) or payload[
        "key_id_sha256"
    ] != expected_key_digest:
        raise PermissionError("credential-scope attestation is not bound to the configured key")
    capabilities = payload["capabilities"]
    if (
        not isinstance(capabilities, list)
        or not capabilities
        or any(not isinstance(item, str) for item in capabilities)
        or capabilities != sorted(set(capabilities))
    ):
        raise ValueError("credential-scope capabilities must be a sorted unique list")
    capability_set = set(capabilities)
    if not REQUIRED_CAPABILITIES <= capability_set:
        raise PermissionError("credential scope is missing required file capabilities")
    if not capability_set <= ALLOWED_CAPABILITIES:
        raise PermissionError("credential scope contains unnecessary or dangerous capabilities")
    inspected_at = _utc(payload["inspected_at"])
    expires_at = _utc(payload["expires_at"])
    if at.tzinfo is None:
        raise ValueError("credential-scope clock must be timezone-aware")
    instant = at.astimezone(timezone.utc)
    if not inspected_at <= instant < expires_at:
        raise PermissionError("credential-scope attestation is not active")
    if expires_at - inspected_at > timedelta(hours=24):
        raise PermissionError("credential-scope attestation lifetime exceeds 24 hours")
    return B2CredentialScopeAttestation(
        review_id=payload["review_id"],
        reviewer=payload["reviewer"],
        inspected_at=inspected_at,
        expires_at=expires_at,
        bucket=payload["bucket"],
        region=payload["region"],
        name_prefix=payload["name_prefix"],
        capabilities=tuple(capabilities),
        key_id_sha256=payload["key_id_sha256"],
        document_sha256=hashlib.sha256(raw).hexdigest(),
    )
