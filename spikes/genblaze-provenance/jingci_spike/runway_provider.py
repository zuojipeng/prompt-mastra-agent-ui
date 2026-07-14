from __future__ import annotations

import hashlib
import ipaddress
import re
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Callable, Mapping, Protocol, Sequence
from urllib.parse import urlparse

from genblaze_core import Asset, Modality, Step, SyncProvider
from genblaze_core.exceptions import ProviderError
from genblaze_core.models.enums import ProviderErrorCode
from genblaze_core.providers.retry import RetryPolicy


RUNWAY_PROVIDER = "runway"
RUNWAY_MODEL = "gen4.5"
RUNWAY_RATIO = "1280:720"
RUNWAY_DURATION_SECONDS = 5
RUNWAY_ESTIMATED_COST_USD = 0.60
RUNWAY_API_VERSION = "2024-11-06"

_WAITING_STATUSES = frozenset({"PENDING", "THROTTLED", "RUNNING"})
_TERMINAL_STATUSES = frozenset({"SUCCEEDED", "FAILED", "CANCELED", "CANCELLED"})
_TASK_ID_PATTERN = re.compile(
    r"^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$",
    re.IGNORECASE,
)


class RunwayProviderError(ProviderError):
    """Stable, public-safe provider boundary failure."""

    def __init__(
        self,
        code: str,
        error_code: ProviderErrorCode = ProviderErrorCode.UNKNOWN,
    ) -> None:
        self.code = code
        super().__init__(f"runway provider failed: {code}", error_code=error_code)


class _SucceededOutputError(RunwayProviderError):
    """A terminal success with unusable output; DELETE would remove the result."""


@dataclass(frozen=True)
class DownloadedVideo:
    data: bytes
    content_type: str
    final_url: str


@dataclass(frozen=True)
class RunwayProviderConfig:
    output_dir: Path
    allowed_output_hosts: tuple[str, ...]
    timeout_seconds: float = 600.0
    poll_interval_seconds: float = 5.0
    max_output_bytes: int = 100 * 1024 * 1024
    request_timeout_seconds: float = 30.0
    cancellation_timeout_seconds: float = 5.0

    def __post_init__(self) -> None:
        normalized_hosts = tuple(host.strip().lower() for host in self.allowed_output_hosts)
        if not normalized_hosts or any(not host for host in normalized_hosts):
            raise ValueError("allowed_output_hosts must contain exact host names")
        if len(set(normalized_hosts)) != len(normalized_hosts):
            raise ValueError("allowed_output_hosts must not contain duplicates")
        if self.timeout_seconds <= 0:
            raise ValueError("timeout_seconds must be positive")
        if self.poll_interval_seconds < 5:
            raise ValueError("poll_interval_seconds must be at least 5 seconds")
        if self.max_output_bytes <= 0:
            raise ValueError("max_output_bytes must be positive")
        if self.request_timeout_seconds <= 0:
            raise ValueError("request_timeout_seconds must be positive")
        if not 0 < self.cancellation_timeout_seconds <= 5:
            raise ValueError("cancellation_timeout_seconds must be between 0 and 5")
        object.__setattr__(self, "allowed_output_hosts", normalized_hosts)
        object.__setattr__(self, "output_dir", self.output_dir.resolve())

    def redacted_summary(self) -> dict[str, Any]:
        return {
            "provider": RUNWAY_PROVIDER,
            "model": RUNWAY_MODEL,
            "ratio": RUNWAY_RATIO,
            "duration_seconds": RUNWAY_DURATION_SECONDS,
            "estimated_cost_usd": RUNWAY_ESTIMATED_COST_USD,
            "allowed_output_hosts": list(self.allowed_output_hosts),
            "timeout_seconds": self.timeout_seconds,
            "max_output_bytes": self.max_output_bytes,
            "api_version": RUNWAY_API_VERSION,
            "cancellation_timeout_seconds": self.cancellation_timeout_seconds,
            "credentials": "[not loaded by provider contract]",
        }


class RunwayTaskClient(Protocol):
    """Minimal transport seam; the live implementation belongs behind a human gate."""

    def create_text_video(
        self,
        *,
        prompt: str,
        model: str,
        ratio: str,
        duration_seconds: int,
        api_version: str,
        timeout_seconds: float,
    ) -> str: ...

    def get_task(
        self, task_id: str, *, api_version: str, timeout_seconds: float
    ) -> Mapping[str, Any]: ...

    def download_video(
        self,
        output_url: str,
        *,
        timeout_seconds: float,
        max_bytes: int,
        validate_redirect: Callable[[str], None],
    ) -> DownloadedVideo: ...

    def cancel_task(
        self, task_id: str, *, api_version: str, timeout_seconds: float
    ) -> None: ...


