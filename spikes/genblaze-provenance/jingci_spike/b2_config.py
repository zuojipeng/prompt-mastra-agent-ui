from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Callable, Mapping

from genblaze_s3 import S3StorageBackend


REQUIRED_B2_ENV = ("B2_BUCKET", "B2_REGION", "B2_KEY_ID", "B2_APP_KEY")


@dataclass(frozen=True)
class B2Config:
    bucket: str
    region: str
    key_id: str
    app_key: str

    @classmethod
    def from_env(cls, env: Mapping[str, str]) -> "B2Config":
        missing = [name for name in REQUIRED_B2_ENV if not env.get(name, "").strip()]
        if missing:
            raise ValueError(f"missing required B2 configuration: {', '.join(missing)}")
        return cls(
            bucket=env["B2_BUCKET"].strip(),
            region=env["B2_REGION"].strip(),
            key_id=env["B2_KEY_ID"].strip(),
            app_key=env["B2_APP_KEY"].strip(),
        )

    def redacted_summary(self) -> dict[str, str]:
        return {
            "bucket": self.bucket,
            "region": self.region,
            "key_id": _redact(self.key_id),
            "app_key": "[redacted]",
        }


BackendFactory = Callable[..., Any]


def build_offline_backblaze_backend(
    config: B2Config,
    backend_factory: BackendFactory = S3StorageBackend.for_backblaze,
) -> Any:
    """Construct the B2-shaped backend without network preflight or lifecycle mutation."""

    return backend_factory(
        config.bucket,
        region=config.region,
        key_id=config.key_id,
        app_key=config.app_key,
        preflight=False,
        auto_lifecycle=False,
    )


def _redact(value: str) -> str:
    if len(value) <= 4:
        return "[redacted]"
    return f"{value[:2]}...{value[-2:]}"
