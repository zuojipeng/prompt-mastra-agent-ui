from __future__ import annotations

import tempfile
from pathlib import Path
from typing import Any, BinaryIO
from urllib.parse import urlparse

from genblaze_core import (
    Asset,
    KeyStrategy,
    Modality,
    ObjectStorageSink,
    Pipeline,
    Step,
    StorageBackend,
    SyncProvider,
)

from .contract import ShotProvenanceJob


class DeterministicVideoProvider(SyncProvider):
    """Local provider used only to exercise Genblaze's provider lifecycle."""

    name = "jingci-local-video"

    def __init__(self, output_path: Path) -> None:
        super().__init__()
        self.output_path = output_path.resolve()
        self.call_count = 0

    def generate(self, step: Step, config: Any = None) -> Step:
        self.call_count += 1
        step.assets.append(Asset(url=self.output_path.as_uri(), media_type="video/mp4"))
        return step


class InMemoryStorageBackend(StorageBackend):
    """Credential-free storage fake that records exactly what the sink persists."""

    public_url_base = "memory://jingci-spike"

    def __init__(self) -> None:
        self.objects: dict[str, bytes] = {}
        self.put_records: list[dict[str, Any]] = []

    def put(
        self,
        key: str,
        data: bytes | BinaryIO,
        *,
        content_type: str | None = None,
        metadata: dict[str, str] | None = None,
        extra_args: dict[str, Any] | None = None,
    ) -> str:
        body = data if isinstance(data, bytes) else data.read()
        self.objects[key] = body
        self.put_records.append(
            {
                "key": key,
                "content_type": content_type,
                "metadata": dict(metadata or {}),
                "extra_args": dict(extra_args or {}),
            }
        )
        return key

    def get(self, key: str) -> bytes:
        return self.objects[key]

    def exists(self, key: str) -> bool:
        return key in self.objects

    def delete(self, key: str) -> None:
        self.objects.pop(key, None)

    def get_url(self, key: str, *, expires_in: int = 3600) -> str:
        return f"memory://jingci-spike/{key}?expires_in={expires_in}"

    def get_durable_url(self, key: str) -> str:
        return f"memory://jingci-spike/{key}"

    def key_from_url(self, url: str) -> str | None:
        parsed = urlparse(url)
        if parsed.scheme != "memory" or parsed.netloc != "jingci-spike":
            return None
        return parsed.path.lstrip("/")


def execute_local_storage_pipeline(job: ShotProvenanceJob, media_bytes: bytes) -> dict[str, Any]:
    if job.modality != "video":
        raise ValueError("local pipeline spike currently supports video only")
    if not media_bytes:
        raise ValueError("media_bytes must not be empty")

    backend = InMemoryStorageBackend()
    with tempfile.TemporaryDirectory(prefix="jingci-genblaze-") as output_dir:
        output_path = Path(output_dir) / f"shot-{job.shot_id}.mp4"
        output_path.write_bytes(media_bytes)
        provider = DeterministicVideoProvider(output_path)
        sink = ObjectStorageSink(
            backend,
            prefix="jingci-spike",
            key_strategy=KeyStrategy.CONTENT_ADDRESSABLE,
            max_upload_workers=1,
        )
        result = (
            Pipeline(f"jingci-shot-{job.shot_id}")
            .step(
                provider,
                model=job.model,
                prompt=job.prompt,
                modality=Modality.VIDEO,
                negative_prompt=job.negative_prompt or None,
                params={"jingci_shot_id": job.shot_id},
            )
            .run(sink=sink, progress=False, raise_on_failure=True)
        )

    manifest = result.manifest
    if not manifest.verify():
        raise ValueError("stored Genblaze manifest failed verification")
    asset = result.run.steps[0].assets[0]
    manifest_key = next(
        record["key"] for record in backend.put_records if record["content_type"] == "application/json"
    )
    return {
        "job_id": job.job_id,
        "shot_id": job.shot_id,
        "provider_call_count": provider.call_count,
        "provider_name": provider.name,
        "run_status": result.run.status.value,
        "step_status": result.run.steps[0].status.value,
        "asset_url": asset.url,
        "asset_sha256": asset.sha256,
        "asset_size_bytes": asset.size_bytes,
        "manifest_hash": manifest.canonical_hash,
        "manifest_uri": manifest.manifest_uri,
        "manifest_key": manifest_key,
        "stored_keys": sorted(backend.objects),
        "put_records": backend.put_records,
    }
