import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCHEMA_VERSION = 'jingci.hackathon-submission-readiness.v1';
const REQUIRED_CLAIMS = [
  'genblaze_local_pipeline',
  'browser_python_integration',
  'live_ai_media_provider',
  'live_b2_upload_readback',
  'public_campaign_deployment',
  'submitted',
];

export function evaluateSubmission(payload, artifactExists = existsSync) {
  const errors = [];
  if (!payload || typeof payload !== 'object') return { errors: ['readiness payload must be an object'], blockers: [] };
  if (payload.schema_version !== SCHEMA_VERSION) errors.push(`schema_version must be ${SCHEMA_VERSION}`);
  if (!['draft', 'ready', 'submitted'].includes(payload.status)) errors.push('status must be draft, ready, or submitted');
  if (!/^https:\/\/github\.com\//.test(payload.repository_url ?? '')) errors.push('repository_url must be a GitHub HTTPS URL');
  if (payload.submission_language !== 'English') errors.push('submission_language must be English');
  if (!Array.isArray(payload.providers) || payload.providers.length === 0) errors.push('providers must name at least one provider and model');
  if (!Array.isArray(payload.artifacts) || payload.artifacts.length === 0) {
    errors.push('artifacts must not be empty');
  } else {
    for (const artifact of payload.artifacts) {
      if (typeof artifact !== 'string' || !artifactExists(path.resolve(artifact))) errors.push(`missing artifact: ${artifact}`);
    }
  }
  for (const claim of REQUIRED_CLAIMS) {
    if (typeof payload.claims?.[claim] !== 'boolean') errors.push(`claim ${claim} must be boolean`);
  }
  const blockers = Array.isArray(payload.blockers) ? payload.blockers.filter((item) => typeof item === 'string') : [];
  if (payload.status === 'ready' || payload.status === 'submitted') {
    if (blockers.length > 0) errors.push(`${payload.status} submission cannot contain blockers`);
    if (!payload.working_app_url) errors.push(`${payload.status} submission requires working_app_url`);
    if (!payload.public_demo_video_url) errors.push(`${payload.status} submission requires public_demo_video_url`);
    for (const claim of ['live_ai_media_provider', 'live_b2_upload_readback', 'public_campaign_deployment']) {
      if (payload.claims?.[claim] !== true) errors.push(`${payload.status} submission requires claim ${claim}`);
    }
  }
  if (payload.status === 'submitted' && payload.claims?.submitted !== true) {
    errors.push('submitted status requires submitted claim');
  }
  if (payload.status !== 'submitted' && payload.claims?.submitted === true) {
    errors.push('submitted claim requires submitted status');
  }
  return { errors, blockers };
}

function main() {
  const strict = process.argv.includes('--strict');
  const file = path.resolve('docs/campaigns/backblaze-genmedia-2026/submission-readiness.json');
  const payload = JSON.parse(readFileSync(file, 'utf8'));
  const result = evaluateSubmission(payload);
  if (result.errors.length > 0) {
    console.error(`Submission readiness is invalid:\n- ${result.errors.join('\n- ')}`);
    return 1;
  }
  if (result.blockers.length > 0) {
    console.log(`Submission draft is structurally valid with ${result.blockers.length} open blockers:`);
    for (const blocker of result.blockers) console.log(`- ${blocker}`);
    return strict ? 1 : 0;
  }
  console.log(`Submission readiness is valid with no open blockers (${payload.status}).`);
  return 0;
}

const isCli = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) process.exitCode = main();
