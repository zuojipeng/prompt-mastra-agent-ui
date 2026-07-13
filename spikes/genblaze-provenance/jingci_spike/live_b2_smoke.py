from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import sys
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from typing import Any, Callable, Mapping
from uuid import uuid4

from .b2_config import B2Config, build_live_backblaze_backend


LIVE_CONFIRMATION_ENV = "JINGCI_ALLOW_LIVE_B2_SMOKE"
LIVE_CONFIRMATION_VALUE = "YES"
SMOKE_PREFIX = "jingci-smoke"
_SAFE_KEY = re.compile(r"^jingci-smoke/[0-9]{8}T[0-9]{6}Z/[0-9a-f]{32}/probe\.bin$")


@dataclass(frozen=True)
class SmokeResult:
    schema_version: str
    status: str
    object_key: str
    payload_sha256: str
    readback_sha256: str
    cleanup_deleted: bool


def build_smoke_key(now: datetime | None = None, run_id: str | None = None) -> str:
    timestamp = (now or datetime.now(timezone.utc)).astimezone(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    identifier = (run_id or uuid4().hex).lower()
    key = f"{SMOKE_PREFIX}/{timestamp}/{identifier}/probe.bin"
    if not _SAFE_KEY.fullmatch(key):
        raise ValueError("generated smoke key is outside the allowed prefix")
    return key


def validate_live_authorization(env: Mapping[str, str]) -> None:
    if env.get(LIVE_CONFIRMATION_ENV) != LIVE_CONFIRMATION_VALUE:
        raise PermissionError(
            f"live B2 smoke requires {LIVE_CONFIRMATION_ENV}={LIVE_CONFIRMATION_VALUE}"
        )


def run_live_smoke(
    config: B2Config,
    *,
    backend_factory: Callable[[B2Config], Any] = build_live_backblaze_backend,
    object_key: str | None = None,
    payload: bytes | None = None,
) -> SmokeResult:
    key = object_key or build_smoke_key()
    if not _SAFE_KEY.fullmatch(key):
        raise ValueError("smoke object key is outside the allowed prefix")
    body = payload or f"jingci-b2-smoke:{uuid4().hex}".encode("ascii")
    expected_sha256 = hashlib.sha256(body).hexdigest()
    backend = backend_factory(config)
    uploaded = False
    cleanup_deleted = False
    try:
        stored_key = backend.put(
            key,
            body,
            content_type="application/octet-stream",
            metadata={"purpose": "jingci-b2-smoke", "sha256": expected_sha256},
        )
        uploaded = True
        if stored_key != key or not backend.exists(key):
            raise RuntimeError("B2 smoke upload was not observable")
        readback = backend.get(key)
        readback_sha256 = hashlib.sha256(readback).hexdigest()
        if readback_sha256 != expected_sha256:
            raise RuntimeError("B2 smoke read-back digest mismatch")
        backend.delete(key)
        cleanup_deleted = not backend.exists(key)
        uploaded = not cleanup_deleted
        if not cleanup_deleted:
            raise RuntimeError("B2 smoke object cleanup was not confirmed")
        return SmokeResult(
            schema_version="jingci.b2-live-smoke.v1",
            status="passed",
            object_key=key,
            payload_sha256=expected_sha256,
            readback_sha256=readback_sha256,
            cleanup_deleted=True,
        )
    finally:
        if uploaded:
            try:
                backend.delete(key)
            except Exception as cleanup_error:
                backend.close()
                raise RuntimeError(f"B2 smoke cleanup failed for object key {key}") from cleanup_error
        backend.close()


def build_plan() -> dict[str, Any]:
    return {
        "schema_version": "jingci.b2-live-smoke-plan.v1",
        "network": False,
        "required_confirmation": f"{LIVE_CONFIRMATION_ENV}={LIVE_CONFIRMATION_VALUE}",
        "required_configuration": ["B2_BUCKET", "B2_REGION", "B2_KEY_ID", "B2_APP_KEY"],
        "object_prefix": f"{SMOKE_PREFIX}/",
        "operations": ["put", "exists", "get", "sha256", "delete", "confirm_absent"],
        "bucket_mutations": False,
        "prints_credentials": False,
    }


def main(argv: list[str] | None = None, env: Mapping[str, str] = os.environ) -> int:
    parser = argparse.ArgumentParser(description="Plan or run the guarded Jingci B2 read-back smoke")
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--plan", action="store_true", help="print a credential-free, no-network plan")
    mode.add_argument("--live", action="store_true", help="run one authorized upload/read-back/delete smoke")
    args = parser.parse_args(argv)
    if args.plan:
        print(json.dumps(build_plan(), indent=2, sort_keys=True))
        return 0
    try:
        validate_live_authorization(env)
        config = B2Config.from_env(env)
        result = run_live_smoke(config)
    except (PermissionError, ValueError) as error:
        print(str(error), file=sys.stderr)
        return 2
    except Exception as error:
        print(f"live B2 smoke failed ({type(error).__name__}); no credential values were printed", file=sys.stderr)
        return 1
    print(json.dumps(asdict(result), indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
