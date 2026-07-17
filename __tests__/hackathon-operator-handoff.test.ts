import { describe, expect, it } from 'vitest';

import handoff from '../docs/campaigns/backblaze-genmedia-2026/operator-handoff.json';
import {
  buildOperatorHandoff,
  evaluateOperatorHandoff,
} from '../scripts/check-hackathon-operator-handoff.mjs';

function source(name: string, payload: Record<string, unknown>) {
  return { file: `${name}.json`, sha256: name.repeat(64).slice(0, 64), payload };
}

function sources() {
  return {
    campaign: source('a', {
      opportunity_id: 'devpost-30205',
      human_gates: { registration_terms: 'pending' },
      authorization: { may_use_paid_api: false, max_external_spend: 0 },
    }),
    submission: source('b', { deadline_utc: '2026-08-03T21:00:00Z', status: 'draft', claims: { submitted: false }, blockers: ['registration_terms'] }),
    deployment: source('c', { status: 'design', blockers: ['preview'] }),
    demo: source('d', { status: 'local-rehearsal', blockers: ['final_demo'] }),
    live: source('e', {
      status: 'blocked',
      blockers: [
        'registration_terms',
        'b2_account_authorization',
        'bucket_scoped_credentials',
        'campaign_paid_api_authorization',
        'runway_one_attempt_spend_authorization',
      ],
    }),
  };
}

describe('hackathon operator handoff', () => {
  it('accepts the repository handoff awaiting renewed spend authorization', () => {
    const result = evaluateOperatorHandoff(handoff, undefined, () => true);
    expect(result.errors).toEqual([]);
    expect(handoff.current_stage).toBe('account_and_spend_authorization');
    expect(handoff.stages.filter((stage) => stage.status.startsWith('current'))).toHaveLength(1);
    expect(handoff.execution_allowed).toBe(false);
  });

  it('derives the next stage only after prior human evidence is present', () => {
    const input = sources();
    const registration = buildOperatorHandoff(input);
    expect(registration.current_stage).toBe('registration_terms');

    const campaignPayload = input.campaign.payload as { human_gates: { registration_terms: string } };
    campaignPayload.human_gates.registration_terms = 'approved';
    const account = buildOperatorHandoff(input);
    expect(account.current_stage).toBe('account_and_spend_authorization');
    expect(account.stages[2].status).toBe('waiting');

    const campaignAuthorization = input.campaign.payload.authorization as {
      may_use_paid_api: boolean;
      max_external_spend: number;
    };
    campaignAuthorization.may_use_paid_api = true;
    campaignAuthorization.max_external_spend = 0.6;
    expect(buildOperatorHandoff(input).current_stage).toBe('account_and_spend_authorization');

    input.live.payload.blockers = [];
    expect(buildOperatorHandoff(input).current_stage).toBe('combined_live_verification');
  });

  it('rejects source drift, skipped stages, live commands, and execution enablement', () => {
    const input = sources();
    const valid = buildOperatorHandoff(input);
    const tampered = {
      ...valid,
      current_stage: 'combined_live_verification',
      execution_allowed: true,
      plan_only_commands: ['python transaction.py --live'],
      source_bindings: {},
    };
    const result = evaluateOperatorHandoff(tampered, input, () => true);
    expect(result.errors).toContain('source_binding_drift');
    expect(result.errors).toContain('current_stage_invalid');
    expect(result.errors).toContain('command_inventory_invalid');
    expect(result.errors).toContain('execution_must_remain_disabled');
    expect(result.errors).toContain('secret_or_live_command_forbidden');
  });
});
