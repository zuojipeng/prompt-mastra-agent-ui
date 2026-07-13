import { describe, expect, it } from 'vitest';
import {
  normalizeProvenanceRunRequest,
  normalizeProvenanceRun,
  PROVENANCE_RUN_REQUEST_SCHEMA_VERSION,
  PROVENANCE_RUN_SCHEMA_VERSION,
  PROVENANCE_RUN_STATUSES,
} from '@/lib/provenance-run-contract';

const sha256 = 'a'.repeat(64);

function run(overrides: Record<string, unknown> = {}) {
  return {
    schema_version: PROVENANCE_RUN_SCHEMA_VERSION,
    job_id: 'job-2',
    project_id: 'project-1',
    shot_id: 3,
    parent_job_id: 'job-1',
    attempt: 2,
    status: 'succeeded',
    provider: 'fal',
    model: 'veo-3',
    modality: 'video',
    created_at: '2026-07-13T15:00:00.000Z',
    updated_at: '2026-07-13T15:01:00.000Z',
    result: {
      asset: {
        url: 'https://f000.backblazeb2.com/file/jingci/assets/shot-3.mp4',
        media_type: 'video/mp4',
        sha256,
        size_bytes: 2048,
      },
      manifest: {
        uri: 'https://f000.backblazeb2.com/file/jingci/manifests/job-2.json',
        canonical_hash: sha256,
        verified: true,
      },
    },
    error: null,
    ...overrides,
  };
}

describe('provenance run contract', () => {
  it('normalizes one versioned shot submission request', () => {
    expect(normalizeProvenanceRunRequest({
      schema_version: PROVENANCE_RUN_REQUEST_SCHEMA_VERSION,
      project_id: 'project-1',
      shot_id: 3,
      parent_job_id: null,
      attempt: 1,
      prompt: '  cinematic tracking shot  ',
      negative_prompt: '',
      provider: ' genblaze-fixture ',
      model: ' local-proof ',
      modality: 'video',
    })).toMatchObject({
      prompt: 'cinematic tracking shot',
      provider: 'genblaze-fixture',
      attempt: 1,
    });
  });

  it('rejects incomplete or contradictory shot submission requests', () => {
    const base = {
      schema_version: PROVENANCE_RUN_REQUEST_SCHEMA_VERSION,
      project_id: 'project-1',
      shot_id: 3,
      parent_job_id: null,
      attempt: 1,
      prompt: 'cinematic tracking shot',
      negative_prompt: '',
      provider: 'genblaze-fixture',
      model: 'local-proof',
      modality: 'video',
    };
    expect(normalizeProvenanceRunRequest({ ...base, attempt: 0 })).toBeNull();
    expect(normalizeProvenanceRunRequest({ ...base, prompt: ' ' })).toBeNull();
    expect(normalizeProvenanceRunRequest({ ...base, parent_job_id: '' })).toBeNull();
    expect(normalizeProvenanceRunRequest({ ...base, parent_job_id: 'unexpected-parent' })).toBeNull();
    expect(normalizeProvenanceRunRequest({ ...base, attempt: 2, parent_job_id: null })).toBeNull();
  });

  it('keeps the lifecycle small and explicit', () => {
    expect(PROVENANCE_RUN_STATUSES).toEqual(['queued', 'running', 'succeeded', 'failed']);
  });

  it('accepts a verified result with retry lineage', () => {
    expect(normalizeProvenanceRun(run())).toMatchObject({
      job_id: 'job-2',
      parent_job_id: 'job-1',
      attempt: 2,
      status: 'succeeded',
      result: { manifest: { verified: true } },
    });
  });

  it('accepts non-terminal runs only without result evidence', () => {
    expect(normalizeProvenanceRun(run({ status: 'queued', result: null, error: null }))).not.toBeNull();
    expect(normalizeProvenanceRun(run({ status: 'running', result: null, error: null }))).not.toBeNull();
    expect(normalizeProvenanceRun(run({ status: 'running', error: 'contradiction' }))).toBeNull();
    expect(normalizeProvenanceRun(run({ status: 'running', result: { malformed: true }, error: null }))).toBeNull();
  });

  it('rejects incomplete success and unverified manifests', () => {
    expect(normalizeProvenanceRun(run({ result: null }))).toBeNull();
    expect(normalizeProvenanceRun(run({ error: 42 }))).toBeNull();
    const unverified = run();
    (unverified.result as { manifest: { verified: boolean } }).manifest.verified = false;
    expect(normalizeProvenanceRun(unverified)).toBeNull();
  });

  it('requires failures to carry one recoverable error and no result', () => {
    expect(normalizeProvenanceRun(run({ status: 'failed', result: null, error: 'provider timeout' }))).not.toBeNull();
    expect(normalizeProvenanceRun(run({ status: 'failed', result: null, error: '' }))).toBeNull();
    expect(normalizeProvenanceRun(run({ status: 'failed', error: 'provider timeout' }))).toBeNull();
  });

  it('rejects malformed identities, timestamps, and hashes', () => {
    expect(normalizeProvenanceRun(run({ shot_id: 0 }))).toBeNull();
    expect(normalizeProvenanceRun(run({ updated_at: 'yesterday' }))).toBeNull();
    const malformedHash = run();
    (malformedHash.result as { asset: { sha256: string } }).asset.sha256 = 'not-a-sha';
    expect(normalizeProvenanceRun(malformedHash)).toBeNull();
  });
});
