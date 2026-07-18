from __future__ import annotations

import hashlib
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable

from .approval_journal import DurableApprovalJournal
from .b2_config import B2Config, build_live_backblaze_backend
from .preview_source_live_plan import load_plan, validate_plan
from .preview_source_promotion import promote_preview_source, validate_source
from .preview_source_promotion_contract import (
    CAMPAIGN_ID,
    build_private_result,
    parse_source_promotion_approval,
    write_private_result,
)
from .private_file_store import open_owner_directory, read_private_file


class GuardedSourcePromotionError(RuntimeError):
    """Stable failure that suppresses raw backend, path, and credential-adjacent details."""


def _validate_config(config: B2Config, *, expected_bucket: str, expected_region: str) -> None:
    if (
        config.bucket != expected_bucket
        or config.region != expected_region
        or not config.key_id.strip()
        or not config.app_key.strip()
    ):
        raise PermissionError("source-promotion B2 configuration does not match the approved target")


def _write_terminal_result(
    result_writer: Callable[..., None],
    result_path: Path,
    record: dict[str, Any],
    approval_journal: DurableApprovalJournal,
) -> None:
    try:
        result_writer(result_path, record, approval_journal=approval_journal)
    except BaseException:
        raise GuardedSourcePromotionError(
            "source-promotion terminal evidence write failed; approval state must be recovered"
        ) from None


def _evidence_mode(backend_factory: Callable[[B2Config], Any]) -> str:
    return (
        "live_private"
        if backend_factory is build_live_backblaze_backend
        else "fixture_non_attestable"
    )


def run_guarded_source_promotion(
    *,
    run_id: str,
    commit: str,
    source_clean: bool,
    source_key: str,
    expected_bucket: str,
    expected_region: str,
    approval_path: Path,
    source_media_path: Path,
    result_path: Path,
    approval_journal: DurableApprovalJournal,
    config_loader: Callable[[], B2Config],
    backend_factory: Callable[[B2Config], Any] = build_live_backblaze_backend,
    clock: Callable[[], datetime] = lambda: datetime.now(timezone.utc),
    result_writer: Callable[..., None] = write_private_result,
) -> dict[str, Any]:
    """Run the reviewed adapter when an external human gate explicitly invokes it.

    This module deliberately has no CLI and never reads process environment values.
    """

    plan_errors = validate_plan(load_plan())
    if plan_errors:
        raise PermissionError("source-promotion live plan is not valid")
    if approval_journal.campaign_id != CAMPAIGN_ID:
        raise PermissionError("source promotion requires the campaign approval journal")
    if not source_clean:
        raise PermissionError("source promotion requires a clean pinned source")
    if result_path.exists() or result_path.is_symlink():
        raise FileExistsError("private source-promotion result already exists")
    directory_descriptor = open_owner_directory(result_path.parent)
    os.close(directory_descriptor)

    approval_bytes = read_private_file(approval_path, maximum_bytes=32 * 1024)
    media = read_private_file(source_media_path, maximum_bytes=100_000_000)
    digest = validate_source(source_key, media, hashlib.sha256(media).hexdigest())
    started_at = clock()
    approval = parse_source_promotion_approval(
        approval_bytes,
        expected_run_id=run_id,
        expected_commit=commit,
        expected_source_key=source_key,
        expected_source_sha256=digest,
        expected_source_size_bytes=len(media),
        expected_bucket=expected_bucket,
        expected_region=expected_region,
        at=started_at,
    )

    try:
        config = config_loader()
        _validate_config(config, expected_bucket=approval.bucket, expected_region=approval.region)
    except BaseException:
        raise GuardedSourcePromotionError(
            "source-promotion configuration preflight failed before approval consumption"
        ) from None
    evidence_mode = _evidence_mode(backend_factory)
    backend: Any | None = None
    try:
        backend = backend_factory(config)
        key_exists = backend.exists(source_key)
    except BaseException:
        try:
            if backend is not None:
                backend.close()
        except BaseException:
            pass
        raise GuardedSourcePromotionError(
            "source-promotion storage preflight failed before approval consumption"
        ) from None
    if key_exists:
        try:
            backend.close()
        except BaseException:
            raise GuardedSourcePromotionError(
                "source-promotion storage preflight close failed before approval consumption"
            ) from None
        raise PermissionError("approved preview source key already exists")

    approval_journal.consume(approval, started_at)
    marker = approval_journal.read_marker(approval.approval_id)
    try:
        outcome = promote_preview_source(
            config,
            source_key=source_key,
            media=media,
            expected_sha256=digest,
            backend_factory=lambda _: backend,
        )
    except BaseException as error:
        record = build_private_result(
            approval=approval,
            approval_marker=marker,
            recorded_at=clock(),
            outcome=None,
            failure_phase="storage",
            failure_code="live_storage_failed",
            cleanup_confirmed=False,
            evidence_mode=evidence_mode,
        )
        _write_terminal_result(result_writer, result_path, record, approval_journal)
        raise GuardedSourcePromotionError(
            "source promotion failed; private recovery evidence was written"
        ) from None

    record = build_private_result(
        approval=approval,
        approval_marker=marker,
        recorded_at=clock(),
        outcome=outcome,
        evidence_mode=evidence_mode,
    )
    _write_terminal_result(result_writer, result_path, record, approval_journal)
    return record
