import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { evaluateClaimsPromotion } from './check-hackathon-claims-promotion.mjs';
import { evaluateDeployment } from './check-hackathon-deployment.mjs';
import { evaluateOperatorHandoff } from './check-hackathon-operator-handoff.mjs';
import { evaluatePreviewDeploymentResult } from './check-hackathon-preview-deployment-result.mjs';
import { evaluateSubmission } from './check-hackathon-submission.mjs';

const CAMPAIGN_DIR = 'docs/campaigns/backblaze-genmedia-2026';
const STATUS_FILE = `${CAMPAIGN_DIR}/docs/status-summary.md`;
const SOURCE_FILES = {
  handoff: `${CAMPAIGN_DIR}/operator-handoff.json`,
  deployment: `${CAMPAIGN_DIR}/deployment-readiness.json`,
  preview: `${CAMPAIGN_DIR}/preview-deployment-result.json`,
  claims: `${CAMPAIGN_DIR}/claims-promotion-approval.json`,
  submission: `${CAMPAIGN_DIR}/submission-readiness.json`,
};

const STAGE_LABELS = {
  registration_terms: 'Registration and terms',
  account_and_spend_authorization: 'Account and bounded spend authorization',
  combined_live_verification: 'Private live verification',
  claims_promotion: 'Claims promotion',
  preview_deployment: 'Protected preview verification',
  final_demo: 'Public demo',
  final_submission: 'Final submission',
};

const BLOCKER_LABELS = {
  new_explicit_approval_for_one_authenticated_cloud_b2_smoke:
    'New explicit approval for one no-retry authenticated cloud B2 smoke',
  judge_access_identity_or_policy: 'Judge or reviewer Access identity and policy',
  cloudflare_rate_limit_configuration: 'Cloudflare rate-limit configuration',
  judge_path_e2e: 'Desktop and mobile judge-path E2E against the protected preview',
  human_release_approval: 'Human release approval',
};

function loadSources(read = readFileSync) {
  return Object.fromEntries(Object.entries(SOURCE_FILES).map(([name, file]) => [
    name,
    JSON.parse(read(path.resolve(file), 'utf8')),
  ]));
}

function yesNo(value) {
  return value === true ? 'yes' : 'no';
}

export function buildCampaignStatusSummary(sources = loadSources()) {
  const completed = sources.handoff.stages.filter((stage) => stage.status === 'complete').length;
  const currentStage = STAGE_LABELS[sources.handoff.current_stage] ?? 'Complete';
  const publicDemoDeployed = sources.submission.claims?.public_campaign_deployment === true &&
    !sources.submission.blockers.includes('public_campaign_deployment');
  const blockers = (publicDemoDeployed ? [] : sources.deployment.blockers).map(
    (blocker) => BLOCKER_LABELS[blocker] ?? 'Unclassified deployment blocker',
  );
  const approvedUses = Object.entries(sources.claims.allowed_uses)
    .filter(([, allowed]) => allowed === true)
    .map(([use]) => use === 'devpost_draft' ? 'Devpost draft' : 'final demo copy')
    .join(' and ');
  const claimsAuthorizations = sources.claims.authorizations;
  const previewProtected = sources.preview.status === 'deployed_smoke_unreached_blocked'
    && sources.preview.observations.production_access_unauthenticated === 302
    && sources.preview.observations.preview_access_unauthenticated === 302;
  const authenticatedCloudSmokeReachedHttp = Number.isInteger(
    sources.preview.observations.authenticated_b2_run_status,
  );
  const authenticatedPagesFunctionReached =
    sources.preview.observations.authenticated_pages_function_reached === true;

  return [
    '# Backblaze GenAI Media Campaign Status',
    '',
    '> Generated from repository evidence. This summary cannot authorize deployment,',
    '> publication, paid calls, evidence disclosure, or Devpost submission.',
    '',
    '## Current State',
    '',
    `- Overall: **${sources.handoff.status.toUpperCase()}**`,
    `- Current stage: **${currentStage}**`,
    `- Completed ordered stages: **${completed}/${sources.handoff.stages.length}**`,
    `- Preview runtime: **${sources.deployment.status}**`,
    `- Public zero-network judge demo deployed: **${yesNo(publicDemoDeployed)}**`,
    '',
    '## Evidence Boundary',
    '',
    `- Claims packet: **${sources.claims.status}** for ${approvedUses} only.`,
    '- Private Runway generation and B2 recovery evidence may be described only with the approved mandatory qualification.',
    `- Protected preview deployed behind Access: **${yesNo(previewProtected)}**.`,
    `- Current authenticated cloud B2 smoke reached HTTP: **${yesNo(authenticatedCloudSmokeReachedHttp)}**.`,
    `- Current authenticated cloud B2 smoke reached the Pages Function: **${yesNo(authenticatedPagesFunctionReached)}**.`,
    '- The local equivalent pass does not promote the Cloudflare deployment claim.',
    '',
    '## Open Gates',
    '',
    ...(blockers.length > 0
      ? blockers.map((blocker) => `- ${blocker}`)
      : ['- Public static deployment gate closed; protected-preview blockers are non-blocking for judge access.']),
    '',
    '## Authority',
    '',
    `- Claims approval grants deployment authority: **${yesNo(claimsAuthorizations.deployment)}**`,
    `- Claims approval grants video publication authority: **${yesNo(claimsAuthorizations.video_publication)}**`,
    `- Claims approval grants final submission authority: **${yesNo(claimsAuthorizations.final_submission)}**`,
    `- Claims approval grants new paid-call authority: **${yesNo(claimsAuthorizations.new_paid_call)}**`,
    `- Submission blockers still open: **${sources.submission.blockers.length}**`,
    '',
    'Regenerate with `npm run hackathon:status:write`; verify with `npm run hackathon:status`.',
    '',
  ].join('\n');
}

export function evaluateCampaignStatusSummary(summary, sources = loadSources()) {
  const errors = [];
  const sourceResults = [
    evaluateClaimsPromotion(sources.claims),
    evaluateDeployment(sources.deployment),
    evaluateOperatorHandoff(sources.handoff),
    evaluatePreviewDeploymentResult(sources.preview),
    evaluateSubmission(sources.submission),
  ];
  if (sourceResults.some((result) => result.errors.length > 0)) errors.push('source_gate_invalid');
  if (summary !== buildCampaignStatusSummary(sources)) errors.push('status_summary_drift');
  const publicDemoDeployed = sources.submission.claims?.public_campaign_deployment === true &&
    !sources.submission.blockers.includes('public_campaign_deployment');
  if (!publicDemoDeployed && sources.deployment.blockers.some((blocker) => !(blocker in BLOCKER_LABELS))) {
    errors.push('unclassified_deployment_blocker');
  }
  if (/https?:\/\/|sha-?256|application key|authorization token|bucket id/i.test(summary)) {
    errors.push('private_or_internal_detail_forbidden');
  }
  return { errors };
}

function main() {
  const sources = loadSources();
  if (process.argv.includes('--write')) {
    writeFileSync(path.resolve(STATUS_FILE), buildCampaignStatusSummary(sources), { mode: 0o644 });
  }
  const summary = readFileSync(path.resolve(STATUS_FILE), 'utf8');
  const result = evaluateCampaignStatusSummary(summary, sources);
  if (result.errors.length > 0) {
    console.error(`Campaign status summary is invalid:\n- ${result.errors.join('\n- ')}`);
    return 1;
  }
  console.log(`Campaign status summary is valid. Current stage: ${sources.handoff.current_stage ?? 'complete'}.`);
  return 0;
}

const isCli = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) process.exitCode = main();
