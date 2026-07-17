import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { evaluateRedactedLiveAttestation } from './attest-hackathon-live-result.mjs';

const SCHEMA_VERSION = 'jingci.hackathon-claims-promotion-approval.v1';
const APPROVAL_FILE = 'docs/campaigns/backblaze-genmedia-2026/claims-promotion-approval.json';
const PACKET_FILE = 'docs/campaigns/backblaze-genmedia-2026/docs/claims-promotion-review.md';
const ATTESTATION_FILE = 'artifacts/hackathon/backblaze-genmedia-2026/live-attestation.json';
const ATTESTATION_SCHEMA = 'jingci.hackathon-recovered-live-attestation.v1';
const CLAIM_IDS = [
  'runway_private_generation',
  'genblaze_b2_recovery_verification',
  'redacted_evidence',
];
const HEX_40 = /^[0-9a-f]{40}$/;
const HEX_64 = /^[0-9a-f]{64}$/;

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function exactKeys(value, expected) {
  return value && typeof value === 'object' && !Array.isArray(value) &&
    Object.keys(value).length === expected.length && expected.every((key) => Object.hasOwn(value, key));
}

function sameArray(actual, expected) {
  return Array.isArray(actual) && actual.length === expected.length &&
    actual.every((value, index) => value === expected[index]);
}

function validTimestamp(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(value)) return false;
  return new Date(value).toISOString() === value.replace('Z', '.000Z');
}

export function evaluateClaimsPromotion(
  approval,
  {
    packetRaw = null,
    attestationRaw = null,
    root = process.cwd(),
  } = {},
) {
  const errors = [];
  if (!exactKeys(approval, [
    'schema_version', 'status', 'campaign_id', 'human_actor', 'approved_at', 'claims_packet',
    'attestation', 'approved_claim_ids', 'mandatory_qualification_required', 'allowed_uses',
    'authorizations', 'reusable_for_spend',
  ])) return { errors: ['claims_approval_shape_invalid'], blockers: [] };
  if (approval.schema_version !== SCHEMA_VERSION || approval.status !== 'approved' ||
      approval.campaign_id !== 'devpost-30205' || approval.human_actor !== 'human_owner' ||
      !validTimestamp(approval.approved_at)) errors.push('claims_approval_identity_invalid');
  if (!exactKeys(approval.claims_packet, ['path', 'sha256']) ||
      approval.claims_packet?.path !== PACKET_FILE || !HEX_64.test(approval.claims_packet?.sha256 ?? '')) {
    errors.push('claims_packet_binding_invalid');
  }
  if (!exactKeys(approval.attestation, ['path', 'schema_version', 'source_commit', 'sha256']) ||
      approval.attestation?.path !== ATTESTATION_FILE ||
      approval.attestation?.schema_version !== ATTESTATION_SCHEMA ||
      !HEX_40.test(approval.attestation?.source_commit ?? '') ||
      !HEX_64.test(approval.attestation?.sha256 ?? '')) errors.push('attestation_binding_invalid');
  if (!sameArray(approval.approved_claim_ids, CLAIM_IDS) || approval.mandatory_qualification_required !== true) {
    errors.push('approved_claim_scope_invalid');
  }
  if (!exactKeys(approval.allowed_uses, ['devpost_draft', 'final_demo_copy']) ||
      approval.allowed_uses?.devpost_draft !== true || approval.allowed_uses?.final_demo_copy !== true) {
    errors.push('allowed_use_scope_invalid');
  }
  if (!exactKeys(approval.authorizations, [
    'deployment', 'video_publication', 'final_submission', 'new_paid_call', 'private_evidence_disclosure',
  ]) || Object.values(approval.authorizations ?? {}).some((value) => value !== false) ||
      approval.reusable_for_spend !== false) errors.push('forbidden_authorization_enabled');

  try {
    const packet = packetRaw ?? readFileSync(path.resolve(root, PACKET_FILE));
    if (sha256(packet) !== approval.claims_packet?.sha256) errors.push('claims_packet_hash_mismatch');
  } catch {
    errors.push('claims_packet_unreadable');
  }

  try {
    const raw = attestationRaw ?? readFileSync(path.resolve(root, ATTESTATION_FILE));
    if (sha256(raw) !== approval.attestation?.sha256) errors.push('attestation_hash_mismatch');
    const attestation = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(raw));
    if (attestation.schema_version !== approval.attestation?.schema_version ||
        attestation.source_commit !== approval.attestation?.source_commit) errors.push('attestation_source_binding_mismatch');
    const evaluated = evaluateRedactedLiveAttestation(attestation, {
      expectedCommit: approval.attestation?.source_commit,
    });
    if (evaluated.errors.length > 0) errors.push('attestation_validation_failed');
  } catch {
    errors.push('attestation_unreadable');
  }
  return { errors: [...new Set(errors)], blockers: [] };
}

export function isClaimsPromotionApproved(approval, result = evaluateClaimsPromotion(approval)) {
  return approval?.status === 'approved' && result.errors.length === 0;
}

function main() {
  const root = process.cwd();
  try {
    const raw = readFileSync(path.resolve(root, APPROVAL_FILE));
    const approval = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(raw));
    if (!raw.equals(Buffer.from(`${JSON.stringify(approval, null, 2)}\n`))) {
      console.error('Claims promotion approval is not canonical JSON.');
      return 1;
    }
    const result = evaluateClaimsPromotion(approval, { root });
    if (result.errors.length > 0) {
      console.error(`Claims promotion approval is invalid:\n- ${result.errors.join('\n- ')}`);
      return 1;
    }
    console.log('Claims promotion approval is valid for Devpost draft and final demo copy only.');
    console.log('deployment=false video_publication=false final_submission=false new_paid_call=false');
    return 0;
  } catch (error) {
    console.error(error instanceof Error ? error.message : 'Claims promotion approval check failed.');
    return 1;
  }
}

const isCli = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) process.exitCode = main();
