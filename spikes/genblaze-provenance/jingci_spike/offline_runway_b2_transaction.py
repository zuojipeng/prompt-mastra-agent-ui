from __future__ import annotations

import hashlib
import tempfile
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Callable
from urllib.parse import unquote, urlparse

from genblaze_core import (
    KeyStrategy,
    Manifest,
    Modality,
    ObjectStorageSink,
    Pipeline,
    Step,
    StorageBackend,
    SyncProvider,
)
from genblaze_core.providers.retry import RetryPolicy
from genblaze_core.sinks.base import BaseSink

from .live_genblaze_b2_smoke import DeferredCloseBackend, build_smoke_prefix, validate_smoke_prefix
from .live_runway_smoke import SMOKE_PROMPT, VideoProbe
from .local_pipeline import InMemoryStorageBackend
from .runway_provider import (
    RUNWAY_MODEL,
    FakeRunwayTaskClient,
    RunwayProviderConfig,
    RunwayProviderError,
    RunwayTaskClient,
    RunwayVideoProvider,
)


@dataclass(frozen=True)
class OfflineRunwayB2Result:
    schema_version: str
    status: str
    prefix: str
    task_id: str
    asset_key: str
    manifest_key: str
    asset_sha256: str
    manifest_hash: str
    probe: VideoProbe
    provider_create_count: int
    storage_cleanup: bool
    local_cleanup: bool
    network: bool


class OfflineRunwayB2Error(RuntimeError):
    def __init__(self, code: str, *, residual_keys: tuple[str, ...] = ()) -> None:
        self.code = code
        self.residual_keys = residual_keys
        suffix = f"; residual owned keys: {', '.join(residual_keys)}" if residual_keys else ""
        super().__init__(f"offline Runway-to-B2 transaction failed: {code}{suffix}")


class _ProbeBeforeSinkProvider(SyncProvider):
    name = "runway"

    def __init__(
        self,
        delegate: RunwayVideoProvider,
        output_root: Path,
        probe: Callable[[Path], VideoProbe],
    ) -> None:
        super().__init__(retry_policy=RetryPolicy.disabled())
        self.delegate = delegate
        self.output_root = output_root.resolve()
        self.probe = probe
        self.probe_result: VideoProbe | None = None
        self.output_path: Path | None = None

    def generate(self, step: Step, config: Any = None) -> Step:
        del config
        generated = self.delegate.generate(step)
        if len(generated.assets) != 1 or generated.assets[0].media_type != "video/mp4":
            raise RunwayProviderError("malformed_output")
        path = _owned_file_path(generated.assets[0].url, self.output_root)
        try:
            probe_result = self.probe(path)
            if not isinstance(probe_result, VideoProbe):
                raise TypeError("probe returned an unexpected result")
            self.probe_result = probe_result
        except Exception as exc:
            raise RunwayProviderError("output_probe_failed") from exc
        self.output_path = path
        return generated


class _ProbeGatedSink(BaseSink):
    """Keep failed probe runs out of storage while preserving sink teardown."""

    def __init__(self, delegate: ObjectStorageSink, provider: _ProbeBeforeSinkProvider) -> None:
        self.delegate = delegate
        self.provider = provider

    def write_run(self, run: Any, manifest: Manifest) -> None:
        if self.provider.probe_result is not None:
            self.delegate.write_run(run, manifest)

    def close(self) -> None:
        self.delegate.close()


def _owned_file_path(url: str, root: Path) -> Path:
    parsed = urlparse(url)
    if parsed.scheme != "file" or parsed.netloc not in ("", "localhost"):
        raise RunwayProviderError("output_path_not_owned")
    path = Path(unquote(parsed.path)).resolve()
    if not path.is_relative_to(root) or not path.is_file() or path.is_symlink():
        raise RunwayProviderError("output_path_not_owned")
    return path


def _owned_key_inventory(
    wrapper: DeferredCloseBackend, prefix: str
) -> tuple[list[str], tuple[str, ...]]:
    keys: list[str] = []
    unsafe_observed: list[str] = []
    for record in wrapper.put_records:
        for value in (record.get("key"), record.get("stored_key")):
            if not isinstance(value, str):
                continue
            if value.startswith(f"{prefix}/"):
                if value not in keys:
                    keys.append(value)
            elif value not in unsafe_observed:
                unsafe_observed.append(value)
    return keys, tuple(sorted(unsafe_observed))


def _cleanup_owned(wrapper: DeferredCloseBackend, keys: list[str]) -> tuple[str, ...]:
    residual: list[str] = []
    for key in reversed(keys):
        try:
            wrapper.delete(key)
            if key in wrapper.delegate.objects:
                residual.append(key)
        except Exception:
            residual.append(key)
    return tuple(sorted(set(residual)))


