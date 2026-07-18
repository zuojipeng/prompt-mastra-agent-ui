from __future__ import annotations

import hashlib
import json
import re
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any, Mapping


ATTESTATION_SCHEMA = "jingci.b2-credential-scope-attestation.v1"
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
