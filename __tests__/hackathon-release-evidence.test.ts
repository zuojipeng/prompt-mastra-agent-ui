import { createHash } from 'node:crypto';
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { collectReleaseEvidence, scanSecrets } from '../scripts/collect-hackathon-evidence.mjs';
import {
  buildRedactedLiveAttestation,
  buildRedactedRecoveredAttestation,
} from '../scripts/attest-hackathon-live-result.mjs';
import { privateLiveResult } from './fixtures/hackathon-live-result';

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

function privateRecoveredResult() {
  const prefix = `jingci-smoke/20260717T133334Z/${'1'.repeat(32)}`;
  const asset = 'a'.repeat(64);
  const manifest = 'b'.repeat(64);
  return {
    schema_version: 'jingci.recovered-runway-b2-result.v1',
    status: 'passed',
    source: 'existing_succeeded_runway_task',
    prefix,
    task_id: '17f20503-6c24-4c16-946b-35dbbce2af2f',
    output_host: 'media.runway.test',
    asset_key: `${prefix}/assets/${asset.slice(0, 2)}/${asset.slice(2, 4)}/${asset}.mp4`,
    manifest_key: `${prefix}/manifests/54af6230-29dd-4ce7-987d-73d11e7ce4b7.json`,
    asset_sha256: asset,
    asset_size_bytes: 1_044_064,
    manifest_hash: manifest,
    probe: { codec: 'h264', width: 1280, height: 720, duration_seconds: 5.041667 },
    provider_create_count: 0,
    storage_cleanup: true,
    local_media_preserved: true,
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
    expect(evidence.gates.live_evidence).toMatchObject({
      status: 'absent',
      structurally_valid: true,
      strict_ready: false,
      blockers: ['redacted_live_attestation_missing'],
    });
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

  it('detects an assigned Runway secret without retaining its value', () => {
    const secret = `key_${'a'.repeat(128)}`;
    const findings = scanSecrets([
      { path: 'private-transcript.txt', content: `RUNWAYML_API_SECRET=${secret}\n` },
    ]);

    expect(findings).toEqual([
      { path: 'private-transcript.txt', line: 1, rule: 'assigned_secret' },
      { path: 'private-transcript.txt', line: 1, rule: 'runway_token' },
    ]);
    expect(JSON.stringify(findings)).not.toContain(secret);
  });

  it('detects raw Runway tokens in JSON and authorization headers', () => {
    const secret = `key_${'b'.repeat(128)}`;
    const findings = scanSecrets([
      { path: 'private-result.json', content: `{"token":"${secret}"}\n` },
      { path: 'request.txt', content: `Authorization: Bearer ${secret}\n` },
    ]);

    expect(findings).toEqual([
      { path: 'private-result.json', line: 1, rule: 'runway_token' },
      { path: 'request.txt', line: 1, rule: 'runway_token' },
    ]);
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

  it('incorporates a valid redacted attestation without promoting claims', () => {
    const root = fixtureRoot();
    const proofPath = 'docs/campaigns/backblaze-genmedia-2026/docs/proof.md';
    const attestationPath = 'artifacts/hackathon/backblaze-genmedia-2026/live-attestation.json';
    const absolute = path.join(root, attestationPath);
    mkdirSync(path.dirname(absolute), { recursive: true });
    const result = privateLiveResult();
    const built = buildRedactedLiveAttestation(result, Buffer.from(`${JSON.stringify(result, null, 2)}\n`), { expectedCommit: 'a'.repeat(40) });
    writeFileSync(absolute, `${JSON.stringify(built.attestation, null, 2)}\n`, { mode: 0o600 });

    const evidence = collectReleaseEvidence({ root, git: fakeGit([proofPath]), liveAttestationFile: attestationPath });
    expect(evidence.gates.live_evidence).toMatchObject({
      status: 'validated',
      structurally_valid: true,
      strict_ready: false,
      blockers: ['live_claims_promotion_approval_missing'],
      attestation: { source_commit: 'a'.repeat(40), claims_eligible: false },
    });
    expect(evidence.release_candidate).toBe(false);
  });

  it('incorporates a recovered-output attestation without promoting broader live claims', () => {
    const root = fixtureRoot();
    const proofPath = 'docs/campaigns/backblaze-genmedia-2026/docs/proof.md';
    const attestationPath = 'artifacts/hackathon/backblaze-genmedia-2026/live-attestation.json';
    const absolute = path.join(root, attestationPath);
    mkdirSync(path.dirname(absolute), { recursive: true });
    const result = privateRecoveredResult();
    const built = buildRedactedRecoveredAttestation(
      result,
      Buffer.from(`${JSON.stringify(result, null, 2)}\n`),
      { expectedCommit: 'a'.repeat(40) },
    );
    writeFileSync(absolute, `${JSON.stringify(built.attestation, null, 2)}\n`, { mode: 0o600 });

    const evidence = collectReleaseEvidence({ root, git: fakeGit([proofPath]), liveAttestationFile: attestationPath });
    expect(evidence.gates.live_evidence).toMatchObject({
      status: 'validated_recovery',
      structurally_valid: true,
      strict_ready: false,
      blockers: ['live_claims_promotion_approval_missing'],
      attestation: { source_commit: 'a'.repeat(40), claims_eligible: false },
    });
    expect(evidence.release_candidate).toBe(false);
  });

  it('fails closed when readiness asserts live claims without an attestation', () => {
    const root = fixtureRoot();
    const readinessPath = path.join(root, 'docs/campaigns/backblaze-genmedia-2026/submission-readiness.json');
    const readiness = JSON.parse(readFileSync(readinessPath, 'utf8'));
    readiness.claims.live_ai_media_provider = true;
    writeFileSync(readinessPath, JSON.stringify(readiness));

    const evidence = collectReleaseEvidence({
      root,
      git: fakeGit(['docs/campaigns/backblaze-genmedia-2026/docs/proof.md']),
    });
    expect(evidence.gates.live_evidence.errors).toContain('asserted_live_claims_require_attestation');
    expect(evidence.release_candidate).toBe(false);
  });

  it('does not let a valid attestation promote asserted live claims', () => {
    const root = fixtureRoot();
    const proofPath = 'docs/campaigns/backblaze-genmedia-2026/docs/proof.md';
    const campaign = path.join(root, 'docs/campaigns/backblaze-genmedia-2026');
    const readinessPath = path.join(campaign, 'submission-readiness.json');
    const readiness = JSON.parse(readFileSync(readinessPath, 'utf8'));
    readiness.claims.live_ai_media_provider = true;
    readiness.claims.live_b2_upload_readback = true;
    writeFileSync(readinessPath, JSON.stringify(readiness));
    const attestationPath = 'artifacts/hackathon/backblaze-genmedia-2026/live-attestation.json';
    const absolute = path.join(root, attestationPath);
    mkdirSync(path.dirname(absolute), { recursive: true });
    const result = privateLiveResult();
    const built = buildRedactedLiveAttestation(result, Buffer.from(`${JSON.stringify(result, null, 2)}\n`), { expectedCommit: 'a'.repeat(40) });
    writeFileSync(absolute, `${JSON.stringify(built.attestation, null, 2)}\n`, { mode: 0o600 });

    const evidence = collectReleaseEvidence({ root, git: fakeGit([proofPath]), liveAttestationFile: attestationPath });
    expect(evidence.gates.live_evidence.errors).toContain('asserted_live_claims_require_promotion_approval');
    expect(evidence.release_candidate).toBe(false);
  });

  it('rejects unsafe attestation permissions', () => {
    const root = fixtureRoot();
    const proofPath = 'docs/campaigns/backblaze-genmedia-2026/docs/proof.md';
    const attestationPath = 'artifacts/hackathon/backblaze-genmedia-2026/live-attestation.json';
    const absolute = path.join(root, attestationPath);
    mkdirSync(path.dirname(absolute), { recursive: true });
    writeFileSync(absolute, '{}', { mode: 0o600 });
    chmodSync(absolute, 0o644);

    const evidence = collectReleaseEvidence({ root, git: fakeGit([proofPath]), liveAttestationFile: attestationPath });
    expect(evidence.gates.live_evidence.errors).toContain('live_attestation_file_unsafe');
  });

  it('scans canonical attestation bytes before duplicate keys can hide a token', () => {
    const root = fixtureRoot();
    const proofPath = 'docs/campaigns/backblaze-genmedia-2026/docs/proof.md';
    const attestationPath = 'artifacts/hackathon/backblaze-genmedia-2026/live-attestation.json';
    const absolute = path.join(root, attestationPath);
    mkdirSync(path.dirname(absolute), { recursive: true });
    const result = privateLiveResult();
    const built = buildRedactedLiveAttestation(result, Buffer.from(`${JSON.stringify(result, null, 2)}\n`), { expectedCommit: 'a'.repeat(40) });
    const secret = `key_${'e'.repeat(128)}`;
    const canonical = JSON.stringify(built.attestation, null, 2);
    const malicious = canonical.replace(
      '"status": "validated"',
      `"status": "${secret}",\n  "status": "validated"`,
    );
    writeFileSync(absolute, `${malicious}\n`, { mode: 0o600 });

    const evidence = collectReleaseEvidence({ root, git: fakeGit([proofPath]), liveAttestationFile: attestationPath });
    expect(evidence.gates.live_evidence.errors).toEqual(expect.arrayContaining([
      'live_attestation_not_canonical',
      'live_attestation_secret_material',
    ]));
    expect(JSON.stringify(evidence)).not.toContain(secret);
  });
});
