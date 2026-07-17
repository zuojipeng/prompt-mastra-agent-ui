from __future__ import annotations

import hashlib
import ipaddress
import re
import tempfile
from dataclasses import dataclass, replace
from pathlib import Path
from typing import Any, Callable, Mapping
from urllib.parse import urlparse

from genblaze_core import Asset, KeyStrategy, Manifest, Modality, ObjectStorageSink, Pipeline, Step, StorageBackend, SyncProvider
from genblaze_core.providers.retry import RetryPolicy

from .live_genblaze_b2_smoke import DeferredCloseBackend, validate_smoke_prefix
from .live_runway_smoke import SMOKE_PROMPT, VideoProbe
from .offline_runway_b2_transaction import OfflineRunwayB2Error, _cleanup_owned, _owned_key_inventory
from .runway_provider import RUNWAY_ESTIMATED_COST_USD, RUNWAY_MODEL


RECOVERY_RESULT_SCHEMA = "jingci.recovered-runway-b2-result.v1"
_TASK_ID = re.compile(
    r"^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$",
    re.IGNORECASE,
)


@dataclass(frozen=True)
class RecoveredRunwayB2Result:
    schema_version: str
    status: str
    source: str
    prefix: str
    task_id: str
    output_host: str
    asset_key: str
    manifest_key: str
    asset_sha256: str
    asset_size_bytes: int
    manifest_hash: str
    probe: VideoProbe
    provider_create_count: int
    storage_cleanup: bool
    local_media_preserved: bool


class _RecoveredRunwayProvider(SyncProvider):
    name = "runway"

    def __init__(self, media_path: Path, task_id: str, output_host: str) -> None:
        super().__init__(retry_policy=RetryPolicy.disabled())
        self.media_path = media_path
        self.task_id = task_id
        self.output_host = output_host
        self.call_count = 0

    def generate(self, step: Step, config: Any = None) -> Step:
        del config
        self.call_count += 1
        if self.call_count != 1:
            raise RuntimeError("recovered provider may be invoked only once")
        media = self.media_path.read_bytes()
        asset = Asset(
            url=self.media_path.as_uri(),
            media_type="video/mp4",
            metadata={"provider_output_host": self.output_host},
        )
        asset.set_hash(media)
        step.assets.append(asset)
        step.cost_usd = RUNWAY_ESTIMATED_COST_USD
        step.provider_payload = {
            "task_id": self.task_id,
            "status": "SUCCEEDED",
            "recovered": True,
        }
        return step


def _validate_task_record(record: Mapping[str, object], expected_output_host: str) -> tuple[str, str]:
    task_id = record.get("id")
    if not isinstance(task_id, str) or not _TASK_ID.fullmatch(task_id):
        raise ValueError("recovery task id is invalid")
    if record.get("status") != "SUCCEEDED":
        raise ValueError("recovery requires a succeeded Runway task")
    output = record.get("output")
    if not isinstance(output, list) or len(output) != 1 or not isinstance(output[0], str):
        raise ValueError("recovery task output is invalid")
    parsed = urlparse(output[0])
    host = (parsed.hostname or "").lower()
    if (
        parsed.scheme != "https"
        or host != expected_output_host.strip().lower()
        or parsed.username
        or parsed.password
        or parsed.port not in (None, 443)
    ):
        raise ValueError("recovery task output host is invalid")
    try:
        ipaddress.ip_address(host)
    except ValueError:
        pass
    else:
        raise ValueError("recovery task output host must be a DNS name")
    return task_id, host


def _validate_media(path: Path, *, max_bytes: int) -> bytes:
    resolved = path.resolve()
    if path.is_symlink() or not resolved.is_file():
        raise ValueError("recovery media must be a regular file")
    size = resolved.stat().st_size
    if size <= 0 or size > max_bytes:
        raise ValueError("recovery media size is invalid")
    media = resolved.read_bytes()
    if len(media) != size or len(media) < 12 or media[4:8] != b"ftyp":
        raise ValueError("recovery media is not a complete MP4")
    return media


