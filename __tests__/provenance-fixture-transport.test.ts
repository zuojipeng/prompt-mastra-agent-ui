import { describe, expect, it } from 'vitest';
import { runProvenanceFixture } from '@/lib/provenance-fixture-transport';
import { PROVENANCE_RUN_REQUEST_SCHEMA_VERSION } from '@/lib/provenance-run-contract';

function request(overrides: Record<string, unknown> = {}) {
  return {
    schema_version: PROVENANCE_RUN_REQUEST_SCHEMA_VERSION,
    project_id: 'project-1',
    shot_id: 1,
    parent_job_id: null,
    attempt: 1,
    prompt: 'slow tracking shot',
    negative_prompt: 'flicker',
    provider: 'genblaze-fixture',
    model: 'local-proof',
    modality: 'video',
    ...overrides,
  };
}

describe('provenance fixture transport', () => {
  it('emits the complete verified lifecycle without network access', async () => {
    const updates: string[] = [];
    const result = await runProvenanceFixture({
      request: request(),
      delayMs: 0,
      onUpdate: (run) => updates.push(run.status),
    });
    expect(updates).toEqual(['queued', 'running', 'succeeded']);
    expect(result.result).toMatchObject({ manifest: { verified: true } });
    expect(result.result?.asset.url).toContain('fixture.invalid/backblaze-b2');
  });

  it('preserves parent lineage for a retry', async () => {
    const result = await runProvenanceFixture({
      request: request({ parent_job_id: 'fixture-shot-1-attempt-1', attempt: 2 }),
      delayMs: 0,
      onUpdate: () => {},
    });
    expect(result).toMatchObject({
      job_id: 'fixture-shot-1-attempt-2',
      parent_job_id: 'fixture-shot-1-attempt-1',
      attempt: 2,
    });
  });

  it('can exercise a recoverable provider failure', async () => {
    const result = await runProvenanceFixture({
      request: request(),
      delayMs: 0,
      outcome: 'failed',
      onUpdate: () => {},
    });
    expect(result).toMatchObject({ status: 'failed', result: null, error: 'Fixture provider timeout' });
  });

  it('rejects invalid requests before emitting state', async () => {
    const updates: string[] = [];
    await expect(runProvenanceFixture({
      request: request({ prompt: '' }),
      delayMs: 0,
      onUpdate: (run) => updates.push(run.status),
    })).rejects.toThrow('Invalid provenance run request');
    expect(updates).toEqual([]);
  });
});
