import {
  normalizeProvenanceRun,
  normalizeProvenanceRunRequest,
  type ProvenanceRun,
  type ProvenanceRunRequest,
  type ProvenanceRunStatus,
} from './provenance-run-contract';

export type ProvenanceTransportMode = 'fixture' | 'local' | 'preview';

export function getProvenanceTransportMode(): ProvenanceTransportMode {
  const rawUrl = process.env.NEXT_PUBLIC_PROVENANCE_API_URL;
  if (!rawUrl) return 'fixture';
  return rawUrl === '/api/provenance' ? 'preview' : 'local';
}

function getProvenanceEndpoint(rawUrl = process.env.NEXT_PUBLIC_PROVENANCE_API_URL) {
  if (!rawUrl) throw new Error('Provenance adapter is not configured');
  if (rawUrl === '/api/provenance') return '/api/provenance/v1/provenance-runs';
  const url = new URL(rawUrl);
  if (url.protocol !== 'http:' || !['127.0.0.1', 'localhost'].includes(url.hostname)) {
    throw new Error('Local provenance adapter URL must use loopback HTTP');
  }
  return `${url.toString().replace(/\/$/, '')}/v1/provenance-runs`;
}

function buildClientRun(
  request: ProvenanceRunRequest,
  status: ProvenanceRunStatus,
  error: string | null = null,
): ProvenanceRun {
  const timestamp = new Date().toISOString();
  const run = normalizeProvenanceRun({
    schema_version: 'jingci.provenance-run.v1',
    job_id: `local-shot-${request.shot_id}-attempt-${request.attempt}`,
    project_id: request.project_id,
    shot_id: request.shot_id,
    parent_job_id: request.parent_job_id,
    attempt: request.attempt,
    status,
    provider: request.provider,
    model: request.model,
    modality: 'video',
    created_at: timestamp,
    updated_at: timestamp,
    result: null,
    error,
  });
  if (!run) throw new Error('Failed to build local provenance client state');
  return run;
}

function matchesRequest(run: ProvenanceRun, request: ProvenanceRunRequest) {
  return run.project_id === request.project_id
    && run.shot_id === request.shot_id
    && run.parent_job_id === request.parent_job_id
    && run.attempt === request.attempt;
}

export async function runProvenanceHttp({
  request: rawRequest,
  onUpdate,
  baseUrl,
  fetchImpl = fetch,
  timeoutMs = 10_000,
}: {
  request: unknown;
  onUpdate: (run: ProvenanceRun) => void;
  baseUrl?: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}) {
  const request = normalizeProvenanceRunRequest(rawRequest);
  if (!request) throw new Error('Invalid provenance run request');
  let endpoint: string;
  try {
    endpoint = getProvenanceEndpoint(baseUrl);
  } catch {
    const failed = buildClientRun(request, 'failed', 'Provenance adapter URL is invalid');
    onUpdate(failed);
    return failed;
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  onUpdate(buildClientRun(request, 'queued'));
  await Promise.resolve();
  onUpdate(buildClientRun(request, 'running'));
  try {
    const response = await fetchImpl(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const run = normalizeProvenanceRun(await response.json());
    if (!run || !matchesRequest(run, request)) {
      throw new Error('Provenance adapter returned an invalid run');
    }
    onUpdate(run);
    return run;
  } catch (error) {
    const message = error instanceof DOMException && error.name === 'AbortError'
      ? 'Provenance adapter timed out'
      : 'Provenance adapter unavailable';
    const failed = buildClientRun(request, 'failed', message);
    onUpdate(failed);
    return failed;
  } finally {
    clearTimeout(timeout);
  }
}