def run_recovered_runway_b2_transaction(
    *,
    task_record: Mapping[str, object],
    media_path: Path,
    backend: StorageBackend,
    probe: Callable[[Path], VideoProbe],
    prefix: str,
    output_host: str,
    max_media_bytes: int = 100 * 1024 * 1024,
) -> RecoveredRunwayB2Result:
    run_prefix = validate_smoke_prefix(prefix)
    task_id, normalized_host = _validate_task_record(task_record, output_host)
    resolved_media = media_path.resolve()
    media = _validate_media(media_path, max_bytes=max_media_bytes)
    probe_result = probe(resolved_media)
    if not isinstance(probe_result, VideoProbe):
        raise TypeError("recovery probe returned an unexpected result")

    staging = tempfile.TemporaryDirectory(prefix="jingci-recovered-runway-")
    staged_media = Path(staging.name) / "runway-output.mp4"
    staged_media.write_bytes(media)
    wrapper = DeferredCloseBackend(backend)
    provider = _RecoveredRunwayProvider(staged_media, task_id, normalized_host)
    primary_error: BaseException | None = None
    result: RecoveredRunwayB2Result | None = None
    residual_keys: tuple[str, ...] = ()
    close_failed = False
    cleanup_interrupted: BaseException | None = None
    try:
        sink = ObjectStorageSink(
            wrapper,
            prefix=run_prefix,
            key_strategy=KeyStrategy.CONTENT_ADDRESSABLE,
            max_upload_workers=1,
        )
        pipeline_result = (
            Pipeline("jingci-recovered-runway-b2")
            .step(
                provider,
                model=RUNWAY_MODEL,
                prompt=SMOKE_PROMPT,
                modality=Modality.VIDEO,
                jingci_shot_id=1,
            )
            .run(sink=sink, progress=False, raise_on_failure=True, max_retries=0)
        )
        if not wrapper.close_requested or provider.call_count != 1:
            raise OfflineRunwayB2Error("recovery_pipeline_lifecycle_invalid")
        records = wrapper.put_records
        if len(records) != 2 or any(record.get("stored_key") != record.get("key") for record in records):
            raise OfflineRunwayB2Error("unexpected_storage_keys")
        if any(not str(record["key"]).startswith(f"{run_prefix}/") for record in records):
            raise OfflineRunwayB2Error("storage_key_outside_prefix")
        asset_record = next((record for record in records if record["content_type"] == "video/mp4"), None)
        manifest_record = next((record for record in records if record["content_type"] == "application/json"), None)
        if asset_record is None or manifest_record is None:
            raise OfflineRunwayB2Error("storage_objects_missing")
        asset_key = str(asset_record["key"])
        manifest_key = str(manifest_record["key"])
        stored_media = wrapper.get(asset_key)
        digest = hashlib.sha256(stored_media).hexdigest()
        if stored_media != media or digest != pipeline_result.run.steps[0].assets[0].sha256:
            raise OfflineRunwayB2Error("asset_readback_mismatch")
        manifest_bytes = wrapper.get(manifest_key)
        manifest = Manifest.model_validate_json(manifest_bytes)
        persisted_step = manifest.run.steps[0]
        payload = persisted_step.provider_payload or {}
        if (
            not manifest.verify()
            or manifest.canonical_hash != pipeline_result.manifest.canonical_hash
            or persisted_step.provider != "runway"
            or persisted_step.model != RUNWAY_MODEL
            or payload.get("task_id") != task_id
            or payload.get("status") != "SUCCEEDED"
            or payload.get("recovered") is not True
        ):
            raise OfflineRunwayB2Error("recovered_lineage_verification_failed")
        serialized = manifest_bytes.decode("utf-8")
        persisted_asset_url = urlparse(persisted_step.assets[0].url)
        source_output_url = str(task_record["output"][0])
        if (
            persisted_asset_url.hostname == normalized_host
            or persisted_asset_url.username
            or persisted_asset_url.password
            or persisted_asset_url.query
            or persisted_asset_url.fragment
            or source_output_url in serialized
            or "token=" in serialized.lower()
            or "x-amz-" in serialized.lower()
        ):
            raise OfflineRunwayB2Error("sensitive_source_persisted")
        result = RecoveredRunwayB2Result(
            schema_version=RECOVERY_RESULT_SCHEMA,
            status="passed",
            source="existing_succeeded_runway_task",
            prefix=run_prefix,
            task_id=task_id,
            output_host=normalized_host,
            asset_key=asset_key,
            manifest_key=manifest_key,
            asset_sha256=digest,
            asset_size_bytes=len(stored_media),
            manifest_hash=manifest.canonical_hash,
            probe=probe_result,
            provider_create_count=0,
            storage_cleanup=False,
            local_media_preserved=resolved_media.is_file(),
        )
    except BaseException as exc:
        primary_error = exc
    finally:
        owned_keys, unsafe_observed = _owned_key_inventory(wrapper, run_prefix)
        cleaned_residual, cleanup_interrupted = _cleanup_owned(wrapper, owned_keys)
        residual_keys = tuple(sorted(set(cleaned_residual + unsafe_observed)))
        try:
            wrapper.close_delegate()
        except Exception:
            close_failed = True
        staging.cleanup()

    if primary_error is not None:
        if residual_keys or close_failed:
            raise OfflineRunwayB2Error("recovery_and_cleanup_failed", residual_keys=residual_keys) from primary_error
        raise primary_error
    if cleanup_interrupted is not None or residual_keys or close_failed:
        raise OfflineRunwayB2Error("recovery_cleanup_failed", residual_keys=residual_keys) from cleanup_interrupted
    if result is None or not resolved_media.is_file():
        raise OfflineRunwayB2Error("recovery_result_missing")
    return replace(result, storage_cleanup=True, local_media_preserved=True)
