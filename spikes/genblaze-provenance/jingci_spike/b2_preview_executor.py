from __future__ import annotations

import hashlib
import re
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, BinaryIO, Callable, Mapping
from uuid import uuid4

from genblaze_core import Manifest, StorageBackend

from .b2_config import B2Config, build_live_backblaze_backend
from .contract import AssetEvidence, ProvenanceRunRequest, SCHEMA_VERSION, ShotProvenanceJob
from .local_pipeline import execute_storage_pipeline


RUN_PREFIX = "jingci-preview/runs"
SOURCE_KEY_PATTERN = re.compile(r"^jingci-preview/source/[A-Za-z0-9][A-Za-z0-9._/-]{0,199}$")
SHA256_PATTERN = re.compile(r"^[0-9a-f]{64}$")
MAX_SOURCE_BYTES = 100_000_000


@dataclass(frozen=True)
class B2PreviewConfig:
    b2: B2Config
    source_key: str
    source_sha256: str
    source_provider: str
    source_model: str
    source_max_bytes: int

    @classmethod
    def from_environment(cls, environment: Mapping[str, str]) -> "B2PreviewConfig":
        source_key = environment.get("JINGCI_PREVIEW_SOURCE_KEY", "").strip()
        if not SOURCE_KEY_PATTERN.fullmatch(source_key) or ".." in source_key or source_key.endswith("/"):
            raise ValueError("JINGCI_PREVIEW_SOURCE_KEY must use the fixed preview source namespace")
        source_sha256 = environment.get("JINGCI_PREVIEW_SOURCE_SHA256", "").strip().lower()
        if not SHA256_PATTERN.fullmatch(source_sha256):
            raise ValueError("JINGCI_PREVIEW_SOURCE_SHA256 must be a lowercase SHA-256 digest")
        source_provider = environment.get("JINGCI_PREVIEW_SOURCE_PROVIDER", "").strip()
        source_model = environment.get("JINGCI_PREVIEW_SOURCE_MODEL", "").strip()
        if not source_provider or not source_model:
            raise ValueError("preview source provider and model are required")
        try:
            source_max_bytes = int(environment.get("JINGCI_PREVIEW_SOURCE_MAX_BYTES", ""))
        except ValueError as error:
            raise ValueError("JINGCI_PREVIEW_SOURCE_MAX_BYTES must be a bounded integer") from error
        if not 1 <= source_max_bytes <= MAX_SOURCE_BYTES:
            raise ValueError("JINGCI_PREVIEW_SOURCE_MAX_BYTES must be between 1 and 100000000")
        return cls(
            B2Config.from_env(environment),
            source_key,
            source_sha256,
            source_provider,
            source_model,
            source_max_bytes,
        )


class OwnedWriteBackend(StorageBackend):
    def __init__(self, delegate: Any) -> None:
        self.delegate = delegate
        self.owned_keys: list[str] = []
        self.put_records: list[dict[str, str | None]] = []
        self.delegate_closed = False

    def put(self, key: str, data: bytes | BinaryIO, **kwargs: Any) -> str:
        self.owned_keys.append(key)
        record = {"key": key, "content_type": kwargs.get("content_type")}
        self.put_records.append(record)
        try:
            stored_key = self.delegate.put(key, data, **kwargs)
        except Exception:
            raise RuntimeError("preview storage write failed") from None
        if stored_key != key:
            raise RuntimeError("preview storage returned an unexpected key")
        return stored_key

    def get(self, key: str) -> bytes:
        return self.delegate.get(key)

    def exists(self, key: str) -> bool:
        return self.delegate.exists(key)

    def delete(self, key: str) -> None:
        self.delegate.delete(key)

    def get_url(self, key: str, *, expires_in: int = 3600) -> str:
        return self.delegate.get_url(key, expires_in=expires_in)

    def get_durable_url(self, key: str) -> str:
        return self.delegate.get_durable_url(key)

    def key_from_url(self, url: str) -> str | None:
        return self.delegate.key_from_url(url)

    def close(self) -> None:
        return

    def close_delegate(self) -> None:
        if not self.delegate_closed:
            self.delegate.close()
            self.delegate_closed = True

    def cleanup_owned(self) -> None:
        failed = []
        for key in reversed(self.owned_keys):
            try:
                self.delete(key)
                if self.exists(key):
                    failed.append(key)
            except Exception:
                failed.append(key)
        if failed:
            raise RuntimeError("preview storage cleanup failed")


