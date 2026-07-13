export const PROVENANCE_RUN_SCHEMA_VERSION = 'jingci.provenance-run.v1' as const;
export const PROVENANCE_RUN_REQUEST_SCHEMA_VERSION = 'jingci.provenance-run-request.v1' as const;

export const PROVENANCE_RUN_STATUSES = ['queued', 'running', 'succeeded', 'failed'] as const;

export type ProvenanceRunStatus = (typeof PROVENANCE_RUN_STATUSES)[number];

export type ProvenanceRunRequest = {
  schema_version: typeof PROVENANCE_RUN_REQUEST_SCHEMA_VERSION;
  project_id: string;
  shot_id: number;
  parent_job_id: string | null;
  attempt: number;
  prompt: string;
  negative_prompt: string;
  provider: string;
  model: string;
  modality: 'video';
};

export type ProvenanceRunResult = {
  asset: {
    url: string;
    media_type: string;
    sha256: string;
    size_bytes: number;
  };
  manifest: {
    uri: string;
    canonical_hash: string;
    verified: true;
  };
};

export type ProvenanceRun = {
  schema_version: typeof PROVENANCE_RUN_SCHEMA_VERSION;
  job_id: string;
  project_id: string;
  shot_id: number;
  parent_job_id: string | null;
  attempt: number;
  status: ProvenanceRunStatus;
  provider: string;
  model: string;
  modality: 'video';
  created_at: string;
  updated_at: string;
  result: ProvenanceRunResult | null;
  error: string | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isSha256(value: unknown): value is string {
  return typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
}

function isIsoTimestamp(value: unknown): value is string {
  return isNonEmptyString(value) && !Number.isNaN(Date.parse(value));
}

export function normalizeProvenanceRunRequest(value: unknown): ProvenanceRunRequest | null {
  if (!isRecord(value)) return null;
  if (
    value.schema_version !== PROVENANCE_RUN_REQUEST_SCHEMA_VERSION
    || !isNonEmptyString(value.project_id)
    || typeof value.shot_id !== 'number'
    || !Number.isInteger(value.shot_id)
    || value.shot_id < 1
    || !(value.parent_job_id === null || isNonEmptyString(value.parent_job_id))
    || typeof value.attempt !== 'number'
    || !Number.isInteger(value.attempt)
    || value.attempt < 1
    || (value.attempt === 1 && value.parent_job_id !== null)
    || (value.attempt > 1 && !isNonEmptyString(value.parent_job_id))
    || !isNonEmptyString(value.prompt)
    || typeof value.negative_prompt !== 'string'
    || !isNonEmptyString(value.provider)
    || !isNonEmptyString(value.model)
    || value.modality !== 'video'
  ) {
    return null;
  }
  return {
    schema_version: PROVENANCE_RUN_REQUEST_SCHEMA_VERSION,
    project_id: value.project_id,
    shot_id: value.shot_id,
    parent_job_id: value.parent_job_id,
    attempt: value.attempt,
    prompt: value.prompt.trim(),
    negative_prompt: value.negative_prompt.trim(),
    provider: value.provider.trim(),
    model: value.model.trim(),
    modality: 'video',
  };
}

function normalizeResult(value: unknown): ProvenanceRunResult | null {
  if (!isRecord(value) || !isRecord(value.asset) || !isRecord(value.manifest)) return null;
  const { asset, manifest } = value;
  if (
    !isNonEmptyString(asset.url)
    || !isNonEmptyString(asset.media_type)
    || !isSha256(asset.sha256)
    || typeof asset.size_bytes !== 'number'
    || !Number.isFinite(asset.size_bytes)
    || asset.size_bytes < 1
    || !isNonEmptyString(manifest.uri)
    || !isSha256(manifest.canonical_hash)
    || manifest.verified !== true
  ) {
    return null;
  }
  return {
    asset: {
      url: asset.url,
      media_type: asset.media_type,
      sha256: asset.sha256,
      size_bytes: asset.size_bytes,
    },
    manifest: {
      uri: manifest.uri,
      canonical_hash: manifest.canonical_hash,
      verified: true,
    },
  };
}

export function normalizeProvenanceRun(value: unknown): ProvenanceRun | null {
  if (!isRecord(value)) return null;
  if (
    value.schema_version !== PROVENANCE_RUN_SCHEMA_VERSION
    || !isNonEmptyString(value.job_id)
    || !isNonEmptyString(value.project_id)
    || typeof value.shot_id !== 'number'
    || !Number.isInteger(value.shot_id)
    || value.shot_id < 1
    || !(value.parent_job_id === null || isNonEmptyString(value.parent_job_id))
    || typeof value.attempt !== 'number'
    || !Number.isInteger(value.attempt)
    || value.attempt < 1
    || !PROVENANCE_RUN_STATUSES.includes(value.status as ProvenanceRunStatus)
    || !isNonEmptyString(value.provider)
    || !isNonEmptyString(value.model)
    || value.modality !== 'video'
    || !isIsoTimestamp(value.created_at)
    || !isIsoTimestamp(value.updated_at)
  ) {
    return null;
  }

  const result = value.result === null ? null : normalizeResult(value.result);
  const error = value.error === null ? null : isNonEmptyString(value.error) ? value.error : null;

  // Terminal-state invariants stop incomplete or contradictory external evidence at the boundary.
  if (value.status === 'succeeded' && (!result || value.error !== null)) return null;
  if (value.status === 'failed' && (value.result !== null || error === null)) return null;
  if (
    (value.status === 'queued' || value.status === 'running')
    && (value.result !== null || value.error !== null)
  ) return null;

  return {
    schema_version: PROVENANCE_RUN_SCHEMA_VERSION,
    job_id: value.job_id,
    project_id: value.project_id,
    shot_id: value.shot_id,
    parent_job_id: value.parent_job_id,
    attempt: value.attempt,
    status: value.status as ProvenanceRunStatus,
    provider: value.provider,
    model: value.model,
    modality: 'video',
    created_at: value.created_at,
    updated_at: value.updated_at,
    result,
    error,
  };
}
