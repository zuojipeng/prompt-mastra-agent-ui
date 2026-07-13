from __future__ import annotations

from typing import Any

from genblaze_core import Manifest, Modality, RunBuilder, RunStatus, StepBuilder, StepStatus

from .contract import ShotProvenanceJob


MODALITY_MAP = {
    "video": Modality.VIDEO,
    "image": Modality.IMAGE,
    "audio": Modality.AUDIO,
}


def build_verified_manifest(job: ShotProvenanceJob) -> dict[str, Any]:
    step_builder = (
        StepBuilder(job.provider, job.model)
        .prompt(job.prompt)
        .modality(MODALITY_MAP[job.modality])
        .params(jingci_shot_id=job.shot_id)
        .status(StepStatus.SUCCEEDED)
        .asset(
            job.asset.url,
            job.asset.media_type,
            sha256=job.asset.sha256,
        )
    )
    if job.negative_prompt:
        step_builder.negative_prompt(job.negative_prompt)
    step = step_builder.build()
    run = (
        RunBuilder(f"jingci-shot-{job.shot_id}")
        .status(RunStatus.COMPLETED)
        .add_step(step)
        .build()
    )
    manifest = Manifest.from_run(run)
    report = manifest.verification_report()
    if not manifest.verify():
        raise ValueError(f"Genblaze manifest verification failed: {report}")

    return {
        "schema_version": job.schema_version,
        "job_id": job.job_id,
        "shot_id": job.shot_id,
        "run_id": run.run_id,
        "manifest_hash": manifest.canonical_hash,
        "verified": True,
        "unverified_asset_ids": list(report.unverified_sha256_ids),
        "manifest": manifest.model_dump(mode="json"),
    }