class RunwayVideoProvider(SyncProvider):
    """Credential-free Genblaze adapter contract for one Runway text-video task."""

    name = RUNWAY_PROVIDER

    def __init__(
        self,
        client: RunwayTaskClient,
        config: RunwayProviderConfig,
        *,
        monotonic: Callable[[], float] = time.monotonic,
        sleep: Callable[[float], None] = time.sleep,
    ) -> None:
        # A retry would create another paid generation. Retries are new, human-approved attempts.
        super().__init__(retry_policy=RetryPolicy(max_attempts=1))
        self.client = client
        self.config = config
        self.monotonic = monotonic
        self.sleep = sleep

    def invoke(self, step: Step, config: Any = None) -> Step:
        # Genblaze lets invocation config override provider retry policy. A fresh
        # Runway submission is billable, so callers cannot opt this provider into
        # automatic step retries.
        return super().invoke(step, self._single_attempt_config(config))

    async def ainvoke(self, step: Step, config: Any = None) -> Step:
        return await super().ainvoke(step, self._single_attempt_config(config))

    @staticmethod
    def _single_attempt_config(config: Any) -> dict[str, Any]:
        normalized = dict(config or {})
        normalized["max_retries"] = 0
        return normalized

    def generate(self, step: Step, config: Any = None) -> Step:
        del config
        prompt = (step.prompt or "").strip()
        if not prompt:
            raise RunwayProviderError("invalid_prompt", ProviderErrorCode.INVALID_INPUT)
        if len(prompt.encode("utf-16-le")) // 2 > 1000:
            raise RunwayProviderError("prompt_too_long", ProviderErrorCode.INVALID_INPUT)
        if step.model != RUNWAY_MODEL:
            raise RunwayProviderError("model_not_allowed", ProviderErrorCode.MODEL_ERROR)
        if step.modality != Modality.VIDEO:
            raise RunwayProviderError("modality_not_allowed", ProviderErrorCode.INVALID_INPUT)
        if step.negative_prompt:
            raise RunwayProviderError(
                "negative_prompt_not_supported", ProviderErrorCode.INVALID_INPUT
            )
        if step.inputs:
            raise RunwayProviderError("input_assets_not_supported", ProviderErrorCode.INVALID_INPUT)
        if set(step.params) - {"jingci_shot_id"}:
            raise RunwayProviderError("params_not_allowed", ProviderErrorCode.INVALID_INPUT)

        deadline = self.monotonic() + self.config.timeout_seconds
        request_timeout = self._remaining_request_timeout(deadline)
        try:
            task_id = self.client.create_text_video(
                prompt=prompt,
                model=RUNWAY_MODEL,
                ratio=RUNWAY_RATIO,
                duration_seconds=RUNWAY_DURATION_SECONDS,
                api_version=RUNWAY_API_VERSION,
                timeout_seconds=request_timeout,
            )
        except RunwayProviderError:
            raise
        except Exception as exc:
            raise RunwayProviderError("task_creation_failed") from exc
        if not isinstance(task_id, str) or not _TASK_ID_PATTERN.fullmatch(task_id.strip()):
            raise RunwayProviderError("malformed_task")

        task_id = task_id.strip()
        step.metadata["upstream_id"] = task_id
        step.metadata["runway_api_version"] = RUNWAY_API_VERSION
        try:
            output_url = self._wait_for_output(task_id, deadline)
        except RunwayProviderError as error:
            if error.code not in {"task_failed", "task_canceled"} and not isinstance(
                error, _SucceededOutputError
            ):
                self._cancel_once(task_id)
            raise
        except (KeyboardInterrupt, SystemExit):
            self._cancel_once(task_id)
            raise
        self._validate_output_url(output_url)

        remaining = deadline - self.monotonic()
        if remaining <= 0:
            raise RunwayProviderError("timeout", ProviderErrorCode.TIMEOUT)
        try:
            media = self.client.download_video(
                output_url,
                timeout_seconds=remaining,
                max_bytes=self.config.max_output_bytes,
                validate_redirect=self._validate_output_url,
            )
        except RunwayProviderError:
            raise
        except Exception as exc:
            raise RunwayProviderError("download_failed") from exc

        if self.monotonic() >= deadline:
            raise RunwayProviderError("timeout", ProviderErrorCode.TIMEOUT)
        if not isinstance(media, DownloadedVideo):
            raise RunwayProviderError("malformed_output")
        if not isinstance(media.content_type, str) or not isinstance(media.data, bytes):
            raise RunwayProviderError("malformed_output")

        self._validate_output_url(media.final_url)
        media_type = media.content_type.split(";", 1)[0].strip().lower()
        if media_type != "video/mp4":
            raise RunwayProviderError("invalid_media_type")
        if not media.data:
            raise RunwayProviderError("empty_output")
        if len(media.data) > self.config.max_output_bytes:
            raise RunwayProviderError("output_too_large")
        if len(media.data) < 12 or media.data[4:8] != b"ftyp":
            raise RunwayProviderError("invalid_mp4_container")

        digest = hashlib.sha256(media.data).hexdigest()
        output_path = self.config.output_dir / f"runway-{task_id}-{digest[:12]}.mp4"
        try:
            self.config.output_dir.mkdir(parents=True, exist_ok=True)
            output_path.write_bytes(media.data)
        except OSError as exc:
            raise RunwayProviderError("output_write_failed") from exc
        asset = Asset(
            url=output_path.as_uri(),
            media_type="video/mp4",
            metadata={"provider_output_host": urlparse(media.final_url).hostname},
        )
        asset.set_hash(media.data)
        step.assets.append(asset)
        step.cost_usd = RUNWAY_ESTIMATED_COST_USD
        step.provider_payload = {"task_id": task_id, "status": "SUCCEEDED"}
        return step

    def _wait_for_output(self, task_id: str, deadline: float) -> str:
        while True:
            if self.monotonic() >= deadline:
                raise RunwayProviderError("timeout", ProviderErrorCode.TIMEOUT)
            request_timeout = self._remaining_request_timeout(deadline)
            try:
                task = self.client.get_task(
                    task_id,
                    api_version=RUNWAY_API_VERSION,
                    timeout_seconds=request_timeout,
                )
            except RunwayProviderError:
                raise
            except Exception as exc:
                raise RunwayProviderError("task_poll_failed") from exc
            status = task.get("status")
            if not isinstance(status, str):
                raise RunwayProviderError("malformed_task")
            status = status.upper()
            if status not in _WAITING_STATUSES | _TERMINAL_STATUSES:
                raise RunwayProviderError("unknown_task_status")
            if status == "SUCCEEDED":
                output = task.get("output")
                if not isinstance(output, Sequence) or isinstance(output, (str, bytes)):
                    raise _SucceededOutputError("malformed_output")
                if len(output) != 1 or not isinstance(output[0], str):
                    raise _SucceededOutputError("malformed_output")
                return output[0]
            if status == "FAILED":
                raise RunwayProviderError("task_failed")
            if status in {"CANCELED", "CANCELLED"}:
                raise RunwayProviderError("task_canceled")
            remaining = deadline - self.monotonic()
            if remaining <= 0:
                continue
            self.sleep(min(self.config.poll_interval_seconds, remaining))

    def _cancel_once(self, task_id: str) -> None:
        try:
            self.client.cancel_task(
                task_id,
                api_version=RUNWAY_API_VERSION,
                timeout_seconds=self.config.cancellation_timeout_seconds,
            )
        except Exception:
            pass

    def _remaining_request_timeout(self, deadline: float) -> float:
        remaining = deadline - self.monotonic()
        if remaining <= 0:
            raise RunwayProviderError("timeout", ProviderErrorCode.TIMEOUT)
        return min(self.config.request_timeout_seconds, remaining)

    def _validate_output_url(self, value: str) -> None:
        try:
            parsed = urlparse(value)
            host = (parsed.hostname or "").lower()
            if parsed.scheme != "https" or not host:
                raise ValueError
            if parsed.username or parsed.password or parsed.port not in (None, 443):
                raise ValueError
            try:
                ipaddress.ip_address(host)
            except ValueError:
                pass
            else:
                raise ValueError
            if host not in self.config.allowed_output_hosts:
                raise ValueError
        except (TypeError, ValueError):
            raise RunwayProviderError("output_url_not_allowed") from None


