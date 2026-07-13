from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


SCHEMA_VERSION = "jingci.shot-provenance.v1"
RUN_REQUEST_SCHEMA_VERSION = "jingci.provenance-run-request.v1"
SUPPORTED_MODALITIES = {"video", "image", "audio"}


@dataclass(frozen=True)
class ProvenanceRunRequest:
    schema_version: str
    project_id: str
    shot_id: int
    parent_job_id: str | None
    attempt: int
    prompt: str
    negative_prompt: str
    provider: str
    model: str
    modality: str

    @classmethod
    def from_dict(cls, value: Any) -> "ProvenanceRunRequest":
        if not isinstance(value, dict):
            raise ValueError("request must be an object")
        schema_version = _required_string(value, "schema_version")
        if schema_version != RUN_REQUEST_SCHEMA_VERSION:
            raise ValueError(f"unsupported schema_version: {schema_version}")
        shot_id = value.get("shot_id")
        if not isinstance(shot_id, int) or isinstance(shot_id, bool) or shot_id < 1:
            raise ValueError("shot_id must be a positive integer")
        attempt = value.get("attempt")
        if not isinstance(attempt, int) or isinstance(attempt, bool) or attempt < 1:
            raise ValueError("attempt must be a positive integer")
        parent_job_id = value.get("parent_job_id")
        if parent_job_id is not None and (not isinstance(parent_job_id, str) or not parent_job_id.strip()):
            raise ValueError("parent_job_id must be null or a non-empty string")
        if attempt == 1 and parent_job_id is not None:
            raise ValueError("attempt 1 must not include parent_job_id")
        if attempt > 1 and parent_job_id is None:
            raise ValueError("retry attempts require parent_job_id")
        modality = _required_string(value, "modality").lower()
        if modality != "video":
            raise ValueError("local provenance service supports video only")
        negative_prompt = value.get("negative_prompt", "")
        if not isinstance(negative_prompt, str):
            raise ValueError("negative_prompt must be a string")
        return cls(
            schema_version=schema_version,
            project_id=_required_string(value, "project_id"),
            shot_id=shot_id,
            parent_job_id=parent_job_id.strip() if parent_job_id else None,
            attempt=attempt,
            prompt=_required_string(value, "prompt"),
            negative_prompt=negative_prompt.strip(),
            provider=_required_string(value, "provider"),
            model=_required_string(value, "model"),
            modality=modality,
        )


@dataclass(frozen=True)
class AssetEvidence:
    url: str
    media_type: str
    sha256: str

    @classmethod
    def from_dict(cls, value: Any) -> "AssetEvidence":
        if not isinstance(value, dict):
            raise ValueError("asset must be an object")
        url = _required_string(value, "url")
        media_type = _required_string(value, "media_type")
        sha256 = _required_string(value, "sha256").lower()
        if len(sha256) != 64 or any(char not in "0123456789abcdef" for char in sha256):
            raise ValueError("asset.sha256 must be a 64-character hexadecimal digest")
        return cls(url=url, media_type=media_type, sha256=sha256)


@dataclass(frozen=True)
class ShotProvenanceJob:
    schema_version: str
    job_id: str
    shot_id: int
    prompt: str
    negative_prompt: str
    provider: str
    model: str
    modality: str
    asset: AssetEvidence
    metadata: dict[str, str] = field(default_factory=dict)

    @classmethod
    def from_dict(cls, value: Any) -> "ShotProvenanceJob":
        if not isinstance(value, dict):
            raise ValueError("job must be an object")
        schema_version = _required_string(value, "schema_version")
        if schema_version != SCHEMA_VERSION:
            raise ValueError(f"unsupported schema_version: {schema_version}")
        shot_id = value.get("shot_id")
        if not isinstance(shot_id, int) or isinstance(shot_id, bool) or shot_id < 1:
            raise ValueError("shot_id must be a positive integer")
        modality = _required_string(value, "modality").lower()
        if modality not in SUPPORTED_MODALITIES:
            raise ValueError(f"unsupported modality: {modality}")
        metadata = value.get("metadata", {})
        if not isinstance(metadata, dict) or not all(
            isinstance(key, str) and isinstance(item, str) for key, item in metadata.items()
        ):
            raise ValueError("metadata must contain only string keys and values")
        negative_prompt = value.get("negative_prompt", "")
        if not isinstance(negative_prompt, str):
            raise ValueError("negative_prompt must be a string")
        return cls(
            schema_version=schema_version,
            job_id=_required_string(value, "job_id"),
            shot_id=shot_id,
            prompt=_required_string(value, "prompt"),
            negative_prompt=negative_prompt.strip(),
            provider=_required_string(value, "provider"),
            model=_required_string(value, "model"),
            modality=modality,
            asset=AssetEvidence.from_dict(value.get("asset")),
            metadata=dict(metadata),
        )


def _required_string(value: dict[str, Any], key: str) -> str:
    item = value.get(key)
    if not isinstance(item, str) or not item.strip():
        raise ValueError(f"{key} must be a non-empty string")
    return item.strip()
