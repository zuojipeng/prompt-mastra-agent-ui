import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCHEMA_VERSION = 'jingci.hackathon-deployment-readiness.v1';
const REQUIRED_CONTROLS = [
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
];

export function evaluateDeployment(payload, artifactExists = existsSync) {
  const errors = [];
  if (!payload || typeof payload !== 'object') return { errors: ['deployment payload must be an object'], blockers: [] };
  if (payload.schema_version !== SCHEMA_VERSION) errors.push(`schema_version must be ${SCHEMA_VERSION}`);
  if (!['design', 'preview-ready', 'deployed'].includes(payload.status)) errors.push('status must be design, preview-ready, or deployed');
  if (!payload.access_model) errors.push('access_model is required');
  for (const control of REQUIRED_CONTROLS) {
    if (typeof payload.controls?.[control] !== 'string') errors.push(`control ${control} is required`);
  }
  if (!Array.isArray(payload.artifacts) || payload.artifacts.length === 0) {
    errors.push('artifacts must not be empty');
  } else {
    for (const artifact of payload.artifacts) {
      if (typeof artifact !== 'string' || !artifactExists(path.resolve(artifact))) errors.push(`missing artifact: ${artifact}`);
    }
  }
  if (!Array.isArray(payload.blockers)) errors.push('blockers must be an array');
  const blockers = Array.isArray(payload.blockers) ? payload.blockers.filter((value) => typeof value === 'string') : [];
  if (Array.isArray(payload.blockers) && blockers.length !== payload.blockers.length) {
    errors.push('blockers must contain only strings');
  }
  if (payload.status === 'preview-ready' || payload.status === 'deployed') {
    if (blockers.length > 0) errors.push(`${payload.status} deployment cannot contain blockers`);
    for (const control of REQUIRED_CONTROLS) {
      if (payload.controls?.[control] !== 'implemented') errors.push(`${payload.status} requires implemented control ${control}`);
    }
    if (!/^https:\/\//.test(payload.frontend?.campaign_url ?? '')) errors.push(`${payload.status} requires HTTPS frontend campaign_url`);
    if (!/^https:\/\//.test(payload.provenance_service?.public_url ?? '')) errors.push(`${payload.status} requires HTTPS provenance service URL`);
    if (!/^[0-9a-f]{40}$/.test(payload.frontend?.commit ?? '')) errors.push(`${payload.status} requires a pinned 40-character commit`);
  }
  if (payload.status === 'deployed' && payload.provenance_service?.current_mode !== 'public-hardened') {
    errors.push('deployed status requires public-hardened provenance service mode');
  }
  return { errors, blockers };
}

export function isDeploymentStrictReady(payload, result = evaluateDeployment(payload)) {
  return result.errors.length === 0 && result.blockers.length === 0 && ['preview-ready', 'deployed'].includes(payload?.status);
}

function main() {
  const strict = process.argv.includes('--strict');
  const file = path.resolve('docs/campaigns/backblaze-genmedia-2026/deployment-readiness.json');
  const payload = JSON.parse(readFileSync(file, 'utf8'));
  const result = evaluateDeployment(payload);
  if (result.errors.length > 0) {
    console.error(`Deployment readiness is invalid:\n- ${result.errors.join('\n- ')}`);
    return 1;
  }
  if (result.blockers.length > 0) {
    console.log(`Deployment design is structurally valid with ${result.blockers.length} open blockers:`);
    for (const blocker of result.blockers) console.log(`- ${blocker}`);
    return strict ? 1 : 0;
  }
  if (strict && !isDeploymentStrictReady(payload, result)) {
    console.error('Strict deployment readiness requires status preview-ready or deployed.');
    return 1;
  }
  console.log(`Deployment readiness is valid with no open blockers (${payload.status}).`);
  return 0;
}

const isCli = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) process.exitCode = main();
