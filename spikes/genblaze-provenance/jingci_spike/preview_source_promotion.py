from __future__ import annotations

import argparse
import hashlib
import json
import re
from dataclasses import dataclass
from typing import Any, Callable

from .b2_config import B2Config, build_live_backblaze_backend


SOURCE_KEY_PATTERN = re.compile(r"^jingci-preview/source/[A-Za-z0-9][A-Za-z0-9._-]{0,127}\.mp4$")
MAX_SOURCE_BYTES = 100_000_000


@dataclass(frozen=True)
class SourcePromotionResult:
    schema_version: str
    status: str
    source_key: str
    source_sha256: str
    source_size_bytes: int
    retained: bool


def validate_source(key: str, media: bytes, expected_sha256: str) -> str:
    if not SOURCE_KEY_PATTERN.fullmatch(key):
        raise ValueError("preview source key is outside the fixed namespace")
    if not 1 <= len(media) <= MAX_SOURCE_BYTES:
        raise ValueError("preview source bytes are outside the allowed size range")
    digest = hashlib.sha256(media).hexdigest()
    if expected_sha256 != digest:
        raise ValueError("preview source digest does not match the approval input")
    return digest


def promote_preview_source(
    config: B2Config,
    *,
    source_key: str,
    media: bytes,
    expected_sha256: str,
    backend_factory: Callable[[B2Config], Any] = build_live_backblaze_backend,
) -> SourcePromotionResult:
    digest = validate_source(source_key, media, expected_sha256)
    backend = backend_factory(config)
    uploaded = False
    closed = False
    try:
        if backend.exists(source_key):
            raise PermissionError("preview source promotion refuses overwrite")
        stored_key = backend.put(
            source_key,
            media,
            content_type="video/mp4",
            metadata={"purpose": "jingci-reviewed-preview-source", "sha256": digest},
        )
        uploaded = True
        if stored_key != source_key or not backend.exists(source_key):
            raise RuntimeError("preview source upload was not observable at the approved key")
        readback = backend.get(source_key)
        if readback != media or hashlib.sha256(readback).hexdigest() != digest:
            raise RuntimeError("preview source read-back verification failed")
        backend.close()
        closed = True
        return SourcePromotionResult(
            schema_version="jingci.preview-source-promotion-result.v1",
            status="passed",
            source_key=source_key,
            source_sha256=digest,
            source_size_bytes=len(media),
            retained=True,
        )
    finally:
        if not closed:
            try:
                if uploaded:
                    backend.delete(source_key)
            finally:
                backend.close()


def build_plan() -> dict[str, Any]:
    return {
        "schema_version": "jingci.preview-source-promotion-plan.v1",
        "network": False,
        "live_entrypoint": False,
        "object_prefix": "jingci-preview/source/",
        "maximum_source_bytes": MAX_SOURCE_BYTES,
        "operations": ["refuse_overwrite", "put_once", "readback", "sha256", "retain_on_success"],
        "failure_compensation": "delete only the newly uploaded approved key",
        "approval_contract": "dedicated durable schema exists; no approval document is generated",
        "required_future_gate": "reviewed live composition root and exact human mutation approval",
        "prints_credentials": False,
    }


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Inspect the credential-free preview source promotion plan")
    parser.add_argument("--plan", action="store_true", required=True)
    parser.parse_args(argv)
    print(json.dumps(build_plan(), indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
