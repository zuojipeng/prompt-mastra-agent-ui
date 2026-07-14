import { describe, expect, it } from 'vitest';

import campaign from '../docs/campaigns/backblaze-genmedia-2026/campaign.json';
import plan from '../docs/campaigns/backblaze-genmedia-2026/live-verification-plan.json';
import { evaluateLiveVerification, isLiveVerificationExecutable } from '../scripts/check-hackathon-live-verification.mjs';

function evaluate(overrides = {}, campaignOverrides = {}) {
  return evaluateLiveVerification(
    { ...plan, ...overrides },
    { ...campaign, ...campaignOverrides },
    () => true,
  );
}

describe('hackathon live verification plan', () => {
  it('accepts the blocked plan without making it executable', () => {
    const result = evaluate();
    expect(result.errors).toEqual([]);
    expect(result.blockers).toContain('combined_live_harness_missing');
    expect(result.blockers).toContain('runway_one_attempt_spend_authorization');
    expect(isLiveVerificationExecutable(plan, result)).toBe(false);
  });

  it('rejects reordered gates and unbound reusable approval', () => {
    const result = evaluate({
      gate_order: [...plan.gate_order].reverse(),
      approval: {
        ...plan.approval,
        one_shot: false,
        reusable: true,
        required_scopes: ['participation'],
        binding_fields: ['actor'],
      },
    });
    expect(result.errors).toContain('gate_order_invalid');
    expect(result.errors).toContain('approval_unbound');
    expect(result.errors).toContain('approval_not_one_shot');
    expect(result.errors).toContain('approval_scope_invalid');
  });

  it('rejects paid retry, cost, confirmation, and provider drift', () => {
    const result = evaluate({
      provider_budget: {
        ...plan.provider_budget,
        maximum_retries: 1,
        maximum_estimated_cost_usd: 1.2,
        confirmation: 'retry if transient',
        provider: 'another-provider',
        model: 'another-model',
        duration_seconds: 30,
        ratio: '9:16',
      },
    });
    expect(result.errors).toContain('paid_retry_enabled');
    expect(result.errors).toContain('spend_cap_invalid');
    expect(result.errors).toContain('confirmation_drift');
    expect(result.errors).toContain('provider_contract_drift');
  });

  it('rejects live commands, inline secrets, and unsafe cleanup', () => {
    const result = evaluate({
      plan_commands: ['RUNWAYML_API_SECRET=literal-secret python -m smoke --live'],
      cleanup_policy: { ...plan.cleanup_policy, wildcard_or_recursive_delete: true },
    });
    expect(result.errors).toContain('live_or_secret_command_forbidden');
    expect(result.errors).toContain('cleanup_policy_unsafe');
  });

  it('rejects shell-obfuscated and destructive plan commands', () => {
    for (const command of [
      String.raw`PYTHONPATH=. .venv/bin/python -m jingci_spike.live_runway_smoke --li\ve`,
      'MODE=live; python -m jingci_spike.live_runway_smoke --$MODE',
      'rm -rf /tmp/c021-review-target',
    ]) {
      expect(evaluate({ plan_commands: [command] }).errors).toContain('live_or_secret_command_forbidden');
    }
  });

  it('rejects premature execution and every live claim while blockers remain', () => {
    const result = evaluate({
      status: 'authorized',
      execution_allowed: true,
      claims: { ...plan.claims, live_ai_media_provider: true },
    });
    expect(result.errors).toContain('premature_execution_state');
    expect(result.errors).toContain('paid_api_not_authorized');
    expect(result.errors).toContain('premature_live_claim');
    expect(result.errors).toContain('live_execution_not_supported');
  });

  it('cannot be promoted to an authorized plan by editing policy fields', () => {
    const result = evaluate(
      {
        status: 'authorized',
        execution_allowed: true,
        blockers: [],
      },
      {
        authorization: { ...campaign.authorization, may_use_paid_api: true, max_external_spend: 0.6 },
        human_gates: { ...campaign.human_gates, registration_terms: 'approved' },
      },
    );

    expect(result.errors).toContain('live_execution_not_supported');
    expect(isLiveVerificationExecutable({ ...plan, status: 'authorized', execution_allowed: true }, result)).toBe(false);
  });

  it('rejects a populated blocked harness, missing claims, and secret literals', () => {
    const populated = evaluate({
      implementation: {
        combined_module: 'package.json',
        combined_command: 'python -m jingci_spike.live_runway_b2_transaction --live --authorization-file auth.json --evidence-out evidence.json',
        standalone_results_composable: false,
      },
      claims: undefined,
      notes: `Authorization: Bearer key_${'c'.repeat(128)}`,
    });

    expect(populated.errors).toContain('blocked_implementation_must_be_absent');
    expect(populated.errors).toContain('premature_live_claim');
    expect(populated.errors).toContain('secret_literal_in_plan');
  });

  it('rejects campaign authorization drift and missing implementation blocker', () => {
    const result = evaluate({ blockers: plan.blockers.filter((value) => value !== 'combined_live_harness_missing') });
    expect(result.errors).toContain('combined_harness_blocker_missing');
    expect(result.errors).toContain('blocked_gate_inventory_invalid');
    const drift = evaluate({}, { authorization: { ...campaign.authorization, may_use_paid_api: true } });
    expect(drift.errors).toContain('campaign_authorization_drift');
  });

  it('rejects incomplete private evidence and stop policies', () => {
    const result = evaluate({
      stop_conditions: ['stop'],
      private_evidence: { ...plan.private_evidence, mode: '0644', required_bindings: [] },
    });
    expect(result.errors).toContain('stop_conditions_incomplete');
    expect(result.errors).toContain('private_evidence_policy_incomplete');
  });
});
