import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PLAN_PATH = 'docs/campaigns/backblaze-genmedia-2026/preview-runtime-plan.json';
const SERVICE_ROOT = 'functions/api/provenance';
const REVIEWED_SOURCE = Object.freeze({
  key: 'jingci-preview/source/runway-gen45-ca8ea95388d2.mp4',
  sha256: 'ca8ea95388d2e2f943f628ec6ca8bf9386baad8862b54ce26764675fa2b438f6',
  size_bytes: 1044064,
  provider: 'runway',
  model: 'gen4.5',
  visibility: 'private',
  promotion_commit: '9a0e875a87acb276eccbd0b975c5b25ed7235a59',
  deployment_configured: false,
});
const REQUIRED_BINDINGS = [
  'CF_ACCESS_TEAM_DOMAIN',
  'CF_ACCESS_AUD',
  'JINGCI_PROVENANCE_ENABLED',
  'B2_BUCKET',
  'B2_REGION',
  'B2_KEY_ID',
  'B2_APP_KEY',
  'JINGCI_PREVIEW_SOURCE_KEY',
  'JINGCI_PREVIEW_SOURCE_SHA256',
  'JINGCI_PREVIEW_SOURCE_PROVIDER',
  'JINGCI_PREVIEW_SOURCE_MODEL',
  'JINGCI_PREVIEW_SOURCE_MAX_BYTES',
];

export function evaluatePreviewRuntime({ plan, functionSource, middlewareSource, packageJson, packageLock }) {
  const errors = [];
  if (plan?.schema_version !== 'jingci.preview-runtime-plan.v2') errors.push('invalid runtime plan schema');
  if (plan?.runtime !== 'cloudflare-pages-function') errors.push('runtime must be cloudflare-pages-function');
  if (plan?.service_root !== SERVICE_ROOT) errors.push(`service_root must be ${SERVICE_ROOT}`);
  if (plan?.entrypoint !== 'functions/api/provenance/[[path]].ts') errors.push('runtime entrypoint is not pinned');
  if (plan?.deployment_storage_mode !== 'B2') errors.push('deployment storage mode must be B2');
  if (!plan?.reviewed_source || typeof plan.reviewed_source !== 'object') {
    errors.push('reviewed source binding is required');
  } else {
    if (JSON.stringify(Object.keys(plan.reviewed_source).sort()) !== JSON.stringify(Object.keys(REVIEWED_SOURCE).sort())) {
      errors.push('reviewed source binding shape is invalid');
    }
    for (const [field, expected] of Object.entries(REVIEWED_SOURCE)) {
      if (plan.reviewed_source[field] !== expected) errors.push(`reviewed source ${field} must match retained-source evidence`);
    }
  }
  const bindingNames = plan?.required_bindings?.map((item) => item?.name) ?? [];
  for (const name of REQUIRED_BINDINGS) {
    if (!bindingNames.includes(name)) errors.push(`missing required binding declaration: ${name}`);
  }
  if (new Set(bindingNames).size !== bindingNames.length) errors.push('required binding declarations must be unique');
  if (plan?.write_contract?.source_objects_per_request !== 0) errors.push('preview must not duplicate the retained source');
  if (plan?.write_contract?.manifest_objects_per_request !== 1) errors.push('preview must own one manifest per request');
  if (plan?.write_contract?.manifest_prefix !== 'jingci-preview/runs') errors.push('manifest prefix is not pinned');
  if (plan?.write_contract?.raw_prompt_persisted !== false) errors.push('raw prompts must not be persisted');
  if (plan?.write_contract?.failed_manifest_deleted !== true) errors.push('failed manifests must be deleted');
  for (const [action, authorized] of Object.entries(plan?.authorization ?? {})) {
    if (authorized !== false) errors.push(`authorization ${action} must remain false`);
  }
  if (!functionSource.includes("from '../../../lib/provenance-gateway'")) errors.push('Pages Function must use the reviewed gateway');
  if (!middlewareSource.includes('@cloudflare/pages-plugin-cloudflare-access')) errors.push('Cloudflare Access plugin is required');
  if (!packageJson.includes('"aws4fetch": "^1.0.20"')) errors.push('aws4fetch dependency must be pinned to the reviewed minor line');
  if (!/"node_modules\/aws4fetch":\s*\{\s*"version":\s*"1\.0\.20"/.test(packageLock)) {
    errors.push('aws4fetch lock entry must pin 1.0.20');
  }
  return errors;
}

function main() {
  const plan = JSON.parse(readFileSync(path.resolve(PLAN_PATH), 'utf8'));
  const result = evaluatePreviewRuntime({
    plan,
    functionSource: readFileSync(path.resolve('functions/api/provenance/[[path]].ts'), 'utf8'),
    middlewareSource: readFileSync(path.resolve('functions/api/provenance/_middleware.ts'), 'utf8'),
    packageJson: readFileSync(path.resolve('package.json'), 'utf8'),
    packageLock: readFileSync(path.resolve('package-lock.json'), 'utf8'),
  });
  if (result.length) {
    console.error(`Preview runtime plan is invalid:\n- ${result.join('\n- ')}`);
    return 1;
  }
  console.log(`Preview runtime plan is valid with ${REQUIRED_BINDINGS.length} bindings, one retained source, one manifest write, and no deployment authority.`);
  return 0;
}

const isCli = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) process.exitCode = main();
