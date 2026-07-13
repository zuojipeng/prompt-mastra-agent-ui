import { afterEach, describe, expect, it, vi } from 'vitest';
import { getProvenanceTransportMode, runProvenanceHttp } from '@/lib/provenance-http-client';
import { PROVENANCE_RUN_REQUEST_SCHEMA_VERSION } from '@/lib/provenance-run-contract';

function request() {
  return {
    schema_version: PROVENANCE_RUN_REQUEST_SCHEMA_VERSION,
    project_id: 'project-1',
    shot_id: 1,
    parent_job_id: null,
    attempt: 1,
    prompt: 'slow tracking shot',
    negative_prompt: '',
    provider: 'genblaze-local',
    model: 'local-proof',
    modality: 'video',
  };
}

function response(overrides: Record<string, unknown> = {}) {
  const sha256 = 'a'.repeat(64);
  return {
    schema_version: 'jingci.provenance-run.v1',
    job_id: 'local-shot-1-attempt-1',
    project_id: 'project-1',
    shot_id: 1,
    parent_job_id: null,
    attempt: 1,
    status: 'succeeded',
    provider: 'jingci-local-video',
    model: 'local-proof',
    modality: 'video',
    created_at: '2026-07-13T15:00:00Z',
    updated_at: '2026-07-13T15:00:00Z',
    result: {
      asset: { url: 'memory://asset', media_type: 'video/mp4', sha256, size_bytes: 1024 },
      manifest: { uri: 'memory://manifest', canonical_hash: sha256, verified: true },
    },
    error: null,
    ...overrides,
  };
}

afterEach(() => {
  delete process.env.NEXT_PUBLIC_PROVENANCE_API_URL;
});

describe('provenance HTTP client', () => {
  it('keeps fixture as the default mode', () => {
    expect(getProvenanceTransportMode()).toBe('fixture');
    process.env.NEXT_PUBLIC_PROVENANCE_API_URL = 'http://127.0.0.1:8788';
    expect(getProvenanceTransportMode()).toBe('local');
  });

  it('posts to loopback and emits queued, running, succeeded', async () => {
    const updates: string[] = [];
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true, json: async () => response() });
    const result = await runProvenanceHttp({
      request: request(),
      baseUrl: 'http://127.0.0.1:8788',
      fetchImpl: fetchImpl as typeof fetch,
      onUpdate: (run) => updates.push(run.status),
    });
    expect(updates).toEqual(['queued', 'running', 'succeeded']);
    expect(result.result?.manifest.verified).toBe(true);
    expect(fetchImpl).toHaveBeenCalledWith(
      'http://127.0.0.1:8788/v1/provenance-runs',
      expect.objectContaining({ method: 'POST', body: JSON.stringify(request()) }),
    );
  });

  it('fails closed on identity drift or HTTP failure', async () => {
    const driftUpdates: string[] = [];
    const drift = await runProvenanceHttp({
      request: request(),
      baseUrl: 'http://localhost:8788',
      fetchImpl: vi.fn().mockResolvedValue({ ok: true, json: async () => response({ shot_id: 2 }) }) as typeof fetch,
      onUpdate: (run) => driftUpdates.push(run.status),
    });
    expect(drift.status).toBe('failed');
    expect(drift.error).toBe('Local provenance adapter unavailable');
    expect(driftUpdates).toEqual(['queued', 'running', 'failed']);

    const httpFailure = await runProvenanceHttp({
      request: request(),
      baseUrl: 'http://localhost:8788',
      fetchImpl: vi.fn().mockResolvedValue({ ok: false, status: 500 }) as typeof fetch,
      onUpdate: () => {},
    });
    expect(httpFailure.status).toBe('failed');
  });

  it('turns an aborted request into a recoverable timeout run', async () => {
    const fetchImpl = vi.fn((_url: string, init?: RequestInit) => new Promise((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
    }));
    const result = await runProvenanceHttp({
      request: request(),
      baseUrl: 'http://127.0.0.1:8788',
      fetchImpl: fetchImpl as typeof fetch,
      timeoutMs: 0,
      onUpdate: () => {},
    });
    expect(result).toMatchObject({ status: 'failed', error: 'Local provenance adapter timed out' });
  });

  it('refuses non-loopback endpoints before fetch', async () => {
    const fetchImpl = vi.fn();
    const result = await runProvenanceHttp({
      request: request(),
      baseUrl: 'https://example.com',
      fetchImpl: fetchImpl as typeof fetch,
      onUpdate: () => {},
    });
    expect(result).toMatchObject({ status: 'failed', error: 'Local provenance adapter URL is invalid' });
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
