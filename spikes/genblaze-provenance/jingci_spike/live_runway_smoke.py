from __future__ import annotations

import argparse
import json
import os
import re
import resource
import shutil
import subprocess
import sys
import tempfile
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any, Callable, Mapping

from genblaze_core import Modality, Step

from .runway_client import RunwayHttpClient, UrllibHttpTransport
from .runway_provider import (
    RUNWAY_API_VERSION,
    RUNWAY_DURATION_SECONDS,
    RUNWAY_ESTIMATED_COST_USD,
    RUNWAY_MODEL,
    RUNWAY_RATIO,
    RunwayProviderConfig,
    RunwayVideoProvider,
)


LIVE_CONFIRMATION_ENV = "JINGCI_ALLOW_LIVE_RUNWAY_SMOKE"
LIVE_CONFIRMATION_VALUE = "RUNWAY gen4.5 5s ONE ATTEMPT MAX $0.60"
API_SECRET_ENV = "RUNWAYML_API_SECRET"
OUTPUT_HOSTS_ENV = "JINGCI_RUNWAY_OUTPUT_HOSTS"
SMOKE_PROMPT = "A locked camera watches morning light move across a clean studio table, cinematic realism."
_SECRET_PATTERN = re.compile(r"^key_[0-9a-f]{128}$")
_HOST_PATTERN = re.compile(r"^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$")
MAX_PROBE_OUTPUT_BYTES = 1024 * 1024


@dataclass(frozen=True)
class RunwayLiveConfig:
    api_secret: str
    output_hosts: tuple[str, ...]

    @classmethod
    def from_env(cls, env: Mapping[str, str]) -> "RunwayLiveConfig":
        secret = env.get(API_SECRET_ENV, "")
        if not _SECRET_PATTERN.fullmatch(secret):
            raise ValueError(f"{API_SECRET_ENV} is missing or malformed")
        raw_hosts = env.get(OUTPUT_HOSTS_ENV, "")
        hosts = tuple(part.strip().lower() for part in raw_hosts.split(",") if part.strip())
        if not hosts or len(set(hosts)) != len(hosts) or any(not _HOST_PATTERN.fullmatch(host) for host in hosts):
            raise ValueError(f"{OUTPUT_HOSTS_ENV} must contain unique exact DNS host names")
        return cls(secret, hosts)

    def redacted_summary(self) -> dict[str, Any]:
        return {"api_secret": "[redacted]", "output_hosts": list(self.output_hosts)}


@dataclass(frozen=True)
class VideoProbe:
    codec: str
    width: int
    height: int
    duration_seconds: float


@dataclass(frozen=True)
class RunwaySmokeResult:
    schema_version: str
    status: str
    provider: str
    model: str
    task_id: str
    asset_sha256: str
    asset_size_bytes: int
    probe: VideoProbe
    local_cleanup: bool


def validate_live_authorization(env: Mapping[str, str]) -> None:
    if env.get(LIVE_CONFIRMATION_ENV) != LIVE_CONFIRMATION_VALUE:
        raise PermissionError(
            f"live Runway smoke requires exact {LIVE_CONFIRMATION_ENV}={LIVE_CONFIRMATION_VALUE!r}"
        )


def probe_video(
    path: Path,
    *,
    runner: Callable[..., subprocess.CompletedProcess[bytes]] = subprocess.run,
) -> VideoProbe:
    ffprobe = shutil.which("ffprobe")
    if ffprobe is None:
        raise RuntimeError("Runway smoke ffprobe is unavailable")
    command = [
        ffprobe, "-v", "error", "-show_entries",
        "stream=index,codec_type,codec_name,width,height:format=duration",
        "-of", "json", str(path),
    ]
    with tempfile.TemporaryFile() as stdout_file, tempfile.TemporaryFile() as stderr_file:
        try:
            completed = runner(
                command,
                stdin=subprocess.DEVNULL,
                stdout=stdout_file,
                stderr=stderr_file,
                timeout=30,
                check=False,
                close_fds=True,
                env={"LC_ALL": "C"},
                preexec_fn=_limit_probe_output,
            )
        except (OSError, subprocess.TimeoutExpired) as exc:
            raise RuntimeError("Runway smoke ffprobe could not complete") from exc
        if completed.returncode != 0 or stdout_file.tell() > MAX_PROBE_OUTPUT_BYTES:
            raise RuntimeError("Runway smoke output failed ffprobe")
        stdout_file.seek(0)
        probe_stdout = stdout_file.read(MAX_PROBE_OUTPUT_BYTES + 1)
    try:
        payload = json.loads(probe_stdout)
        video_streams = [stream for stream in payload["streams"] if stream.get("codec_type") == "video"]
        duration = float(payload["format"]["duration"])
    except (KeyError, TypeError, ValueError, json.JSONDecodeError) as exc:
        raise RuntimeError("Runway smoke ffprobe response was malformed") from exc
    if len(video_streams) != 1:
        raise RuntimeError("Runway smoke expected exactly one video stream")
    stream = video_streams[0]
    codec = stream.get("codec_name")
    width = stream.get("width")
    height = stream.get("height")
    if codec not in {"h264", "hevc", "av1"} or width != 1280 or height != 720:
        raise RuntimeError("Runway smoke video codec or dimensions were unexpected")
    if not 3.5 <= duration <= 6.5:
        raise RuntimeError("Runway smoke video duration was outside tolerance")
    return VideoProbe(str(codec), int(width), int(height), duration)


