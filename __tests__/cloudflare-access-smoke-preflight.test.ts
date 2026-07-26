import plan from '../docs/campaigns/backblaze-genmedia-2026/cloudflare-access-smoke-preflight-plan.json';
import { describe, expect, it } from 'vitest';

import {
  evaluateAccessAttachmentAttestation,
  evaluateAccessSmokePreflight,
} from '../scripts/check-cloudflare-access-smoke-preflight.mjs';

const observedAt = '2026-07-26T13:00:00.000Z';
const now = new Date('2026-07-26T13:05:00.000Z');
const appId = plan.target.access_application_id_sha256;
const policyId = 'a'.repeat(64);
const tokenId = 'b'.repeat(64);

function attestation() {
  return {
    schema_version: 'jingci.cloudflare-access-attachment-attestation.v1',
    purpose: 'authenticated_b2_smoke_preflight',
    observed_at: observedAt,
    expires_at: '2026-07-26T13:10:00.000Z',
    target: {
      pages_project: plan.target.pages_project,
      deployment_id: plan.target.deployment_id,
      commit: plan.target.commit,
      hostname_scope: plan.target.hostname_scope,
      request_method: plan.target.business_method,
      request_path: plan.target.business_path,
    },
    access: {
      application_id_sha256: appId,
      policy_id_sha256: policyId,
      service_token_id_sha256: tokenId,
      policy_action: 'service_auth',
    },
    attachment: {
      application_policy_ids_sha256: [policyId],
      policy_application_ids_sha256: [appId],
      application_usage_count: 1,
      observed_after_save_reload: true,
      persisted: true,
    },
    safety: {
      secret_values_recorded: false,
      execution_authorized: false,
      network_called_by_validator: false,
    },
    review: {
      observer: 'DevOps Agent',
      reviewer: 'Security Agent',
    },
  };
}

describe('Cloudflare Access smoke preflight plan', () => {
  it('accepts the blocked identity-first plan', () => {
    expect(evaluateAccessSmokePreflight(plan).errors).toEqual([]);
  });

  it('accepts a fresh bidirectional attachment attestation', () => {
    expect(evaluateAccessAttachmentAttestation(attestation(), plan, now).errors).toEqual([]);
  });

  it('rejects zero usage, one-way membership, stale evidence, and self-review', () => {
    const changed = attestation();
    changed.attachment.application_policy_ids_sha256 = [];
    changed.attachment.application_usage_count = 0;
    changed.expires_at = '2026-07-26T13:04:00.000Z';
    changed.review.reviewer = changed.review.observer;

    const { errors } = evaluateAccessAttachmentAttestation(changed, plan, now);
    expect(errors).toContain('access_attachment_not_proven');
    expect(errors).toContain('attestation_time_window_invalid');
    expect(errors).toContain('attestation_review_separation_invalid');
  });

  it('rejects target drift, non-service policy action, and secret-bearing evidence', () => {
    const changed = attestation();
    changed.target.commit = '0'.repeat(40);
    changed.access.policy_action = 'allow';
    changed.review.observer = 'client_secret=must-not-appear';

    const { errors } = evaluateAccessAttachmentAttestation(changed, plan, now);
    expect(errors).toContain('attestation_target_binding_invalid');
    expect(errors).toContain('attestation_access_identity_invalid');
    expect(errors).toContain('secret_material_forbidden');
  });

  it('rejects missing attachment evidence and business authority widening', () => {
    const changed = structuredClone(plan);
    changed.required_preflight_evidence.policy_application_usage_count = 0;
    changed.required_preflight_evidence.business_post_attempted = true;
    changed.authorization.business_post = true;

    const { errors } = evaluateAccessSmokePreflight(changed);
    expect(errors).toContain('access_attachment_evidence_invalid');
    expect(errors).toContain('preflight_must_not_touch_business_or_b2');
    expect(errors).toContain('authorization_business_post_must_be_false');
  });

  it('rejects skipped outer save/reload and a health redirect expectation', () => {
    const changed = structuredClone(plan);
    changed.ordered_gates = changed.ordered_gates.filter(
      (gate) => gate !== 'save_outer_access_application',
    );
    changed.required_preflight_evidence.health_status = 302;

    const { errors } = evaluateAccessSmokePreflight(changed);
    expect(errors).toContain('preflight_gate_order_invalid');
    expect(errors).toContain('identity_health_evidence_invalid');
  });
});
