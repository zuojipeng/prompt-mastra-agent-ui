import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { evaluateDemo } from './check-hackathon-demo.mjs';
import { evaluateDeployment } from './check-hackathon-deployment.mjs';
import { evaluateLiveVerification } from './check-hackathon-live-verification.mjs';
import { evaluateSubmission } from './check-hackathon-submission.mjs';

const CAMPAIGN_DIR = 'docs/campaigns/backblaze-genmedia-2026';
const HANDOFF_FILE = `${CAMPAIGN_DIR}/operator-handoff.json`;
const SCHEMA_VERSION = 'jingci.hackathon-operator-handoff.v1';
const SOURCE_FILES = {
  campaign: `${CAMPAIGN_DIR}/campaign.json`,
  submission: `${CAMPAIGN_DIR}/submission-readiness.json`,
  deployment: `${CAMPAIGN_DIR}/deployment-readiness.json`,
  demo: `${CAMPAIGN_DIR}/demo-rehearsal.json`,
  live: `${CAMPAIGN_DIR}/live-verification-plan.json`,
};
const STAGE_ORDER = [
  'registration_terms',
  'account_and_spend_authorization',
  'combined_live_verification',
  'preview_deployment',
  'final_demo',
  'final_submission',
];
const PLAN_ONLY_COMMANDS = [
  'npm run hackathon:handoff',
  'npm run hackathon:check:draft',
  'npm run hackathon:deploy:check:draft',
  'npm run hackathon:demo:check',
  'npm run hackathon:live:check:draft',
];
const FORBIDDEN_TEXT = /(?:--live\b|RUNWAYML_API_SECRET|B2_APP_KEY|B2_KEY_ID|\bkey_[0-9a-fA-F]{64,}\b)/;

function sha256(raw) {
  return createHash('sha256').update(raw).digest('hex');
}

function loadSources(read = readFileSync) {
  return Object.fromEntries(Object.entries(SOURCE_FILES).map(([name, file]) => {
    const raw = read(path.resolve(file), 'utf8');
    return [name, { file, sha256: sha256(raw), payload: JSON.parse(raw) }];
  }));
}

function stage(id, status, owner, requiredEvidence) {
  return { id, status, owner, required_evidence: requiredEvidence };
}

export function buildOperatorHandoff(sources = loadSources()) {
  const registrationApproved = sources.campaign.payload.human_gates?.registration_terms === 'approved';
  const liveBlockers = new Set(sources.live.payload.blockers ?? []);
  const accountBlockers = [
    'b2_account_authorization',
    'bucket_scoped_credentials',
    'campaign_paid_api_authorization',
    'runway_one_attempt_spend_authorization',
  ];
  const accountAuthorized = sources.campaign.payload.authorization?.may_use_paid_api === true &&
    sources.campaign.payload.authorization?.max_external_spend >= 0.6 &&
    accountBlockers.every((blocker) => !liveBlockers.has(blocker));
  const liveComplete = sources.live.payload.status === 'completed' && sources.live.payload.blockers?.length === 0;
  const deployed = sources.deployment.payload.status === 'ready' && sources.deployment.payload.blockers?.length === 0;
  const demoReady = sources.demo.payload.status === 'ready' && sources.demo.payload.blockers?.length === 0;
  const submitted = sources.submission.payload.status === 'submitted' && sources.submission.payload.claims?.submitted === true;
  const rawCompletions = [registrationApproved, accountAuthorized, liveComplete, deployed, demoReady, submitted];
  const completions = rawCompletions.map((complete, index) => complete && rawCompletions.slice(0, index).every(Boolean));
  const currentIndex = completions.findIndex((complete) => !complete);
  const stages = [
    stage(STAGE_ORDER[0], registrationApproved ? 'complete' : 'current_human_gate', 'Human owner', 'Devpost registration and accepted terms recorded without credentials'),
    stage(STAGE_ORDER[1], completions[1] ? 'complete' : currentIndex === 1 ? 'current_human_gate' : 'waiting', 'Human owner', 'B2 account approval, bucket-scoped credentials, and one Runway attempt capped at USD 0.60'),
    stage(STAGE_ORDER[2], completions[2] ? 'complete' : currentIndex === 2 ? 'current_agent_gate' : 'waiting', 'Operator Agent + DevOps Agent', 'Private attestation for one Runway-to-B2 transaction and cleanup'),
    stage(STAGE_ORDER[3], completions[3] ? 'complete' : currentIndex === 3 ? 'current_human_gate' : 'waiting', 'Human owner + DevOps Agent', 'Judge-accessible preview URL, access control, smoke, and rollback evidence'),
    stage(STAGE_ORDER[4], completions[4] ? 'complete' : currentIndex === 4 ? 'current_human_gate' : 'waiting', 'Human owner + Operator Agent', 'Public under-three-minute video with truthful live claims'),
    stage(STAGE_ORDER[5], completions[5] ? 'complete' : currentIndex === 5 ? 'current_human_gate' : 'waiting', 'Human owner', 'Final approval and Devpost submission confirmation'),
  ];

  return {
    schema_version: SCHEMA_VERSION,
    status: currentIndex === -1 ? 'complete' : 'blocked',
    campaign_id: sources.campaign.payload.opportunity_id,
    deadline_utc: sources.submission.payload.deadline_utc,
    source_bindings: Object.fromEntries(Object.entries(sources).map(([name, source]) => [name, {
      file: source.file,
      sha256: source.sha256,
    }])),
    stage_order: STAGE_ORDER,
    current_stage: currentIndex === -1 ? null : STAGE_ORDER[currentIndex],
    stages,
    source_gate_counts: {
      submission: sources.submission.payload.blockers?.length ?? 0,
      deployment: sources.deployment.payload.blockers?.length ?? 0,
      demo: sources.demo.payload.blockers?.length ?? 0,
      live: sources.live.payload.blockers?.length ?? 0,
    },
    plan_only_commands: PLAN_ONLY_COMMANDS,
    execution_allowed: false,
    notes: [
      'This handoff is derived status, not an authorization artifact.',
      'Do not put account identifiers, credentials, tokens, signed URLs, or approval payloads in this file.',
      'After a human gate changes, rebuild and review this file before moving to the next stage.',
    ],
  };
}

