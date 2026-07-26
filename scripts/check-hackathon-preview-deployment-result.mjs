import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCHEMA_VERSION = 'jingci.preview-deployment-result.v1';
const STATUS = 'deployed_smoke_unreached_blocked';
const REQUIRED_BLOCKERS = [
  'new_explicit_approval_for_one_authenticated_cloud_b2_smoke',
  'cloudflare_rate_limit_configuration',
  'judge_path_e2e',
  'human_release_approval',
];
const FORBIDDEN_TEXT = /(?:B2_APP_KEY|RUNWAYML_API_SECRET|authorization[_ -]?token|\bkey_[0-9a-f]{32,}\b)/i;

export function evaluatePreviewDeploymentResult(payload) {
  const errors = [];
  if (!payload || typeof payload !== 'object') return { errors: ['preview_result_must_be_object'] };
  if (payload.schema_version !== SCHEMA_VERSION) errors.push('preview_result_schema_invalid');
  if (payload.status !== STATUS) errors.push('preview_result_status_invalid');
  if (!/^https:\/\//.test(payload.cloudflare_pages?.production_url ?? '')) {
    errors.push('preview_production_url_invalid');
  }
  if (!/^https:\/\//.test(payload.cloudflare_pages?.tested_deployment_url ?? '')) {
    errors.push('preview_tested_url_invalid');
  }
  if (!/^[0-9a-f]{40}$/.test(payload.cloudflare_pages?.tested_commit ?? '')) {
    errors.push('preview_tested_commit_invalid');
  }
  if (payload.observations?.production_access_unauthenticated !== 302) {
    errors.push('production_access_observation_invalid');
  }
  if (payload.observations?.preview_access_unauthenticated !== 302) {
    errors.push('preview_access_observation_invalid');
  }
  if (payload.observations?.authenticated_b2_run_status !== 302) {
    errors.push('authenticated_b2_status_invalid');
  }
  if (payload.observations?.authenticated_pages_function_reached !== false) {
    errors.push('authenticated_pages_function_reached_must_be_false');
  }
  if (payload.observations?.authenticated_b2_operation_observed !== false) {
    errors.push('authenticated_b2_operation_observed_must_be_false');
  }
  if (payload.observations?.access_service_policy_attachment !== 'not_persisted_zero_apps') {
    errors.push('access_service_policy_attachment_invalid');
  }
  if (payload.observations?.authenticated_b2_run_attempts !== 1
    || payload.observations?.authenticated_b2_run_retried !== false) {
    errors.push('authenticated_b2_attempt_boundary_invalid');
  }
  for (const field of [
    'temporary_smoke_surface_removed',
    'temporary_access_policy_revoked',
    'temporary_access_service_token_revoked',
    'local_temporary_secret_files_removed',
  ]) {
    if (payload.observations?.[field] !== true) errors.push(`${field}_must_be_true`);
  }
  if (JSON.stringify(payload.blockers) !== JSON.stringify(REQUIRED_BLOCKERS)) {
    errors.push('preview_result_blockers_invalid');
  }
  if (FORBIDDEN_TEXT.test(JSON.stringify(payload))) errors.push('preview_result_secret_forbidden');
  return { errors };
}

function main() {
  const file = path.resolve('docs/campaigns/backblaze-genmedia-2026/preview-deployment-result.json');
  const payload = JSON.parse(readFileSync(file, 'utf8'));
  const result = evaluatePreviewDeploymentResult(payload);
  if (result.errors.length > 0) {
    console.error(`Preview deployment result is invalid:\n- ${result.errors.join('\n- ')}`);
    return 1;
  }
  console.log('Preview deployment result is valid: Access returned 302 before the Pages Function; cloud B2 smoke remains unverified.');
  return 0;
}

const isCli = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) process.exitCode = main();
