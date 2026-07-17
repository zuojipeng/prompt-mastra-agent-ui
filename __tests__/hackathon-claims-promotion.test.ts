import { createHash } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { buildRedactedRecoveredAttestation } from '../scripts/attest-hackathon-live-result.mjs';
import {
  evaluateClaimsPromotion,
  isClaimsPromotionApproved,
} from '../scripts/check-hackathon-claims-promotion.mjs';

const commit = 'a'.repeat(40);

function sha256(value: Buffer) {
  return createHash('sha256').update(value).digest('hex');
}

function recoveredResult() {
  const prefix = `jingci-smoke/20260717T133334Z/${'1'.repeat(32)}`;
  const asset = 'a'.repeat(64);
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
    manifest_hash: 'b'.repeat(64),
    probe: { codec: 'h264', width: 1280, height: 720, duration_seconds: 5.041667 },
    provider_create_count: 0,
    storage_cleanup: true,
    local_media_preserved: true,
  };
}

function fixture() {
  const packetRaw = Buffer.from('approved claims packet\n');
  const result = recoveredResult();
  const resultRaw = Buffer.from(`${JSON.stringify(result, null, 2)}\n`);
  const built = buildRedactedRecoveredAttestation(result, resultRaw, { expectedCommit: commit });
  const attestationRaw = Buffer.from(`${JSON.stringify(built.attestation, null, 2)}\n`);
  const approval = {
    schema_version: 'jingci.hackathon-claims-promotion-approval.v1',
    status: 'approved',
    campaign_id: 'devpost-30205',
    human_actor: 'human_owner',
    approved_at: '2026-07-17T14:37:59Z',
    claims_packet: {
      path: 'docs/campaigns/backblaze-genmedia-2026/docs/claims-promotion-review.md',
      sha256: sha256(packetRaw),
    },
    attestation: {
      path: 'artifacts/hackathon/backblaze-genmedia-2026/live-attestation.json',
      schema_version: 'jingci.hackathon-recovered-live-attestation.v1',
      source_commit: commit,
      sha256: sha256(attestationRaw),
    },
    approved_claim_ids: [
      'runway_private_generation',
      'genblaze_b2_recovery_verification',
      'redacted_evidence',
    ],
    mandatory_qualification_required: true,
    allowed_uses: { devpost_draft: true, final_demo_copy: true },
    authorizations: {
      deployment: false,
      video_publication: false,
      final_submission: false,
      new_paid_call: false,
      private_evidence_disclosure: false,
    },
    reusable_for_spend: false,
  };
  return { approval, packetRaw, attestationRaw };
}

describe('hackathon claims promotion approval', () => {
  it('accepts the exact narrow approval bound to packet and attestation bytes', () => {
    const { approval, packetRaw, attestationRaw } = fixture();
    const result = evaluateClaimsPromotion(approval, { packetRaw, attestationRaw });
    expect(result.errors).toEqual([]);
    expect(isClaimsPromotionApproved(approval, result)).toBe(true);
  });

  it('rejects packet and attestation byte drift', () => {
    const { approval, packetRaw, attestationRaw } = fixture();
    expect(evaluateClaimsPromotion(approval, {
      packetRaw: Buffer.concat([packetRaw, Buffer.from('changed')]),
      attestationRaw,
    }).errors).toContain('claims_packet_hash_mismatch');
    expect(evaluateClaimsPromotion(approval, {
      packetRaw,
      attestationRaw: Buffer.concat([attestationRaw, Buffer.from('changed')]),
    }).errors).toEqual(expect.arrayContaining(['attestation_hash_mismatch', 'attestation_unreadable']));
  });

  it('rejects added claims, missing qualification, and widened uses', () => {
    const { approval, packetRaw, attestationRaw } = fixture();
    const widened = {
      ...approval,
      approved_claim_ids: [...approval.approved_claim_ids, 'public_serving'],
      mandatory_qualification_required: false,
      allowed_uses: { ...approval.allowed_uses, public_marketing: true },
    };
    const result = evaluateClaimsPromotion(widened, { packetRaw, attestationRaw });
    expect(result.errors).toEqual(expect.arrayContaining([
      'approved_claim_scope_invalid',
      'allowed_use_scope_invalid',
    ]));
  });

  it('rejects deployment, publication, submission, spend, or evidence disclosure authorization', () => {
    const { approval, packetRaw, attestationRaw } = fixture();
    for (const authorization of Object.keys(approval.authorizations)) {
      const widened = {
        ...approval,
        authorizations: { ...approval.authorizations, [authorization]: true },
      };
      expect(evaluateClaimsPromotion(widened, { packetRaw, attestationRaw }).errors)
        .toContain('forbidden_authorization_enabled');
    }
  });

  it('rejects attestation source or schema substitution', () => {
    const { approval, packetRaw, attestationRaw } = fixture();
    const substituted = {
      ...approval,
      attestation: { ...approval.attestation, source_commit: 'b'.repeat(40) },
    };
    expect(evaluateClaimsPromotion(substituted, { packetRaw, attestationRaw }).errors)
      .toEqual(expect.arrayContaining(['attestation_source_binding_mismatch', 'attestation_validation_failed']));
  });
});
