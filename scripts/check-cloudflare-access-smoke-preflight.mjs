import { lstatSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PLAN_PATH =
  'docs/campaigns/backblaze-genmedia-2026/cloudflare-access-smoke-preflight-plan.json';
const SCHEMA_VERSION = 'jingci.cloudflare-access-smoke-preflight-plan.v1';
const ORDERED_GATES = [
  'create_temporary_service_token',
  'create_reusable_service_auth_policy',
  'add_policy_to_target_application',
  'save_outer_access_application',
  'reload_target_application',
  'verify_policy_visible_after_reload',
  'verify_policy_usage_count_exactly_one',
  'run_identity_only_health_get',
  'revoke_temporary_identity_if_preflight_fails',
  'obtain_fresh_business_post_approval',
];
const AUTHORIZATION_KEYS = [
  'create_service_token',
  'configure_access_policy',
  'identity_only_health_get',
  'business_post',
  'b2_object_operation',
  'deploy',
  'publish',
  'submit_devpost',
];
const FAIL_CLOSED = {
  policy_missing_after_reload: 'stop_and_revoke',
  policy_application_usage_count_not_one: 'stop_and_revoke',
  health_redirect_302: 'stop_and_revoke',
  health_status_not_200: 'stop_and_revoke',
  health_body_mismatch: 'stop_and_revoke',
  fresh_business_post_approval_missing: 'stop_before_business_post',
};
const TARGET = {
  pages_project: 'jingci-genmedia-preview-2026',
  access_application: 'jingci-genmedia-preview-2026 - Cloudflare Pages',
  access_application_id_sha256:
    '8d5527022c3d0cea6ae94d458331143be74e264f1974511d112b044924687368',
  hostname_scope: '*.jingci-genmedia-preview-2026.pages.dev',
  deployment_id: '97262b86-97fe-47ae-87f8-eefa9f0c20c9',
  commit: 'c8eb57cb04d9f1d66334623e7ebdf69258ae47f6',
  health_method: 'GET',
  health_path: '/api/provenance/health',
  business_method: 'POST',
  business_path: '/api/provenance/v1/provenance-runs',
};
const ATTESTATION_CONTRACT = {
  schema_version: 'jingci.cloudflare-access-attachment-attestation.v1',
  purpose: 'authenticated_b2_smoke_preflight',
  private_file_mode: '0600',
  max_validity_seconds: 900,
  require_post_save_reload: true,
  require_bidirectional_membership: true,
  require_distinct_observer_and_reviewer: true,
  approval_must_bind_attestation_sha256: true,
};
const SHA256 = /^[0-9a-f]{64}$/;
const SECRET_PATTERN =
  /(?:client[_ -]?secret|authorization[_ -]?token|application[_ -]?key|\bbearer\s+[a-z0-9._~-]+|\bkey_[0-9a-f]{32,}\b)/i;

function exactKeys(value, keys) {
  return value && typeof value === 'object'
    && JSON.stringify(Object.keys(value)) === JSON.stringify(keys);
}

export function evaluateAccessSmokePreflight(plan) {
  const errors = [];
  if (plan?.schema_version !== SCHEMA_VERSION) errors.push('invalid_preflight_schema');
  if (plan?.status !== 'blocked' || plan?.execution_allowed !== false) {
    errors.push('preflight_must_remain_blocked');
  }
  if (JSON.stringify(plan?.target) !== JSON.stringify(TARGET)) errors.push('target_binding_drift');
  if (JSON.stringify(plan?.ordered_gates) !== JSON.stringify(ORDERED_GATES)) {
    errors.push('preflight_gate_order_invalid');
  }

  const evidence = plan?.required_preflight_evidence ?? {};
  if (evidence.policy_action !== 'service_auth'
    || evidence.policy_visible_after_application_reload !== true
    || evidence.policy_application_usage_count !== 1) {
    errors.push('access_attachment_evidence_invalid');
  }
  if (evidence.health_status !== 200
    || evidence.health_content_type !== 'application/json'
    || JSON.stringify(evidence.health_body) !==
      JSON.stringify({ status: 'ok', mode: 'cloudflare-b2-preview' })) {
    errors.push('identity_health_evidence_invalid');
  }
  if (evidence.health_b2_operation_expected !== false
    || evidence.business_post_attempted !== false) {
    errors.push('preflight_must_not_touch_business_or_b2');
  }
  if (evidence.temporary_identity_cleanup_confirmed !== false
    || evidence.fresh_business_post_approval_present !== false) {
    errors.push('future_evidence_must_not_be_preclaimed');
  }
  if (JSON.stringify(plan?.attachment_attestation) !== JSON.stringify(ATTESTATION_CONTRACT)) {
    errors.push('attachment_attestation_contract_invalid');
  }
  if (JSON.stringify(plan?.fail_closed_conditions) !== JSON.stringify(FAIL_CLOSED)) {
    errors.push('fail_closed_conditions_invalid');
  }
  if (JSON.stringify(Object.keys(plan?.authorization ?? {})) !==
    JSON.stringify(AUTHORIZATION_KEYS)) {
    errors.push('authorization_inventory_invalid');
  }
  for (const [action, allowed] of Object.entries(plan?.authorization ?? {})) {
    if (allowed !== false) errors.push(`authorization_${action}_must_be_false`);
  }
  if (SECRET_PATTERN.test(JSON.stringify(plan))) {
    errors.push('secret_material_forbidden');
  }
  return { errors };
}

export function evaluateAccessAttachmentAttestation(attestation, plan, now = new Date()) {
  const errors = [];
  const target = plan?.target ?? {};
  if (!exactKeys(attestation, [
    'schema_version',
    'purpose',
    'observed_at',
    'expires_at',
    'target',
    'access',
    'attachment',
    'safety',
    'review',
  ])) errors.push('attestation_shape_invalid');
  if (attestation?.schema_version !== ATTESTATION_CONTRACT.schema_version
    || attestation?.purpose !== ATTESTATION_CONTRACT.purpose) {
    errors.push('attestation_identity_invalid');
  }

  const observedAt = Date.parse(attestation?.observed_at ?? '');
  const expiresAt = Date.parse(attestation?.expires_at ?? '');
  const nowMs = now instanceof Date ? now.getTime() : Number.NaN;
  if (!Number.isFinite(observedAt)
    || !Number.isFinite(expiresAt)
    || !Number.isFinite(nowMs)
    || observedAt > nowMs
    || nowMs >= expiresAt
    || expiresAt - observedAt > ATTESTATION_CONTRACT.max_validity_seconds * 1000) {
    errors.push('attestation_time_window_invalid');
  }

  if (JSON.stringify(attestation?.target) !== JSON.stringify({
    pages_project: target.pages_project,
    deployment_id: target.deployment_id,
    commit: target.commit,
    hostname_scope: target.hostname_scope,
    request_method: target.business_method,
    request_path: target.business_path,
  })) errors.push('attestation_target_binding_invalid');

  const access = attestation?.access ?? {};
  if (!exactKeys(access, [
    'application_id_sha256',
    'policy_id_sha256',
    'service_token_id_sha256',
    'policy_action',
  ])
    || access.application_id_sha256 !== target.access_application_id_sha256
    || !SHA256.test(access.policy_id_sha256 ?? '')
    || !SHA256.test(access.service_token_id_sha256 ?? '')
    || access.policy_action !== 'service_auth') {
    errors.push('attestation_access_identity_invalid');
  }

  const attachment = attestation?.attachment ?? {};
  if (!exactKeys(attachment, [
    'application_policy_ids_sha256',
    'policy_application_ids_sha256',
    'application_usage_count',
    'observed_after_save_reload',
    'persisted',
  ])
    || !Array.isArray(attachment.application_policy_ids_sha256)
    || !attachment.application_policy_ids_sha256.includes(access.policy_id_sha256)
    || !Array.isArray(attachment.policy_application_ids_sha256)
    || !attachment.policy_application_ids_sha256.includes(access.application_id_sha256)
    || attachment.application_usage_count !== 1
    || attachment.observed_after_save_reload !== true
    || attachment.persisted !== true) {
    errors.push('access_attachment_not_proven');
  }

  if (JSON.stringify(attestation?.safety) !== JSON.stringify({
    secret_values_recorded: false,
    execution_authorized: false,
    network_called_by_validator: false,
  })) errors.push('attestation_safety_invalid');
  if (!exactKeys(attestation?.review, ['observer', 'reviewer'])
    || typeof attestation?.review?.observer !== 'string'
    || typeof attestation?.review?.reviewer !== 'string'
    || !attestation.review.observer
    || !attestation.review.reviewer
    || attestation.review.observer === attestation.review.reviewer) {
    errors.push('attestation_review_separation_invalid');
  }
  if (SECRET_PATTERN.test(JSON.stringify(attestation))) errors.push('secret_material_forbidden');
  return { errors };
}

function readPrivateAttestation(file) {
  const absolute = path.resolve(file);
  const stat = lstatSync(absolute);
  if (!stat.isFile() || stat.isSymbolicLink()) throw new Error('attestation_file_type_invalid');
  if ((stat.mode & 0o777) !== 0o600) throw new Error('attestation_file_mode_invalid');
  if (stat.nlink !== 1) throw new Error('attestation_file_link_count_invalid');
  if (typeof process.getuid === 'function' && stat.uid !== process.getuid()) {
    throw new Error('attestation_file_owner_invalid');
  }
  return JSON.parse(readFileSync(absolute, 'utf8'));
}

function main() {
  const plan = JSON.parse(readFileSync(path.resolve(PLAN_PATH), 'utf8'));
  const result = evaluateAccessSmokePreflight(plan);
  const attestationIndex = process.argv.indexOf('--attestation');
  if (attestationIndex >= 0) {
    const file = process.argv[attestationIndex + 1];
    if (!file) {
      result.errors.push('attestation_path_required');
    } else {
      try {
        result.errors.push(
          ...evaluateAccessAttachmentAttestation(readPrivateAttestation(file), plan).errors,
        );
      } catch (error) {
        result.errors.push(error instanceof Error ? error.message : 'attestation_read_failed');
      }
    }
  }
  if (result.errors.length > 0) {
    console.error(`Cloudflare Access smoke preflight plan is invalid:\n- ${result.errors.join('\n- ')}`);
    return 1;
  }
  console.log(`Cloudflare Access smoke preflight ${attestationIndex >= 0 ? 'attestation' : 'plan'} is valid: identity GET precedes a separately approved business POST, and all cloud authority remains false.`);
  return 0;
}

const isCli = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) process.exitCode = main();
