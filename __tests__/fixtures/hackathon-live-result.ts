export const liveResultCommit = 'a'.repeat(40);

export function privateLiveResult() {
  const digest = 'b'.repeat(64);
  const prefix = `jingci-smoke/20260715T000000Z/${'1'.repeat(32)}`;
  return {
    schema_version: 'jingci.hackathon-live-result.v1',
    status: 'passed',
    run_id: 'run-001',
    started_at: '2026-07-15T00:00:00Z',
    finished_at: '2026-07-15T00:03:00Z',
    source: { commit: liveResultCommit, clean: true },
    approval: {
      approval_id: 'approval-001',
      approval_document_sha256: 'd'.repeat(64),
      run_id: 'run-001',
      commit: liveResultCommit,
      human_actor: 'human-owner',
      approved_at: '2026-07-14T23:55:00Z',
      expires_at: '2026-07-15T00:10:00Z',
      consumed_at: '2026-07-15T00:00:01Z',
      maximum_attempts: 1,
      maximum_estimated_cost_usd: 0.6,
    },
    provider: {
      name: 'runway',
      model: 'gen4.5',
      api_version: '2024-11-06',
      task_id: 'task-001',
      create_attempts: 1,
      duration_seconds: 5,
      ratio: '1280:720',
      completed_at: '2026-07-15T00:01:00Z',
    },
    media: { container: 'mp4', bytes: 1024, duration_seconds: 5.01, width: 1280, height: 720, sha256: digest },
    storage: {
      backend: 'backblaze_b2',
      owned_prefix: prefix,
      asset_key: `${prefix}/assets/${digest}.mp4`,
      manifest_key: `${prefix}/manifests/${'c'.repeat(64)}.json`,
      asset_sha256: digest,
      manifest_hash: 'c'.repeat(64),
      readback_verified: true,
      lineage_verified: true,
    },
    cleanup: {
      status: 'complete',
      deleted_keys: [`${prefix}/manifests/${'c'.repeat(64)}.json`, `${prefix}/assets/${digest}.mp4`],
      absence_confirmed: true,
      residual_keys: [] as string[],
      backend_closed: true,
      local_media_removed: true,
      completed_at: '2026-07-15T00:02:00Z',
    },
    evidence: { scan_requested: true },
  };
}
