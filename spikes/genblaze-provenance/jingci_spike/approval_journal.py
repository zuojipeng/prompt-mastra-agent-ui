from __future__ import annotations

import errno
import hashlib
import json
import os
import re
import stat
from datetime import datetime, timezone
from pathlib import Path
from typing import TYPE_CHECKING, Any, Callable, Mapping

from .private_file_store import open_owner_directory, publish_immutable, read_private_file

if TYPE_CHECKING:
    from .live_runway_b2_transaction import LiveApproval


MARKER_SCHEMA = "jingci.local-approval-consumption.v1"
_ID = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._:-]{2,127}$")
_COMMIT = re.compile(r"^[0-9a-f]{40}$")
_DIGEST = re.compile(r"^[0-9a-f]{64}$")


class ApprovalJournalError(RuntimeError):
    pass


def marker_filename(campaign_id: str, approval_id: str) -> str:
    if not _ID.fullmatch(campaign_id) or not _ID.fullmatch(approval_id):
        raise ValueError("approval marker identity is invalid")
    identity = f"{campaign_id}\0{approval_id}".encode("ascii")
    return f"{hashlib.sha256(identity).hexdigest()}.json"


def _canonical_bytes(value: Mapping[str, Any]) -> bytes:
    return (json.dumps(value, separators=(",", ":"), sort_keys=True, ensure_ascii=True) + "\n").encode(
        "ascii"
    )


def _stamp(value: datetime) -> str:
    if value.tzinfo is None:
        raise ValueError("journal clock must be timezone-aware")
    return value.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def parse_marker_bytes(raw: bytes, *, campaign_id: str, approval_id: str) -> dict[str, Any]:
    expected_keys = {
        "schema_version",
        "campaign_id",
        "approval_id",
        "approval_document_sha256",
        "run_id",
        "commit",
        "consumed_at",
    }
    try:
        record = json.loads(raw.decode("ascii", errors="strict"))
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise ApprovalJournalError("approval marker encoding is invalid") from exc
    if not isinstance(record, dict) or set(record) != expected_keys or raw != _canonical_bytes(record):
        raise ApprovalJournalError("approval marker shape or encoding is invalid")
    try:
        consumed_at = datetime.strptime(record["consumed_at"], "%Y-%m-%dT%H:%M:%SZ").replace(
            tzinfo=timezone.utc
        )
    except (TypeError, ValueError) as exc:
        raise ApprovalJournalError("approval marker timestamp is invalid") from exc
    if (
        record["schema_version"] != MARKER_SCHEMA
        or record["campaign_id"] != campaign_id
        or record["approval_id"] != approval_id
        or not isinstance(record["run_id"], str)
        or not _ID.fullmatch(record["run_id"])
        or not isinstance(record["commit"], str)
        or not _COMMIT.fullmatch(record["commit"])
        or not isinstance(record["approval_document_sha256"], str)
        or not _DIGEST.fullmatch(record["approval_document_sha256"])
        or _stamp(consumed_at) != record["consumed_at"]
    ):
        raise ApprovalJournalError("approval marker integrity is invalid")
    return record


class DurableApprovalJournal:
    """Immutable local at-most-once approval markers for POSIX filesystems."""

    def __init__(
        self,
        private_directory: Path,
        *,
        campaign_id: str,
        clock: Callable[[], datetime] = lambda: datetime.now(timezone.utc),
    ) -> None:
        if not _ID.fullmatch(campaign_id):
            raise ValueError("approval journal campaign identity is invalid")
        self.private_directory = private_directory
        self.campaign_id = campaign_id
        self.clock = clock

    def _open_directory(self) -> int:
        try:
            return open_owner_directory(self.private_directory)
        except PermissionError:
            raise
        except OSError as exc:
            raise ApprovalJournalError("approval journal directory is unsafe") from exc

    def _marker_name(self, approval_id: str) -> str:
        return marker_filename(self.campaign_id, approval_id)

    def consume(self, approval: LiveApproval, at: datetime) -> None:
        if at.tzinfo is None:
            raise ValueError("journal clock must be timezone-aware")
        instant = at.astimezone(timezone.utc)
        if not approval.approved_at <= instant < approval.expires_at:
            raise PermissionError("one-shot approval is not active")
        marker_name = self._marker_name(approval.approval_id)
        record = {
            "schema_version": MARKER_SCHEMA,
            "campaign_id": self.campaign_id,
            "approval_id": approval.approval_id,
            "approval_document_sha256": approval.document_sha256,
            "run_id": approval.run_id,
            "commit": approval.commit,
            "consumed_at": _stamp(instant),
        }
        directory_descriptor = self._open_directory()
        try:
            try:
                publish_immutable(directory_descriptor, marker_name, _canonical_bytes(record))
            except OSError as exc:
                if exc.errno == errno.EEXIST:
                    raise PermissionError("one-shot approval was already consumed") from None
                raise ApprovalJournalError("approval marker publication failed") from exc
            after_publication = self.clock()
            if after_publication.tzinfo is None:
                raise ValueError("journal clock must be timezone-aware")
            after_publication = after_publication.astimezone(timezone.utc)
            if after_publication < instant:
                raise PermissionError("clock regressed after durable consumption")
            if after_publication >= approval.expires_at:
                raise PermissionError("one-shot approval expired after durable consumption")
        finally:
            os.close(directory_descriptor)

    def marker_bytes(self, approval_id: str) -> bytes:
        if not _ID.fullmatch(approval_id):
            raise ValueError("approval identity is invalid")
        try:
            return read_private_file(
                self.private_directory / self._marker_name(approval_id), maximum_bytes=32 * 1024
            )
        except FileNotFoundError:
            raise ApprovalJournalError("approval marker does not exist") from None

    def read_marker(self, approval_id: str) -> Mapping[str, Any]:
        return parse_marker_bytes(
            self.marker_bytes(approval_id), campaign_id=self.campaign_id, approval_id=approval_id
        )
