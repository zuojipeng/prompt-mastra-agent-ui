import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const CAMPAIGN = 'docs/campaigns/backblaze-genmedia-2026';
const SECRET_PATHS = [
  'cloudflare_pages.bindings.B2_KEY_ID',
  'cloudflare_pages.bindings.B2_APP_KEY',
];

function valueAt(object, dottedPath) {
  return dottedPath.split('.').reduce((value, key) => value?.[key], object);
}

export function evaluateDeploymentPacket(packet, runtimePlan, deployment) {
  const errors = [];
  if (packet?.schema_version !== 'jingci.preview-deployment-packet.v2') errors.push('invalid packet schema');
  if (packet?.status !== 'blocked' || packet?.release_commit !== null) errors.push('packet must remain blocked and unpinned');
  if (packet?.cloudflare_pages?.project !== 'prompt-mastra-agent-ui') errors.push('Cloudflare Pages project drift');
  if (packet?.cloudflare_pages?.build_variables?.NEXT_PUBLIC_PROVENANCE_API_URL !== '/api/provenance') {
    errors.push('frontend provenance path must remain same-origin');
  }
  const source = runtimePlan?.reviewed_source ?? {};
  const bindings = packet?.cloudflare_pages?.bindings ?? {};
  const sourceBindings = {
    JINGCI_PREVIEW_SOURCE_KEY: source.key,
    JINGCI_PREVIEW_SOURCE_SHA256: source.sha256,
    JINGCI_PREVIEW_SOURCE_PROVIDER: source.provider,
    JINGCI_PREVIEW_SOURCE_MODEL: source.model,
    JINGCI_PREVIEW_SOURCE_MAX_BYTES: String(source.size_bytes),
  };
  for (const [name, expected] of Object.entries(sourceBindings)) {
    if (bindings[name] !== expected) errors.push(`retained source binding drift: ${name}`);
  }
  if (bindings.JINGCI_PROVENANCE_ENABLED !== 'YES') errors.push('Cloudflare preview gate must be exact YES');
  if (JSON.stringify(packet?.secret_fields) !== JSON.stringify(SECRET_PATHS)) errors.push('secret field inventory drift');
  for (const field of SECRET_PATHS) {
    if (valueAt(packet, field) !== null) errors.push(`secret field must remain null: ${field}`);
  }
  if (JSON.stringify(packet?.blockers) !== JSON.stringify(deployment?.blockers ?? [])) errors.push('deployment blocker drift');
  if ((packet?.smoke_order?.length ?? 0) !== 10 || new Set(packet.smoke_order).size !== 10) errors.push('smoke matrix must contain ten unique checks');
  if ((packet?.rollback_order?.length ?? 0) !== 5 || new Set(packet.rollback_order).size !== 5) errors.push('rollback matrix must contain five unique steps');
  for (const [action, allowed] of Object.entries(packet?.authorization ?? {})) {
    if (allowed !== false) errors.push(`authorization ${action} must remain false`);
  }
  return errors;
}

function main() {
  const packet = JSON.parse(readFileSync(path.resolve(CAMPAIGN, 'preview-deployment-packet.json'), 'utf8'));
  const runtimePlan = JSON.parse(readFileSync(path.resolve(CAMPAIGN, 'preview-runtime-plan.json'), 'utf8'));
  const deployment = JSON.parse(readFileSync(path.resolve(CAMPAIGN, 'deployment-readiness.json'), 'utf8'));
  const errors = evaluateDeploymentPacket(packet, runtimePlan, deployment);
  if (errors.length) {
    console.error(`Preview deployment packet is invalid:\n- ${errors.join('\n- ')}`);
    return 1;
  }
  console.log('Preview deployment packet is valid with 2 null secrets, 10 smoke checks, 5 rollback steps, and no deployment authority.');
  return 0;
}

const isCli = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) process.exitCode = main();
