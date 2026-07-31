import { describe, expect, it } from 'vitest';

import handoff from '../docs/campaigns/backblaze-genmedia-2026/operator-handoff.json';
import {
  buildOperatorHandoff,
  evaluateOperatorHandoff,
} from '../scripts/check-hackathon-operator-handoff.mjs';

const implementedControls = Object.fromEntries([
  'exact_origin_cors',
  'reviewer_authentication',
  'edge_rate_limit',
  'request_schema_and_size_limit',
  'concurrency_and_timeout_limit',
  'server_side_secrets',
  'bucket_scoped_credentials',
  'private_b2_objects',
  'provider_and_url_allowlist',
  'structured_redacted_logs',
  'health_and_dependency_checks',
  'rollback_feature_flag',
  'retention_and_cleanup',
].map((control) => [control, 'implemented']));

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
    deployment: source('c', {
      schema_version: 'jingci.hackathon-deployment-readiness.v1',
      status: 'design',
      access_model: 'test',
      frontend: { campaign_url: null, commit: null },
      provenance_service: { public_url: null, current_mode: 'test' },
      controls: implementedControls,
      artifacts: ['exists'],
      blockers: ['preview'],
    }),
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
    preview: source('f', {
      schema_version: 'jingci.preview-deployment-result.v1',
      status: 'deployed_smoke_unreached_blocked',
      cloudflare_pages: {
        production_url: 'https://example.test',
        tested_deployment_url: 'https://preview.example.test',
        tested_commit: 'a'.repeat(40),
      },
      observations: {
        production_access_unauthenticated: 302,
        preview_access_unauthenticated: 302,
        authenticated_b2_run_status: 302,
        authenticated_pages_function_reached: false,
        authenticated_b2_operation_observed: false,
        access_service_policy_attachment: 'not_persisted_zero_apps',
        authenticated_b2_run_attempts: 1,
        authenticated_b2_run_retried: false,
        temporary_smoke_surface_removed: true,
        temporary_access_policy_revoked: true,
        temporary_access_service_token_revoked: true,
        local_temporary_secret_files_removed: true,
      },
      blockers: [
        'new_explicit_approval_for_one_authenticated_cloud_b2_smoke',
        'cloudflare_rate_limit_configuration',
        'judge_path_e2e',
        'human_release_approval',
      ],
    }),
  };
}

describe('hackathon operator handoff', () => {
  it('advances the repository handoff to final submission after the public demo', () => {
    const result = evaluateOperatorHandoff(handoff, undefined, () => true);
    expect(result.errors).toEqual([]);
    expect(handoff.current_stage).toBe('final_submission');
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

    input.live.payload.status = 'completed';
    expect(buildOperatorHandoff(input).current_stage).toBe('claims_promotion');

    input.submission.payload.blockers = [];
    input.submission.payload.claims = {
      submitted: false,
      live_ai_media_provider: true,
      live_b2_upload_readback: true,
    };
    input.submission.payload.artifacts = [
      'docs/campaigns/backblaze-genmedia-2026/docs/claims-promotion-review.md',
      'docs/campaigns/backblaze-genmedia-2026/claims-promotion-approval.json',
    ];
    expect(buildOperatorHandoff(input).current_stage).toBe('preview_deployment');

    input.deployment.payload.status = 'preview-ready';
    input.deployment.payload.blockers = [];
    input.deployment.payload.frontend = {
      campaign_url: 'https://example.test',
      commit: 'b'.repeat(40),
    };
    input.deployment.payload.provenance_service = {
      public_url: 'https://example.test/api/provenance',
      current_mode: 'preview',
    };
    expect(buildOperatorHandoff(input).current_stage).toBe('final_demo');

    input.demo.payload.status = 'final-ready';
    input.demo.payload.blockers = [];
    expect(buildOperatorHandoff(input).current_stage).toBe('final_submission');
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

  it('accepts the approved zero-network public demo as the judge deployment path', () => {
    const input = sources();
    input.campaign.payload.human_gates = { registration_terms: 'approved' };
    input.campaign.payload.authorization = { may_use_paid_api: true, max_external_spend: 0.6 };
    input.live.payload.status = 'completed';
    input.live.payload.blockers = [];
    input.submission.payload.blockers = ['public_demo_video'];
    input.submission.payload.claims = {
      submitted: false,
      live_ai_media_provider: true,
      live_b2_upload_readback: true,
      public_campaign_deployment: true,
    };
    input.submission.payload.working_app_url = 'https://jingci-genmedia-judge-demo-2026.pages.dev';
    input.submission.payload.artifacts = [
      'docs/campaigns/backblaze-genmedia-2026/docs/claims-promotion-review.md',
      'docs/campaigns/backblaze-genmedia-2026/claims-promotion-approval.json',
    ];
    expect(buildOperatorHandoff(input).current_stage).toBe('final_demo');

    input.demo.payload.status = 'final-ready';
    input.demo.payload.blockers = [];
    expect(buildOperatorHandoff(input).current_stage).toBe('final_submission');
  });
});