export function evaluateOperatorHandoff(handoff, sources = loadSources(), artifactExists = existsSync) {
  const errors = [];
  if (!handoff || typeof handoff !== 'object') return { errors: ['handoff_must_be_object'] };
  const expected = buildOperatorHandoff(sources);
  const sourceResults = [
    evaluateSubmission(sources.submission.payload, artifactExists),
    evaluateDeployment(sources.deployment.payload, artifactExists),
    evaluateDemo(sources.demo.payload, artifactExists),
    evaluateLiveVerification(sources.live.payload, sources.campaign.payload, artifactExists),
  ];
  if (sourceResults.some((result) => result.errors.length > 0)) errors.push('source_gate_invalid');
  if (handoff.schema_version !== SCHEMA_VERSION) errors.push('schema_version_invalid');
  if (JSON.stringify(handoff.source_bindings) !== JSON.stringify(expected.source_bindings)) errors.push('source_binding_drift');
  if (JSON.stringify(handoff.stage_order) !== JSON.stringify(STAGE_ORDER)) errors.push('stage_order_invalid');
  if (JSON.stringify(handoff.stages) !== JSON.stringify(expected.stages)) errors.push('stage_state_drift');
  if (handoff.current_stage !== expected.current_stage || handoff.status !== expected.status) errors.push('current_stage_invalid');
  if (JSON.stringify(handoff.source_gate_counts) !== JSON.stringify(expected.source_gate_counts)) errors.push('gate_count_drift');
  if (JSON.stringify(handoff.plan_only_commands) !== JSON.stringify(PLAN_ONLY_COMMANDS)) errors.push('command_inventory_invalid');
  if (handoff.execution_allowed !== false) errors.push('execution_must_remain_disabled');
  if (FORBIDDEN_TEXT.test(JSON.stringify(handoff))) errors.push('secret_or_live_command_forbidden');
  return { errors };
}

function main() {
  const sources = loadSources();
  if (process.argv.includes('--write')) {
    writeFileSync(path.resolve(HANDOFF_FILE), `${JSON.stringify(buildOperatorHandoff(sources), null, 2)}\n`, { mode: 0o644 });
  }
  const handoff = JSON.parse(readFileSync(path.resolve(HANDOFF_FILE), 'utf8'));
  const result = evaluateOperatorHandoff(handoff, sources);
  if (result.errors.length > 0) {
    console.error(`Operator handoff is invalid:\n- ${result.errors.join('\n- ')}`);
    return 1;
  }
  console.log(`Operator handoff is valid. Current stage: ${handoff.current_stage ?? 'complete'}.`);
  return process.argv.includes('--strict') && handoff.status !== 'complete' ? 1 : 0;
}

const isCli = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) process.exitCode = main();
