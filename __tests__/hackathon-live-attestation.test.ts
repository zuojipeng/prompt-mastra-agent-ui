import { chmodSync, linkSync, lstatSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
  attestPrivateLiveResultFile,
  buildRedactedRecoveredAttestation,
  buildRedactedLiveAttestation,
  evaluateRedactedRecoveredAttestation,
  evaluateRedactedLiveAttestation,
  validatePrivateRecoveredResult,
  validatePrivateLiveResult,
} from '../scripts/attest-hackathon-live-result.mjs';
import { liveResultCommit as commit, privateLiveResult } from './fixtures/hackathon-live-result';

const roots: string[] = [];

function canonical(value: unknown) {
  return Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
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

  it('attests a recovered succeeded task without claiming an atomic transaction or create count', () => {
    const result = privateRecoveredResult();
    const first = buildRedactedRecoveredAttestation(result, canonical(result), { expectedCommit: commit });
    const second = buildRedactedRecoveredAttestation(result, canonical(result), { expectedCommit: commit });

    expect(first.errors).toEqual([]);
    expect(first.attestation).toEqual(second.attestation);
    expect(first.attestation).toMatchObject({
      schema_version: 'jingci.hackathon-recovered-live-attestation.v1',
      status: 'validated_recovery',
      source_commit: commit,
      provider: { provider_create_count_in_recovery: 0 },
      corroborated_claims: {
        recovered_succeeded_runway_output: true,
        live_b2_upload_readback_cleanup: true,
      },
      unsupported_claims: {
        atomic_runway_to_b2_transaction: false,
        provider_create_attempt_count: false,
        public_serving: false,
      },
      claims_promotion_approval: false,
      claims_eligible: false,
    });
    const serialized = JSON.stringify(first.attestation);
    expect(serialized).not.toContain(result.task_id);
    expect(serialized).not.toContain(result.output_host);
    expect(serialized).not.toContain(result.prefix);
    expect(serialized).not.toContain(result.asset_key);
  });

  it('rejects recovery creates, key drift, digest drift, and incomplete cleanup', () => {
    const result = privateRecoveredResult();
    result.provider_create_count = 1;
    result.asset_key = `${result.prefix}/assets/${'c'.repeat(64)}.mp4`;
    result.probe.width = 1920;
    result.storage_cleanup = false;

    expect(validatePrivateRecoveredResult(result)).toEqual(expect.arrayContaining([
      'recovery_provider_create_forbidden',
      'recovered_storage_key_invalid',
      'recovered_probe_invalid',
      'recovered_cleanup_or_media_invalid',
    ]));
  });

  it('rejects recovery attestation tampering and claim promotion', () => {
    const result = privateRecoveredResult();
    const { attestation } = buildRedactedRecoveredAttestation(result, canonical(result), { expectedCommit: commit });
    const tampered = {
      ...attestation,
      claims_promotion_approval: true,
      claims_eligible: true,
      provider: { ...attestation?.provider, provider_create_count_in_recovery: 1 },
    };
    const evaluated = evaluateRedactedRecoveredAttestation(tampered, { expectedCommit: commit });
    expect(evaluated.errors).toEqual(expect.arrayContaining([
      'claims_promotion_not_supported',
      'attestation_provider_invalid',
    ]));
    expect(evaluateRedactedLiveAttestation(tampered, { expectedCommit: commit }).errors)
      .toEqual(expect.arrayContaining(['claims_promotion_not_supported', 'attestation_provider_invalid']));
  });

  it('writes a recovered attestation through the same hardened file boundary', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'jingci-private-recovery-attestation-'));
    roots.push(root);
    const input = path.join(root, 'result.json');
    const output = path.join(root, 'attestation.json');
    writeFileSync(input, canonical(privateRecoveredResult()), { mode: 0o600 });

    const attestation = attestPrivateLiveResultFile({ inputPath: input, outputPath: output, expectedCommit: commit });
    expect(attestation).not.toBeNull();
    if (!attestation) throw new Error('Expected recovered attestation');
    expect(attestation.schema_version).toBe('jingci.hackathon-recovered-live-attestation.v1');
    expect(lstatSync(output).mode & 0o777).toBe(0o600);
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

  it('rejects the combined fixture schema as live evidence', () => {
    const fixture = {
      ...privateLiveResult(),
      schema_version: 'jingci.combined-runway-b2-fixture-result.v1',
      evidence_mode: 'fixture_non_attestable',
    };
    expect(validatePrivateLiveResult(fixture, { expectedCommit: commit })).toEqual(['result_shape_invalid']);
  });

  it('rejects failure and recovery evidence regardless of status wording', () => {
    for (const schema_version of [
      'jingci.combined-transaction-failure.v1',
      'jingci.combined-transaction-recovery.v1',
    ]) {
      const nonAttestable = {
        ...privateLiveResult(),
        schema_version,
        evidence_mode: 'non_attestable',
        status: schema_version.includes('recovery') ? 'recovered' : 'failed',
      };
      expect(validatePrivateLiveResult(nonAttestable, { expectedCommit: commit }))
        .toEqual(['result_shape_invalid']);
    }
  });
});