def run_offline_runway_b2_transaction(
    *,
    client: RunwayTaskClient,
    backend: StorageBackend,
    probe: Callable[[Path], VideoProbe],
    prefix: str | None = None,
    output_host: str = "media.runway.test",
) -> OfflineRunwayB2Result:
    run_prefix = validate_smoke_prefix(prefix or build_smoke_prefix())
    if not isinstance(client, FakeRunwayTaskClient):
        raise ValueError("offline transaction requires the scripted fake Runway client")
    if not isinstance(backend, InMemoryStorageBackend):
        raise ValueError("offline transaction requires the B2-shaped in-memory backend")
    wrapper = DeferredCloseBackend(backend)
    primary_error: BaseException | None = None
    result: OfflineRunwayB2Result | None = None
    residual_keys: tuple[str, ...] = ()
    close_failed = False
    output_root: Path | None = None

    try:
        with tempfile.TemporaryDirectory(prefix="jingci-runway-b2-offline-") as directory:
            output_root = Path(directory)
            provider = RunwayVideoProvider(
                client,
                RunwayProviderConfig(
                    output_dir=output_root,
                    allowed_output_hosts=(output_host,),
                    timeout_seconds=30.0,
                    poll_interval_seconds=5.0,
                    max_output_bytes=1024 * 1024,
                ),
                sleep=lambda _: None,
            )
            probed_provider = _ProbeBeforeSinkProvider(provider, output_root, probe)
            storage_sink = ObjectStorageSink(
                wrapper,
                prefix=run_prefix,
                key_strategy=KeyStrategy.CONTENT_ADDRESSABLE,
                max_upload_workers=1,
            )
            sink = _ProbeGatedSink(storage_sink, probed_provider)
            pipeline_result = (
                Pipeline("jingci-offline-runway-b2")
                .step(
                    probed_provider,
                    model=RUNWAY_MODEL,
                    prompt=SMOKE_PROMPT,
                    modality=Modality.VIDEO,
                    jingci_shot_id=1,
                )
                .run(sink=sink, progress=False, raise_on_failure=True, max_retries=0)
            )
            if not wrapper.close_requested:
                raise OfflineRunwayB2Error("sink_close_not_requested")
            if probed_provider.probe_result is None or probed_provider.output_path is None:
                raise OfflineRunwayB2Error("probe_not_completed")

            records = wrapper.put_records
            if len(records) != 2 or any(record.get("stored_key") != record.get("key") for record in records):
                raise OfflineRunwayB2Error("unexpected_storage_keys")
            if any(not str(record["key"]).startswith(f"{run_prefix}/") for record in records):
                raise OfflineRunwayB2Error("storage_key_outside_prefix")
            asset_record = next((record for record in records if record["content_type"] == "video/mp4"), None)
            manifest_record = next(
                (record for record in records if record["content_type"] == "application/json"),
                None,
            )
            if asset_record is None or manifest_record is None:
                raise OfflineRunwayB2Error("storage_objects_missing")
            asset_key = str(asset_record["key"])
            manifest_key = str(manifest_record["key"])

            local_bytes = probed_provider.output_path.read_bytes()
            stored_bytes = wrapper.get(asset_key)
            pipeline_asset = pipeline_result.run.steps[0].assets[0]
            digest = hashlib.sha256(stored_bytes).hexdigest()
            if stored_bytes != local_bytes or digest != pipeline_asset.sha256:
                raise OfflineRunwayB2Error("asset_readback_mismatch")

            manifest_bytes = wrapper.get(manifest_key)
            persisted_manifest = Manifest.model_validate_json(manifest_bytes)
            if not persisted_manifest.verify():
                raise OfflineRunwayB2Error("manifest_verification_failed")
            if persisted_manifest.canonical_hash != pipeline_result.manifest.canonical_hash:
                raise OfflineRunwayB2Error("manifest_hash_mismatch")
            persisted_step = persisted_manifest.run.steps[0]
            if persisted_step.provider != "runway" or persisted_step.model != RUNWAY_MODEL:
                raise OfflineRunwayB2Error("runway_lineage_missing")
            task_id = str((persisted_step.provider_payload or {}).get("task_id", ""))
            if not task_id:
                raise OfflineRunwayB2Error("runway_task_lineage_missing")
            serialized = manifest_bytes.decode("utf-8")
            if "https://" in serialized or "token=" in serialized or "key_" in serialized:
                raise OfflineRunwayB2Error("sensitive_source_persisted")

            create_count = len(getattr(client, "create_calls", ()))
            if create_count != 1 or not task_id:
                raise OfflineRunwayB2Error("provider_lifecycle_unexpected")
            result = OfflineRunwayB2Result(
                schema_version="jingci.offline-runway-b2-transaction.v1",
                status="passed",
                prefix=run_prefix,
                task_id=task_id,
                asset_key=asset_key,
                manifest_key=manifest_key,
                asset_sha256=digest,
                manifest_hash=persisted_manifest.canonical_hash,
                probe=probed_provider.probe_result,
                provider_create_count=create_count,
                storage_cleanup=True,
                local_cleanup=True,
                network=False,
            )
    except BaseException as exc:
        primary_error = exc
    finally:
        owned_keys, unsafe_observed = _owned_key_inventory(wrapper, run_prefix)
        residual_keys = tuple(sorted(set(_cleanup_owned(wrapper, owned_keys) + unsafe_observed)))
        try:
            wrapper.close_delegate()
        except Exception:
            close_failed = True

    if primary_error is not None:
        if residual_keys or close_failed:
            code = "primary_and_cleanup_failed" if residual_keys else "primary_and_close_failed"
            raise OfflineRunwayB2Error(code, residual_keys=residual_keys) from primary_error
        raise primary_error
    if residual_keys:
        raise OfflineRunwayB2Error("storage_cleanup_failed", residual_keys=residual_keys)
    if close_failed:
        raise OfflineRunwayB2Error("backend_close_failed")
    if result is None or output_root is None:
        raise OfflineRunwayB2Error("result_missing")
    if output_root.exists():
        raise OfflineRunwayB2Error("local_cleanup_failed")
    return result


def build_offline_plan() -> dict[str, Any]:
    return {
        "schema_version": "jingci.offline-runway-b2-transaction-plan.v1",
        "network": False,
        "provider": "RunwayVideoProvider with scripted fake client",
        "probe": "injected probe gate; not live ffprobe evidence",
        "storage": "B2-shaped in-memory backend through Genblaze ObjectStorageSink",
        "verification": ["one simulated create", "asset readback sha256", "manifest verify", "cleanup"],
        "credentials": False,
        "spend": False,
    }
