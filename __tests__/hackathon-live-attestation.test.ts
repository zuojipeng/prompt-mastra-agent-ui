import { chmodSync, linkSync, lstatSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
  attestPrivateLiveResultFile,
  buildRedactedLiveAttestation,
  evaluateRedactedLiveAttestation,
  validatePrivateLiveResult,
} from '../scripts/attest-hackathon-live-result.mjs';
import { liveResultCommit as commit, privateLiveResult } from './fixtures/hackathon-live-result';

const roots: string[] = [];

function canonical(value: unknown) {
  return Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
}

afterEach(() => {
  for (const root of roots) rmSync(root, { recursive: true, force: true });
  roots.length = 0;
});

describe('hackathon private live result attestation', () => {
  it('builds a deterministic redacted attestation with narrow non-promoted claims', () => {
    const result = privateLiveResult();
    const first = buildRedactedLiveAttestation(result, canonical(result), { expectedCommit: commit });
    const second = buildRedactedLiveAttestation(result, canonical(result), { expectedCommit: commit });

    expect(first.errors).toEqual([]);
    expect(first.attestation).toEqual(second.attestation);
    expect(first.attestation).toMatchObject({
      status: 'validated',
      source_commit: commit,
      corroborated_claims: { live_ai_media_provider: true, live_b2_upload_readback: true },
      claims_promotion_approval: false,
      claims_eligible: false,
    });
    expect(JSON.stringify(first.attestation)).not.toContain('approval-001');
    expect(JSON.stringify(first.attestation)).not.toContain('task-001');
    expect(JSON.stringify(first.attestation)).not.toContain('jingci-smoke/run-001');
  });

  it('rejects wrong commits, approval drift, retries, digest mismatch, and partial cleanup', () => {
    const result = privateLiveResult();
    result.approval.maximum_attempts = 2;
    result.approval.run_id = 'another-run';
    result.provider.create_attempts = 2;
    result.storage.asset_sha256 = 'e'.repeat(64);
    result.cleanup.residual_keys = [result.storage.asset_key];

    const errors = validatePrivateLiveResult(result, { expectedCommit: 'f'.repeat(40) });
    expect(errors).toEqual(expect.arrayContaining([
      'source_commit_mismatch',
      'approval_invalid',
      'provider_evidence_invalid',
      'storage_evidence_invalid',
      'cleanup_incomplete',
    ]));
  });

  it('rejects approval created or consumed after the run', () => {
    const result = privateLiveResult();
    result.approval.approved_at = '2026-07-15T00:04:00Z';
    result.approval.consumed_at = '2026-07-15T00:05:00Z';
    expect(validatePrivateLiveResult(result, { expectedCommit: commit })).toContain('approval_time_window_invalid');
  });

  it('rejects out-of-namespace keys, dot segments, and impossible dates', () => {
    const outside = privateLiveResult();
    outside.storage.owned_prefix = 'jingci-smoke/../outside';
    outside.storage.asset_key = `jingci-smoke/../outside/assets/${outside.storage.asset_sha256}.mp4`;
    outside.storage.manifest_key = `jingci-smoke/../outside/manifests/${outside.storage.manifest_hash}.json`;
    outside.cleanup.deleted_keys = [outside.storage.asset_key, outside.storage.manifest_key];
    expect(validatePrivateLiveResult(outside, { expectedCommit: commit })).toContain('storage_evidence_invalid');

    const impossiblePrefix = privateLiveResult();
    impossiblePrefix.storage.owned_prefix = `jingci-smoke/20260231T000000Z/${'1'.repeat(32)}`;
    impossiblePrefix.storage.asset_key = `${impossiblePrefix.storage.owned_prefix}/assets/${impossiblePrefix.storage.asset_sha256}.mp4`;
    impossiblePrefix.storage.manifest_key = `${impossiblePrefix.storage.owned_prefix}/manifests/${impossiblePrefix.storage.manifest_hash}.json`;
    impossiblePrefix.cleanup.deleted_keys = [impossiblePrefix.storage.asset_key, impossiblePrefix.storage.manifest_key];
    expect(validatePrivateLiveResult(impossiblePrefix, { expectedCommit: commit })).toContain('storage_evidence_invalid');

    const impossibleDate = privateLiveResult();
    impossibleDate.started_at = '2026-02-31T00:00:00Z';
    expect(validatePrivateLiveResult(impossibleDate, { expectedCommit: commit })).toContain('result_time_window_invalid');
  });

  it('rejects secret material and signed URLs without returning their values', () => {
    const secret = `key_${'a'.repeat(128)}`;
    const result = privateLiveResult() as ReturnType<typeof privateLiveResult> & { extra?: string };
    result.extra = `https://example.com/video.mp4?token=${secret}`;
    const evaluated = buildRedactedLiveAttestation(result, canonical(result), { expectedCommit: commit });

    expect(evaluated.errors).toEqual(expect.arrayContaining(['result_shape_invalid', 'secret_material_detected']));
    expect(JSON.stringify(evaluated)).not.toContain(secret);
  });

  it('rejects noncanonical JSON, including duplicate or hidden fields', () => {
    const result = privateLiveResult();
    const compact = Buffer.from(JSON.stringify(result));
    expect(buildRedactedLiveAttestation(result, compact, { expectedCommit: commit }).errors)
      .toContain('private_result_not_canonical');
  });

  it('writes only from a mode-0600 owner file to a new mode-0600 output', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'jingci-private-attestation-'));
    roots.push(root);
    const input = path.join(root, 'result.json');
    const output = path.join(root, 'attestation.json');
    writeFileSync(input, canonical(privateLiveResult()), { mode: 0o600 });

    attestPrivateLiveResultFile({ inputPath: input, outputPath: output, expectedCommit: commit });
    expect(lstatSync(output).mode & 0o777).toBe(0o600);
    expect(() => attestPrivateLiveResultFile({ inputPath: input, outputPath: output, expectedCommit: commit }))
      .toThrow('must not already exist');
  });

  it('rejects widened permissions, symlinks, and hard-linked inputs', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'jingci-private-attestation-'));
    roots.push(root);
    const original = path.join(root, 'original.json');
    const hardlink = path.join(root, 'hardlink.json');
    const symlink = path.join(root, 'symlink.json');
    writeFileSync(original, canonical(privateLiveResult()), { mode: 0o644 });
    expect(() => attestPrivateLiveResultFile({ inputPath: original, outputPath: path.join(root, 'out-1.json'), expectedCommit: commit }))
      .toThrow('mode must be 0600');
    writeFileSync(original, canonical(privateLiveResult()), { mode: 0o600 });
    chmodSync(original, 0o600);
    linkSync(original, hardlink);
    expect(() => attestPrivateLiveResultFile({ inputPath: original, outputPath: path.join(root, 'out-2.json'), expectedCommit: commit }))
      .toThrow('one hard link');
    symlinkSync(original, symlink);
    expect(() => attestPrivateLiveResultFile({ inputPath: symlink, outputPath: path.join(root, 'out-3.json'), expectedCommit: commit }))
      .toThrow('non-symlink');
  });

  it('rejects attestation tampering and any attempt to promote claims', () => {
    const result = privateLiveResult();
    const { attestation } = buildRedactedLiveAttestation(result, canonical(result), { expectedCommit: commit });
    const tampered = { ...attestation, claims_promotion_approval: true, claims_eligible: true };
    const evaluated = evaluateRedactedLiveAttestation(tampered, { expectedCommit: commit });
    expect(evaluated.errors).toContain('claims_promotion_not_supported');
  });
});
