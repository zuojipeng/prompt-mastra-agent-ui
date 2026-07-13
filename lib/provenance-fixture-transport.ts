import {
  normalizeProvenanceRun,
  normalizeProvenanceRunRequest,
  type ProvenanceRun,
  type ProvenanceRunRequest,
  type ProvenanceRunStatus,
} from './provenance-run-contract';

const FIXTURE_SHA256 = '76dfe3b390a8d7218a9597c15183ca453e032b7f5d0af36c97f3362c34a640ad';
const FIXTURE_MANIFEST_HASH = '0844e2ea42a6f63855caa156a19df28885c42a574a097394f2978ae1cd96e73e';

function buildFixtureRun(request: ProvenanceRunRequest, status: ProvenanceRunStatus): ProvenanceRun {
  const now = new Date().toISOString();
  const jobId = `fixture-shot-${request.shot_id}-attempt-${request.attempt}`;
  const value = {
    schema_version: 'jingci.provenance-run.v1',
    job_id: jobId,
    project_id: request.project_id,
    shot_id: request.shot_id,
    parent_job_id: request.parent_job_id,
    attempt: request.attempt,
    status,
    provider: request.provider,
    model: request.model,
    modality: 'video',
    created_at: now,
    updated_at: now,
    result: status === 'succeeded'
      ? {
          asset: {
            url: `https://fixture.invalid/backblaze-b2/assets/${jobId}.mp4`,
            media_type: 'video/mp4',
            sha256: FIXTURE_SHA256,
            size_bytes: 4_194_304,
          },
          manifest: {
            uri: `https://fixture.invalid/backblaze-b2/manifests/${jobId}.json`,
            canonical_hash: FIXTURE_MANIFEST_HASH,
            verified: true,
          },
        }
      : null,
    error: status === 'failed' ? 'Fixture provider timeout' : null,
  };
  const run = normalizeProvenanceRun(value);
  if (!run) throw new Error('Fixture produced an invalid provenance run');
  return run;
}

function wait(delayMs: number) {
  return new Promise((resolve) => setTimeout(resolve, delayMs));
}

export async function runProvenanceFixture({
  request: rawRequest,
  onUpdate,
  delayMs = 160,
  outcome = 'succeeded',
}: {
  request: unknown;
  onUpdate: (run: ProvenanceRun) => void;
  delayMs?: number;
  outcome?: 'succeeded' | 'failed';
}) {
  const request = normalizeProvenanceRunRequest(rawRequest);
  if (!request) throw new Error('Invalid provenance run request');
  onUpdate(buildFixtureRun(request, 'queued'));
  await wait(delayMs);
  onUpdate(buildFixtureRun(request, 'running'));
  await wait(delayMs);
  const terminalRun = buildFixtureRun(request, outcome);
  onUpdate(terminalRun);
  return terminalRun;
}
