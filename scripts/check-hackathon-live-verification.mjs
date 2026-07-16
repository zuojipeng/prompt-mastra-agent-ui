import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCHEMA_VERSION = 'jingci.hackathon-live-verification-plan.v1';
const GATE_ORDER = [
  'combined_implementation_review',
  'clean_pinned_source',
  'registration_terms',
  'b2_account_authorization',
  'b2_scoped_preflight_smoke',
  'runway_spend_authorization',
  'one_provider_create',
  'download_and_probe',
  'genblaze_asset_manifest_upload',
  'b2_readback_and_lineage_verification',
  'explicit_key_cleanup',
  'private_evidence_scan',
  'live_claims_promotion_approval',
];
const SECRET_NAMES = [
  'RUNWAYML_API_SECRET',
  'B2_BUCKET',
  'B2_REGION',
  'B2_KEY_ID',
  'B2_APP_KEY',
];
const APPROVAL_BINDINGS = [
  'approval_id',
  'human_actor',
  'run_id',
  'commit',
  'approved_at',
  'expires_at',
  'maximum_attempts',
  'maximum_estimated_cost_usd',
];
const APPROVAL_SCOPES = [
  'registration_terms',
  'b2_account_and_credentials',
  'runway_one_attempt_spend',
  'live_claims_promotion',
];
const STOP_CONDITIONS = [
  'any_gate_failure_stops_forward_execution',
  'ambiguous_runway_create_never_resubmits',
  'active_task_cancel_is_attempted_once_not_claimed_confirmed',
  'post_success_failure_preserves_provider_output',
  'ambiguous_b2_commit_cleans_only_preregistered_keys',
  'probe_or_readback_or_manifest_failure_blocks_claims',
  'cleanup_or_backend_close_failure_requires_cleanup_required',
  'interrupt_records_residual_keys_and_stops',
];
const EVIDENCE_BINDINGS = [
  'run_id',
  'clean_commit',
  'approval_id',
  'runway_task_id',
  'owned_b2_prefix',
  'asset_sha256',
  'manifest_hash',
  'cleanup_status',
];
const PLAN_COMMANDS = [
  'npm run hackathon:check:draft',
  'npm run hackathon:deploy:check:draft',
  'npm run hackathon:demo:check',
  'npm run hackathon:live:check:draft',
  'PYTHONPATH=. .venv/bin/python -m unittest tests.test_offline_runway_b2_transaction -v',
  'PYTHONPATH=. .venv/bin/python -m unittest tests.test_approval_journal tests.test_transaction_failure_evidence -v',
  'PYTHONPATH=. .venv/bin/python -m jingci_spike.live_runway_b2_transaction --plan',
  'PYTHONPATH=. .venv/bin/python -m jingci_spike.live_runway_smoke --plan',
  'PYTHONPATH=. .venv/bin/python -m jingci_spike.live_genblaze_b2_smoke --plan',
];
const CURRENT_BLOCKERS = [
  'combined_live_execution_missing',
  'campaign_paid_api_authorization',
  'runway_one_attempt_spend_authorization',
  'live_output_hosts_unverified',
  'private_live_attestation_absent',
];
const CLAIM_KEYS = [
  'combined_live_transaction',
  'live_ai_media_provider',
  'live_b2_upload_readback',
  'public_serving',
  'release_candidate',
  'submitted',
];
const FORBIDDEN_COMMAND = /(?:--live\b|\bset\s+-x\b|\b(?:env|printenv)\b|(?:RUNWAYML_API_SECRET|B2_APP_KEY|B2_KEY_ID)\s*=)/;
const SECRET_LITERAL = /(?:\bkey_[0-9a-fA-F]{128}\b|\b(?:RUNWAYML_API_SECRET|B2_APP_KEY|B2_KEY_ID)\s*[=:]\s*["']?(?!<|\$\{)[A-Za-z0-9+/_=-]{20,})/;

function sameArray(actual, expected) {
  return Array.isArray(actual) && actual.length === expected.length && actual.every((value, index) => value === expected[index]);
}

export function evaluateLiveVerification(plan, campaign, artifactExists = existsSync) {
  const errors = [];
  if (!plan || typeof plan !== 'object') return { errors: ['plan_must_be_object'], blockers: [] };
  if (plan.schema_version !== SCHEMA_VERSION) errors.push('schema_version_invalid');
  if (!['blocked', 'planned', 'authorized', 'completed'].includes(plan.status)) errors.push('status_invalid');
  if (!sameArray(plan.gate_order, GATE_ORDER)) errors.push('gate_order_invalid');
  if (!sameArray(plan.required_secret_names, SECRET_NAMES)) errors.push('secret_inventory_invalid');
  if (!sameArray(plan.approval?.required_scopes, APPROVAL_SCOPES)) errors.push('approval_scope_invalid');
  if (!sameArray(plan.approval?.binding_fields, APPROVAL_BINDINGS)) errors.push('approval_unbound');
  if (plan.approval?.one_shot !== true || plan.approval?.reusable !== false ||
      plan.approval?.durable_local_marker !== true || plan.approval?.marker_identity !== 'campaign_id+approval_id' ||
      plan.approval?.publication !== 'fsync_link_unlink_directory_fsync' ||
      plan.approval?.corrupt_marker_reusable !== false) errors.push('approval_not_one_shot');
  if (plan.provider_budget?.maximum_attempts !== 1 || plan.provider_budget?.maximum_retries !== 0) errors.push('paid_retry_enabled');
  if (plan.provider_budget?.maximum_estimated_cost_usd !== 0.6) errors.push('spend_cap_invalid');
  if (plan.provider_budget?.confirmation !== 'RUNWAY gen4.5 5s ONE ATTEMPT MAX $0.60') errors.push('confirmation_drift');
  if (plan.provider_budget?.provider !== 'runway' || plan.provider_budget?.model !== 'gen4.5' ||
      plan.provider_budget?.api_version !== '2024-11-06' || plan.provider_budget?.duration_seconds !== 5 ||
      plan.provider_budget?.ratio !== '1280:720') errors.push('provider_contract_drift');
  if (plan.campaign_authorization?.may_use_paid_api !== campaign?.authorization?.may_use_paid_api ||
      plan.campaign_authorization?.max_external_spend_usd !== campaign?.authorization?.max_external_spend) {
    errors.push('campaign_authorization_drift');
  }
  if (plan.secret_policy?.values_in_plan !== false || plan.secret_policy?.values_on_command_line !== false ||
      plan.secret_policy?.shell_trace_allowed !== false || plan.secret_policy?.environment_dump_allowed !== false ||
      plan.secret_policy?.b2_load_after_b2_authorization !== true ||
      plan.secret_policy?.runway_load_after_spend_authorization !== true) {
    errors.push('secret_policy_unsafe');
  }
  if (!sameArray(plan.plan_commands, PLAN_COMMANDS)) errors.push('live_or_secret_command_forbidden');
  const cleanup = plan.cleanup_policy ?? {};
  if (cleanup.explicit_recorded_keys_only !== true || cleanup.wildcard_or_recursive_delete !== false ||
      cleanup.delete_out_of_prefix_keys !== false || cleanup.confirm_absence !== true ||
      cleanup.version_level_erasure_claim !== false || cleanup.local_media_after_readback !== true ||
      cleanup.cleanup_failure_status !== 'cleanup_required') {
    errors.push('cleanup_policy_unsafe');
  }
  if (!sameArray(plan.stop_conditions, STOP_CONDITIONS)) errors.push('stop_conditions_incomplete');
  const evidence = plan.private_evidence ?? {};
  if (evidence.mode !== '0600' || evidence.scan_before_attestation !== true ||
      evidence.signed_urls_allowed !== false || evidence.secret_values_allowed !== false ||
      !sameArray(evidence.required_bindings, EVIDENCE_BINDINGS)) {
    errors.push('private_evidence_policy_incomplete');
  }
  const blockers = Array.isArray(plan.blockers) ? plan.blockers.filter((value) => typeof value === 'string') : [];
  if (!Array.isArray(plan.blockers) || blockers.length !== plan.blockers.length) errors.push('blockers_invalid');
  if (plan.status === 'blocked' && !sameArray(blockers, CURRENT_BLOCKERS)) errors.push('blocked_gate_inventory_invalid');
  if (plan.status !== 'blocked' || plan.execution_allowed !== false) errors.push('live_execution_not_supported');
  if (SECRET_LITERAL.test(JSON.stringify(plan))) errors.push('secret_literal_in_plan');
  const implementationMissing = !plan.implementation?.combined_module || !plan.implementation?.combined_command;
  if (implementationMissing && !blockers.includes('combined_live_execution_missing')) errors.push('combined_harness_blocker_missing');
  if (plan.implementation?.plan_module !== 'spikes/genblaze-provenance/jingci_spike/live_runway_b2_transaction.py' ||
      plan.implementation?.plan_command !== 'PYTHONPATH=. .venv/bin/python -m jingci_spike.live_runway_b2_transaction --plan' ||
      !artifactExists(path.resolve(plan.implementation.plan_module))) errors.push('combined_plan_harness_invalid');
  if (plan.implementation?.combined_module && !artifactExists(path.resolve(plan.implementation.combined_module))) {
    errors.push('combined_harness_missing');
  }
  if (plan.implementation?.combined_command &&
      (!plan.implementation.combined_command.includes('jingci_spike.live_runway_b2_transaction') ||
       !plan.implementation.combined_command.includes('--authorization-file') ||
       !plan.implementation.combined_command.includes('--evidence-out') ||
       FORBIDDEN_COMMAND.test(plan.implementation.combined_command.replace('--live', '')))) {
    errors.push('combined_command_unsafe');
  }
  if (plan.implementation?.standalone_results_composable !== false) errors.push('standalone_results_not_composable');
  if (plan.status === 'blocked' &&
      (plan.implementation?.combined_module !== null || plan.implementation?.combined_command !== null)) {
    errors.push('blocked_implementation_must_be_absent');
  }
  if (blockers.length > 0 && (plan.execution_allowed !== false || plan.status !== 'blocked')) errors.push('premature_execution_state');
  if (campaign?.authorization?.may_use_paid_api !== true && plan.execution_allowed !== false) errors.push('paid_api_not_authorized');
  if (campaign?.human_gates?.registration_terms !== 'approved' && !blockers.includes('registration_terms')) errors.push('registration_blocker_missing');
  if (!plan.claims || !sameArray(Object.keys(plan.claims), CLAIM_KEYS) ||
      CLAIM_KEYS.some((key) => plan.claims[key] !== false)) errors.push('premature_live_claim');
  if (!Array.isArray(plan.artifacts) || plan.artifacts.length === 0) {
    errors.push('artifacts_missing');
  } else {
    for (const artifact of plan.artifacts) {
      if (typeof artifact !== 'string' || !artifactExists(path.resolve(artifact))) errors.push(`artifact_missing:${artifact}`);
    }
  }
  return { errors, blockers };
}

export function isLiveVerificationExecutable(plan, result) {
  void plan;
  void result;
  return false;
}

function main() {
  const strict = process.argv.includes('--strict');
  const plan = JSON.parse(readFileSync(path.resolve('docs/campaigns/backblaze-genmedia-2026/live-verification-plan.json'), 'utf8'));
  const campaign = JSON.parse(readFileSync(path.resolve('docs/campaigns/backblaze-genmedia-2026/campaign.json'), 'utf8'));
  const result = evaluateLiveVerification(plan, campaign);
  if (result.errors.length > 0) {
    console.error(`Live verification plan is invalid:\n- ${result.errors.join('\n- ')}`);
    return 1;
  }
  if (result.blockers.length > 0) {
    console.log(`Live verification plan is structurally valid and blocked on ${result.blockers.length} gates:`);
    for (const blocker of result.blockers) console.log(`- ${blocker}`);
    return strict ? 1 : 0;
  }
  if (strict && !isLiveVerificationExecutable(plan, result)) {
    console.error('Strict live verification requires one authorized, blocker-free, execution-enabled plan.');
    return 1;
  }
  console.log('Live verification plan is executable.');
  return 0;
}

const isCli = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) process.exitCode = main();
