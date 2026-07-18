from __future__ import annotations

import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable

from .approval_journal import DurableApprovalJournal
from .b2_config import B2Config
from .preview_source_promotion import promote_preview_source, validate_source
from .preview_source_promotion_contract import (
    CAMPAIGN_ID,
    SourcePromotionApproval,
    build_private_result,
    parse_source_promotion_approval,
    write_private_result,
)
from .private_file_store import open_owner_directory


class OfflinePromotionBackend:
    """Exact fake accepted by the offline composition root; never performs I/O."""

    def __init__(
        self,
        *,
        corrupt_readback: bool = False,
        fail_delete: bool = False,
    ) -> None:
        self.objects: dict[str, bytes] = {}
        self.corrupt_readback = corrupt_readback
        self.fail_delete = fail_delete
        self.closed = False

    def exists(self, key: str) -> bool:
        return key in self.objects

    def put(self, key: str, data: bytes, **_: object) -> str:
        self.objects[key] = data
        return key

    def get(self, key: str) -> bytes:
        return b"corrupt" if self.corrupt_readback else self.objects[key]

    def delete(self, key: str) -> None:
        if self.fail_delete:
            raise RuntimeError("fixture cleanup failed")
        self.objects.pop(key, None)

    def close(self) -> None:
        self.closed = True


class OfflineSourcePromotionError(RuntimeError):
    pass


def _failure_code(error: BaseException) -> str:
    if isinstance(error, PermissionError):
        return "overwrite_refused"
    if "read-back" in str(error):
        return "readback_failed"
    return "storage_failed"


def run_offline_source_promotion(
    *,
    approval_bytes: bytes,
    run_id: str,
    commit: str,
    source_clean: bool,
    source_key: str,
    media: bytes,
    expected_sha256: str,
    config: B2Config,
    backend: OfflinePromotionBackend,
    approval_journal: DurableApprovalJournal,
    result_path: Path,
    clock: Callable[[], datetime] = lambda: datetime.now(timezone.utc),
    result_writer: Callable[..., None] = write_private_result,
) -> dict[str, Any]:
    """Exercise the complete approval/evidence lifecycle with an exact memory fake."""

    if type(backend) is not OfflinePromotionBackend:
        raise PermissionError("offline source promotion accepts only its exact memory backend")
    if approval_journal.campaign_id != CAMPAIGN_ID:
        raise PermissionError("offline source promotion requires the campaign approval journal")
    if not source_clean:
        raise PermissionError("offline source promotion requires a clean pinned source")
    if result_path.exists() or result_path.is_symlink():
        raise FileExistsError("private source-promotion result already exists")
    directory_descriptor = open_owner_directory(result_path.parent)
    os.close(directory_descriptor)
    validate_source(source_key, media, expected_sha256)
    if backend.exists(source_key):
        raise PermissionError("offline source promotion refuses an existing source before approval")
    started_at = clock()
    approval = parse_source_promotion_approval(
        approval_bytes,
        expected_run_id=run_id,
        expected_commit=commit,
        expected_source_key=source_key,
        expected_source_sha256=expected_sha256,
        expected_source_size_bytes=len(media),
        at=started_at,
    )
    approval_journal.consume(approval, started_at)
    marker = approval_journal.read_marker(approval.approval_id)
    try:
        outcome = promote_preview_source(
            config,
            source_key=source_key,
            media=media,
            expected_sha256=expected_sha256,
            backend_factory=lambda _: backend,
        )
    except BaseException as error:
        cleanup_confirmed = not backend.exists(source_key)
        record = build_private_result(
            approval=approval,
            approval_marker=marker,
            recorded_at=clock(),
            outcome=None,
            failure_phase="storage",
            failure_code=_failure_code(error),
            cleanup_confirmed=cleanup_confirmed,
            evidence_mode="fixture_non_attestable",
        )
        result_writer(result_path, record, approval_journal=approval_journal)
        raise OfflineSourcePromotionError(
            "offline source promotion failed; private non-attestable evidence was written"
        ) from error
    record = build_private_result(
        approval=approval,
        approval_marker=marker,
        recorded_at=clock(),
        outcome=outcome,
        evidence_mode="fixture_non_attestable",
    )
    result_writer(result_path, record, approval_journal=approval_journal)
    return record


def recover_interrupted_offline_promotion(
    *,
    approval: SourcePromotionApproval,
    approval_journal: DurableApprovalJournal,
    backend: OfflinePromotionBackend,
    result_path: Path,
    recorded_at: datetime,
) -> dict[str, Any]:
    """Conservatively records a consumed fixture run whose terminal write was interrupted."""

    if type(backend) is not OfflinePromotionBackend:
        raise PermissionError("offline recovery accepts only its exact memory backend")
    marker = approval_journal.read_marker(approval.approval_id)
    record = build_private_result(
        approval=approval,
        approval_marker=marker,
        recorded_at=recorded_at,
        outcome=None,
        failure_phase="storage",
        failure_code="terminal_write_interrupted",
        cleanup_confirmed=not backend.exists(approval.source_key),
        evidence_mode="fixture_non_attestable",
    )
    write_private_result(result_path, record, approval_journal=approval_journal)
    return record