BackendFactory = Callable[[B2Config], Any]


class B2PreviewExecutor:
    def __init__(
        self,
        config: B2PreviewConfig,
        backend_factory: BackendFactory = build_live_backblaze_backend,
    ) -> None:
        self.config = config
        self.backend_factory = backend_factory

    def __call__(self, request: ProvenanceRunRequest) -> dict[str, Any]:
        if request.provider != self.config.source_provider or request.model != self.config.source_model:
            raise ValueError("request provider lineage does not match the reviewed preview source")
        wrapper = OwnedWriteBackend(self.backend_factory(self.config.b2))
        succeeded = False
        try:
            media = wrapper.get(self.config.source_key)
            if len(media) > self.config.source_max_bytes:
                raise ValueError("reviewed preview source exceeds the configured byte limit")
            media_sha256 = hashlib.sha256(media).hexdigest()
            if media_sha256 != self.config.source_sha256:
                raise ValueError("reviewed preview source digest does not match")
            run_id = uuid4().hex
            job_id = f"preview-shot-{request.shot_id}-attempt-{request.attempt}-{run_id}"
            job = ShotProvenanceJob(
                schema_version=SCHEMA_VERSION,
                job_id=job_id,
                shot_id=request.shot_id,
                prompt=request.prompt,
                negative_prompt=request.negative_prompt,
                provider=self.config.source_provider,
                model=self.config.source_model,
                modality="video",
                asset=AssetEvidence(
                    self.config.source_key,
                    "video/mp4",
                    self.config.source_sha256,
                ),
                metadata={
                    "project_id": request.project_id,
                    "attempt": str(request.attempt),
                    "source_provider": self.config.source_provider,
                    "source_model": self.config.source_model,
                },
            )
            result, _ = execute_storage_pipeline(
                job,
                media,
                wrapper,
                prefix=f"{RUN_PREFIX}/{run_id}",
                provider_name=self.config.source_provider,
            )
            if len(wrapper.put_records) != 2 or len(set(wrapper.owned_keys)) != 2:
                raise RuntimeError("preview execution must own exactly one asset and one manifest")
            asset_record = next(record for record in wrapper.put_records if record["content_type"] == "video/mp4")
            manifest_record = next(
                record for record in wrapper.put_records if record["content_type"] == "application/json"
            )
            asset_key = str(asset_record["key"])
            manifest_key = str(manifest_record["key"])
            asset_bytes = wrapper.get(asset_key)
            asset_sha256 = hashlib.sha256(asset_bytes).hexdigest()
            manifest = Manifest.model_validate_json(wrapper.get(manifest_key))
            if asset_bytes != media or asset_sha256 != self.config.source_sha256:
                raise RuntimeError("preview asset read-back verification failed")
            if not manifest.verify() or manifest.canonical_hash != result.manifest.canonical_hash:
                raise RuntimeError("preview manifest read-back verification failed")
            timestamp = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
            response = {
                "schema_version": "jingci.provenance-run.v1",
                "job_id": job_id,
                "project_id": request.project_id,
                "shot_id": request.shot_id,
                "parent_job_id": request.parent_job_id,
                "attempt": request.attempt,
                "status": "succeeded",
                "provider": self.config.source_provider,
                "model": self.config.source_model,
                "modality": "video",
                "created_at": timestamp,
                "updated_at": timestamp,
                "result": {
                    "asset": {
                        "url": wrapper.get_durable_url(asset_key),
                        "media_type": "video/mp4",
                        "sha256": asset_sha256,
                        "size_bytes": len(asset_bytes),
                    },
                    "manifest": {
                        "uri": wrapper.get_durable_url(manifest_key),
                        "canonical_hash": manifest.canonical_hash,
                        "verified": True,
                    },
                },
                "error": None,
            }
            wrapper.close_delegate()
            succeeded = True
            return response
        finally:
            try:
                if not succeeded and wrapper.owned_keys:
                    wrapper.cleanup_owned()
            finally:
                if not wrapper.delegate_closed:
                    wrapper.close_delegate()