def _limit_probe_output() -> None:
    resource.setrlimit(resource.RLIMIT_FSIZE, (MAX_PROBE_OUTPUT_BYTES, MAX_PROBE_OUTPUT_BYTES))


def run_live_smoke(
    config: RunwayLiveConfig,
    *,
    client_factory: Callable[[RunwayLiveConfig], Any] | None = None,
    probe: Callable[[Path], VideoProbe] = probe_video,
) -> RunwaySmokeResult:
    factory = client_factory or (
        lambda value: RunwayHttpClient(value.api_secret, UrllibHttpTransport())
    )
    with tempfile.TemporaryDirectory(prefix="jingci-runway-live-") as directory:
        output_dir = Path(directory)
        provider = RunwayVideoProvider(
            factory(config),
            RunwayProviderConfig(output_dir, config.output_hosts),
        )
        step = provider.generate(
            Step(
                provider="runway", model=RUNWAY_MODEL, modality=Modality.VIDEO,
                prompt=SMOKE_PROMPT, params={"jingci_shot_id": 1},
            )
        )
        asset = step.assets[0]
        path = Path(asset.url.removeprefix("file://"))
        media_probe = probe(path)
        result = RunwaySmokeResult(
            "jingci.runway-live-smoke.v1", "passed", "runway", RUNWAY_MODEL,
            str(step.metadata["upstream_id"]), str(asset.sha256), int(asset.size_bytes or 0),
            media_probe, True,
        )
    if output_dir.exists():
        raise RuntimeError("Runway smoke temporary output cleanup failed")
    return result


def build_plan() -> dict[str, Any]:
    return {
        "schema_version": "jingci.runway-live-smoke-plan.v1",
        "network": False,
        "provider": "runway",
        "model": RUNWAY_MODEL,
        "api_version": RUNWAY_API_VERSION,
        "ratio": RUNWAY_RATIO,
        "duration_seconds": RUNWAY_DURATION_SECONDS,
        "maximum_attempts": 1,
        "maximum_estimated_cost_usd": RUNWAY_ESTIMATED_COST_USD,
        "required_confirmation": f"{LIVE_CONFIRMATION_ENV}={LIVE_CONFIRMATION_VALUE!r}",
        "required_configuration": [API_SECRET_ENV, OUTPUT_HOSTS_ENV],
        "verification": ["https redirect allowlist", "bounded bytes", "sha256", "ffprobe 1280x720 duration"],
        "cleanup": "remove local generated media on success or failure",
        "prints_credentials": False,
        "persists_media": False,
    }


def main(argv: list[str] | None = None, env: Mapping[str, str] = os.environ) -> int:
    parser = argparse.ArgumentParser(description="Plan or run one guarded Runway generation smoke")
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--plan", action="store_true")
    mode.add_argument("--live", action="store_true")
    args = parser.parse_args(argv)
    if args.plan:
        print(json.dumps(build_plan(), indent=2, sort_keys=True))
        return 0
    try:
        validate_live_authorization(env)
        result = run_live_smoke(RunwayLiveConfig.from_env(env))
    except (PermissionError, ValueError) as error:
        print(str(error), file=sys.stderr)
        return 2
    except Exception as error:
        print(f"live Runway smoke failed ({type(error).__name__}); no secret or signed URL was printed", file=sys.stderr)
        return 1
    print(json.dumps(asdict(result), indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
