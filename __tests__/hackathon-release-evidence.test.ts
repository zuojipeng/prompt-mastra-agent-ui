import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { collectReleaseEvidence, scanSecrets } from '../scripts/collect-hackathon-evidence.mjs';

const roots: string[] = [];

function fixtureRoot() {
  const root = mkdtempSync(path.join(tmpdir(), 'jingci-release-evidence-'));
  roots.push(root);
  const campaign = path.join(root, 'docs/campaigns/backblaze-genmedia-2026');
  mkdirSync(path.join(campaign, 'docs'), { recursive: true });
  writeFileSync(path.join(campaign, 'docs/proof.md'), 'reviewable proof\n');
  writeFileSync(
    path.join(campaign, 'submission-readiness.json'),
    JSON.stringify({
      schema_version: 'jingci.hackathon-submission-readiness.v1',
      status: 'draft',
      project_name: 'Jingci test',
      repository_url: 'https://github.com/example/jingci',
      submission_language: 'English',
      providers: [{ name: 'fixture' }],
      claims: {
        genblaze_local_pipeline: true,
        browser_python_integration: true,
        live_ai_media_provider: false,
        live_b2_upload_readback: false,
        public_campaign_deployment: false,
        submitted: false,
      },
      artifacts: ['docs/campaigns/backblaze-genmedia-2026/docs/proof.md'],
      blockers: ['live_b2_upload_readback'],
    }),
  );
  writeFileSync(
    path.join(campaign, 'deployment-readiness.json'),
    JSON.stringify({
      schema_version: 'jingci.hackathon-deployment-readiness.v1',
      status: 'design',
      access_model: 'test access layer',
      provenance_service: { current_mode: 'loopback-only' },
      controls: {
        exact_origin_cors: 'planned',
        reviewer_authentication: 'planned',
        edge_rate_limit: 'planned',
        request_schema_and_size_limit: 'implemented-local',
        concurrency_and_timeout_limit: 'planned',
        server_side_secrets: 'implemented-local',
        bucket_scoped_credentials: 'blocked-human',
        private_b2_objects: 'planned',
        provider_and_url_allowlist: 'planned',
        structured_redacted_logs: 'planned',
        health_and_dependency_checks: 'planned',
        rollback_feature_flag: 'planned',
        retention_and_cleanup: 'planned',
      },
      artifacts: ['docs/campaigns/backblaze-genmedia-2026/docs/proof.md'],
      blockers: ['deployment'],
    }),
  );
  return root;
}

function fakeGit(trackedFiles: string[], dirty = false) {
  return (_root: string, args: string[]) => {
    const command = args.join(' ');
    if (command === 'ls-files -z') return `${trackedFiles.join('\0')}\0`;
    if (command === 'branch --show-current') return 'spike/backblaze-provenance\n';
    if (command === 'rev-parse HEAD') return `${'a'.repeat(40)}\n`;
    if (command === 'status --porcelain') return dirty ? ' M proof.md\n' : '';
    throw new Error(`unexpected git command: ${command}`);
  };
}

afterEach(() => {
  for (const root of roots) rmSync(root, { recursive: true, force: true });
  roots.length = 0;
});

describe('hackathon release evidence', () => {
  it('produces stable hashes and preserves strict blockers', () => {
    const root = fixtureRoot();
    const proofPath = 'docs/campaigns/backblaze-genmedia-2026/docs/proof.md';
    const evidence = collectReleaseEvidence({ root, git: fakeGit([proofPath]) });

    expect(evidence.source).toEqual({ branch: 'spike/backblaze-provenance', commit: 'a'.repeat(40), clean: true });
    expect(evidence.release_candidate).toBe(false);
    expect(evidence.gates.submission.blockers).toEqual(['live_b2_upload_readback']);
    expect(evidence.gates.deployment.blockers).toEqual(['deployment']);
    expect(evidence.artifacts).toEqual([
      {
        path: proofPath,
        bytes: 17,
        sha256: createHash('sha256').update('reviewable proof\n').digest('hex'),
      },
    ]);
    expect(evidence.secret_scan.findings).toEqual([]);
    expect(evidence.secret_scan).toMatchObject({ tracked_files_total: 1, text_files_scanned: 1, exclusions: [] });
  });

  it('reports secret metadata without copying the secret value', () => {
    const secret = `ghp_${'A'.repeat(36)}`;
    const findings = scanSecrets([{ path: 'unsafe.txt', content: `token=${secret}\n` }]);

    expect(findings).toEqual([{ path: 'unsafe.txt', line: 1, rule: 'github_token' }]);
    expect(JSON.stringify(findings)).not.toContain(secret);
  });

  it('keeps a dirty tree out of release-candidate state', () => {
    const root = fixtureRoot();
    const proofPath = 'docs/campaigns/backblaze-genmedia-2026/docs/proof.md';
    const evidence = collectReleaseEvidence({ root, git: fakeGit([proofPath], true) });

    expect(evidence.source.clean).toBe(false);
    expect(evidence.release_candidate).toBe(false);
  });

  it('does not treat blocker-free draft states as strict readiness', () => {
    const root = fixtureRoot();
    const campaign = path.join(root, 'docs/campaigns/backblaze-genmedia-2026');
    for (const file of ['submission-readiness.json', 'deployment-readiness.json']) {
      const target = path.join(campaign, file);
      const payload = JSON.parse(readFileSync(target, 'utf8'));
      payload.blockers = [];
      writeFileSync(target, JSON.stringify(payload));
    }
    const proofPath = 'docs/campaigns/backblaze-genmedia-2026/docs/proof.md';
    const evidence = collectReleaseEvidence({ root, git: fakeGit([proofPath]) });

    expect(evidence.gates.submission.strict_ready).toBe(false);
    expect(evidence.gates.deployment.strict_ready).toBe(false);
    expect(evidence.release_candidate).toBe(false);
  });
});
