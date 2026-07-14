from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import sys
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from typing import Any, BinaryIO, Callable, Mapping
from uuid import uuid4

from genblaze_core import Manifest, StorageBackend

from .b2_config import B2Config, build_live_backblaze_backend
from .contract import AssetEvidence, SCHEMA_VERSION, ShotProvenanceJob
from .live_b2_smoke import validate_live_authorization
from .local_pipeline import execute_storage_pipeline


SMOKE_PREFIX = "jingci-smoke"
_SAFE_PREFIX = re.compile(r"^jingci-smoke/[0-9]{8}T[0-9]{6}Z/[0-9a-f]{32}$")


@dataclass(frozen=True)
class GenblazeB2SmokeResult:
    schema_version: str
    status: str
    prefix: str
    asset_key: str
    manifest_key: str
    asset_sha256: str
    manifest_hash: str
    manifest_verified: bool
    cleanup_deleted: bool


class DeferredCloseBackend(StorageBackend):
    """Let Genblaze request close while retaining the backend for read-back verification."""

    def __init__(self, delegate: Any) -> None:
        self.delegate = delegate
        self.put_records: list[dict[str, str | None]] = []
        self.close_requested = False
        self.delegate_closed = False

    def put(
        self,
        key: str,
        data: bytes | BinaryIO,
        *,
        content_type: str | None = None,
        metadata: dict[str, str] | None = None,
        extra_args: dict[str, Any] | None = None,
    ) -> str:
        record: dict[str, str | None] = {
            "key": key,
            "stored_key": None,
            "content_type": content_type,
        }
        # Register ownership before mutation so a commit-then-timeout can still
        # be compensated by the smoke owner.
        self.put_records.append(record)
        stored_key = self.delegate.put(
            key,
            data,
            content_type=content_type,
            metadata=metadata,
            extra_args=extra_args,
        )
        record["stored_key"] = stored_key
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
        self.close_requested = True

    def close_delegate(self) -> None:
        if not self.delegate_closed:
            self.delegate.close()
            self.delegate_closed = True


