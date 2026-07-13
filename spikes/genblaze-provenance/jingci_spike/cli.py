from __future__ import annotations

import argparse
import json
from pathlib import Path

from .contract import ShotProvenanceJob
from .manifest_adapter import build_verified_manifest


def main() -> int:
    parser = argparse.ArgumentParser(description="Build a verified Genblaze manifest for one Jingci shot")
    parser.add_argument("job", type=Path, help="Path to a jingci.shot-provenance.v1 JSON job")
    args = parser.parse_args()

    try:
        payload = json.loads(args.job.read_text(encoding="utf-8"))
        result = build_verified_manifest(ShotProvenanceJob.from_dict(payload))
    except (OSError, json.JSONDecodeError, ValueError) as error:
        parser.exit(1, f"error: {error}\n")
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