class FakeRunwayTaskClient:
    """Scripted no-network client used to review the adapter before live approval."""

    def __init__(
        self,
        statuses: Sequence[str],
        media: DownloadedVideo,
        *,
        task_id: str = "17f20503-6c24-4c16-946b-35dbbce2af2f",
        output_url: str = "https://media.runway.test/output.mp4?signature=redacted",
        redirect_chain: Sequence[str] = (),
    ) -> None:
        self.statuses = list(statuses)
        self.media = media
        self.task_id = task_id
        self.output_url = output_url
        self.redirect_chain = tuple(redirect_chain)
        self.create_calls: list[dict[str, Any]] = []
        self.poll_count = 0
        self.download_count = 0
        self.cancel_count = 0
        self.cancel_timeouts: list[float] = []

    def create_text_video(self, **request: Any) -> str:
        self.create_calls.append(dict(request))
        return self.task_id

    def get_task(self, task_id: str, **_: Any) -> Mapping[str, Any]:
        self.poll_count += 1
        index = min(self.poll_count - 1, len(self.statuses) - 1)
        status = self.statuses[index] if self.statuses else "PENDING"
        return {"id": task_id, "status": status, "output": [self.output_url]}

    def download_video(
        self,
        output_url: str,
        *,
        validate_redirect: Callable[[str], None],
        **_: Any,
    ) -> DownloadedVideo:
        if output_url != self.output_url:
            raise AssertionError("unexpected output URL")
        for redirect_url in self.redirect_chain:
            validate_redirect(redirect_url)
        self.download_count += 1
        return self.media

    def cancel_task(self, task_id: str, **request: Any) -> None:
        if task_id != self.task_id:
            raise AssertionError("unexpected task ID")
        self.cancel_count += 1
        self.cancel_timeouts.append(float(request["timeout_seconds"]))