def build_smoke_prefix(now: datetime | None = None, run_id: str | None = None) -> str:
    timestamp = (now or datetime.now(timezone.utc)).astimezone(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    identifier = (run_id or uuid4().hex).lower()
    prefix = f"{SMOKE_PREFIX}/{timestamp}/{identifier}"
    if not _SAFE_PREFIX.fullmatch(prefix):
        raise ValueError("generated Genblaze smoke prefix is outside the allowed namespace")
    return prefix


def validate_smoke_prefix(prefix: str) -> str:
    if not _SAFE_PREFIX.fullmatch(prefix):
        raise ValueError("Genblaze smoke prefix is outside the allowed namespace")
    return prefix


def _build_job(payload: bytes) -> ShotProvenanceJob:
    return ShotProvenanceJob(
        schema_version=SCHEMA_VERSION,
        job_id=f"b2-smoke-{uuid4().hex}",
        shot_id=1,
        prompt="Credential-gated Genblaze to B2 smoke",
        negative_prompt="",
        provider="jingci-local-video",
        model="local-proof",
        modality="video",
        asset=AssetEvidence(
            "memory://jingci-source/b2-smoke.mp4",
            "video/mp4",
            hashlib.sha256(payload).hexdigest(),
        ),
        metadata={"purpose": "jingci-genblaze-b2-smoke"},
    )


def _cleanup(wrapper: DeferredCloseBackend, keys: list[str]) -> None:
    failed: list[str] = []
    for key in reversed(keys):
        try:
            wrapper.delete(key)
            if wrapper.exists(key):
                failed.append(key)
        except Exception:
            failed.append(key)
    if failed:
        raise RuntimeError(f"Genblaze B2 smoke cleanup failed for object keys: {', '.join(failed)}")


def run_genblaze_b2_smoke(
    config: B2Config,
    *,
    backend_factory: Callable[[B2Config], Any] = build_live_backblaze_backend,
    prefix: str | None = None,
    payload: bytes | None = None,
) -> GenblazeB2SmokeResult:
    run_prefix = prefix or build_smoke_prefix()
    validate_smoke_prefix(run_prefix)
    media = payload or f"jingci-genblaze-b2-smoke:{uuid4().hex}".encode("ascii")
    wrapper = DeferredCloseBackend(backend_factory(config))
    owned_keys: list[str] = []
    cleaned = False
    try:
        pipeline_result, _ = execute_storage_pipeline(_build_job(media), media, wrapper, prefix=run_prefix)
        if not wrapper.close_requested:
            raise RuntimeError("Genblaze sink did not request backend close")
        records = wrapper.put_records
        owned_keys = [str(record["key"]) for record in records]
        if len(records) != 2 or len(set(owned_keys)) != 2:
            raise RuntimeError("Genblaze B2 smoke expected exactly one asset and one manifest")
        if any(record["stored_key"] != record["key"] for record in records):
            raise RuntimeError("Genblaze B2 smoke received an unexpected storage key")
        if any(not key.startswith(f"{run_prefix}/") for key in owned_keys):
            raise RuntimeError("Genblaze B2 smoke wrote outside its owned prefix")

        asset_record = next((record for record in records if record["content_type"] == "video/mp4"), None)
        manifest_record = next((record for record in records if record["content_type"] == "application/json"), None)
        if asset_record is None or manifest_record is None:
            raise RuntimeError("Genblaze B2 smoke could not identify asset and manifest objects")
        asset_key = str(asset_record["key"])
        manifest_key = str(manifest_record["key"])
        if any(not wrapper.exists(key) for key in owned_keys):
            raise RuntimeError("Genblaze B2 smoke object was not observable")

        asset_bytes = wrapper.get(asset_key)
        asset_sha256 = hashlib.sha256(asset_bytes).hexdigest()
        pipeline_asset = pipeline_result.run.steps[0].assets[0]
        if asset_bytes != media or asset_sha256 != pipeline_asset.sha256:
            raise RuntimeError("Genblaze B2 smoke asset read-back mismatch")
        persisted_manifest = Manifest.model_validate_json(wrapper.get(manifest_key))
        if not persisted_manifest.verify():
            raise RuntimeError("Genblaze B2 smoke manifest read-back failed verification")
        if persisted_manifest.canonical_hash != pipeline_result.manifest.canonical_hash:
            raise RuntimeError("Genblaze B2 smoke manifest hash mismatch")

        _cleanup(wrapper, owned_keys)
        cleaned = True
        return GenblazeB2SmokeResult(
            schema_version="jingci.genblaze-b2-live-smoke.v1",
            status="passed",
            prefix=run_prefix,
            asset_key=asset_key,
            manifest_key=manifest_key,
            asset_sha256=asset_sha256,
            manifest_hash=persisted_manifest.canonical_hash,
            manifest_verified=True,
            cleanup_deleted=True,
        )
    finally:
        try:
            cleanup_keys = owned_keys or [str(record["key"]) for record in wrapper.put_records]
            if cleanup_keys and not cleaned:
                _cleanup(wrapper, cleanup_keys)
        finally:
            wrapper.close_delegate()


def build_plan() -> dict[str, Any]:
    return {
        "schema_version": "jingci.genblaze-b2-live-smoke-plan.v1",
        "network": False,
        "provider": "deterministic-local-proof",
        "storage": "Genblaze ObjectStorageSink -> guarded B2 backend",
        "objects": ["content-addressed video asset", "verified JSON manifest"],
        "verification": ["exact bytes", "asset sha256", "manifest verify", "canonical hash"],
        "cleanup": "delete and confirm both objects absent",
        "bucket_mutations": False,
        "prints_credentials": False,
    }


def main(argv: list[str] | None = None, env: Mapping[str, str] = os.environ) -> int:
    parser = argparse.ArgumentParser(description="Plan or run the guarded Genblaze-to-B2 smoke")
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--plan", action="store_true")
    mode.add_argument("--live", action="store_true")
    args = parser.parse_args(argv)
    if args.plan:
        print(json.dumps(build_plan(), indent=2, sort_keys=True))
        return 0
    try:
        validate_live_authorization(env)
        result = run_genblaze_b2_smoke(B2Config.from_env(env))
    except (PermissionError, ValueError) as error:
        print(str(error), file=sys.stderr)
        return 2
    except Exception as error:
        print(f"live Genblaze B2 smoke failed ({type(error).__name__}); no credential values were printed", file=sys.stderr)
        return 1
    print(json.dumps(asdict(result), indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
