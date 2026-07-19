import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PLAN_PATH = 'docs/campaigns/backblaze-genmedia-2026/preview-runtime-plan.json';
const SERVICE_ROOT = 'spikes/genblaze-provenance';
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
const REQUIRED_VARIABLES = [
  'PORT',
  'JINGCI_PUBLIC_PREVIEW_MODE',
  'JINGCI_PREVIEW_ALLOWED_ORIGIN',
  'JINGCI_PREVIEW_BEARER_TOKEN',
  'JINGCI_PREVIEW_MAX_CONCURRENCY',
  'JINGCI_PROVENANCE_ENABLED',
  'JINGCI_PROVENANCE_STORAGE_MODE',
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

export function evaluatePreviewRuntime({ plan, railway, dockerfile, runtimeSource, b2Source, dependencyLock }) {
  const errors = [];
  if (plan?.schema_version !== 'jingci.preview-runtime-plan.v1') errors.push('invalid runtime plan schema');
  if (plan?.service_root !== SERVICE_ROOT) errors.push(`service_root must be ${SERVICE_ROOT}`);
  if (plan?.entrypoint !== 'python -m jingci_spike.runtime_service') errors.push('runtime entrypoint is not pinned');
  if (plan?.deployment_storage_mode !== 'B2') errors.push('deployment storage mode must be B2');
  if (!plan?.reviewed_source || typeof plan.reviewed_source !== 'object') {
    errors.push('reviewed source binding is required');
  } else {
    const sourceKeys = Object.keys(plan.reviewed_source).sort();
    const expectedKeys = Object.keys(REVIEWED_SOURCE).sort();
    if (JSON.stringify(sourceKeys) !== JSON.stringify(expectedKeys)) {
      errors.push('reviewed source binding shape is invalid');
    }
    for (const [field, expected] of Object.entries(REVIEWED_SOURCE)) {
      if (plan.reviewed_source[field] !== expected) {
        errors.push(`reviewed source ${field} must match retained-source evidence`);
      }
    }
  }
  const variableNames = plan?.required_variables?.map((item) => item?.name) ?? [];
  for (const name of REQUIRED_VARIABLES) {
    if (!variableNames.includes(name)) errors.push(`missing required variable declaration: ${name}`);
  }
  if (new Set(variableNames).size !== variableNames.length) errors.push('required variable declarations must be unique');
  for (const [action, authorized] of Object.entries(plan?.authorization ?? {})) {
    if (authorized !== false) errors.push(`authorization ${action} must remain false`);
  }
  if (railway?.build?.builder !== 'DOCKERFILE') errors.push('Railway builder must be DOCKERFILE');
  if (railway?.build?.dockerfilePath !== '/Dockerfile') errors.push('Railway Dockerfile path must be /Dockerfile');
  if (railway?.deploy?.healthcheckPath !== '/health') errors.push('Railway healthcheck must use /health');
  if (railway?.deploy?.restartPolicyType !== 'ON_FAILURE') errors.push('Railway restart policy must be ON_FAILURE');
  if (!dockerfile.includes('FROM python:3.12.13-slim-bookworm')) errors.push('Python base image must be pinned');
  if (!dockerfile.includes('-r requirements.lock')) errors.push('container must install the dependency lock');
  if (!dockerfile.includes('USER jingci')) errors.push('container must run as a non-root user');
  if (!dockerfile.includes('CMD ["python", "-m", "jingci_spike.runtime_service"]')) errors.push('container command is not pinned');
  if (/\b(?:ARG|ENV)\s+.*(?:TOKEN|KEY|SECRET|PASSWORD)/i.test(dockerfile)) errors.push('Dockerfile must not declare secret inputs');
  if (!runtimeSource.includes('PUBLIC_HOST = "0.0.0.0"')) errors.push('runtime must bind to all container interfaces');
  if (!runtimeSource.includes('environment.get("PORT"')) errors.push('runtime must use the platform PORT');
  if (!runtimeSource.includes('JINGCI_PROVENANCE_STORAGE_MODE')) errors.push('runtime must require an explicit storage mode');
  if (!b2Source.includes('RUN_PREFIX = "jingci-preview/runs"')) errors.push('B2 writes must use the fixed preview run namespace');
  if (!b2Source.includes('wrapper.cleanup_owned()')) errors.push('B2 failures must clean owned objects');
  if (!dependencyLock.includes('genblaze==0.4.1')) errors.push('dependency lock must pin Genblaze');
  for (const line of dependencyLock.split('\n').filter(Boolean)) {
    if (!/^[a-zA-Z0-9_.-]+==[^=\s]+$/.test(line)) errors.push(`dependency is not exactly pinned: ${line}`);
  }
  return errors;
}

function main() {
  const plan = JSON.parse(readFileSync(path.resolve(PLAN_PATH), 'utf8'));
  const railway = JSON.parse(readFileSync(path.resolve(SERVICE_ROOT, 'railway.json'), 'utf8'));
  const dockerfile = readFileSync(path.resolve(SERVICE_ROOT, 'Dockerfile'), 'utf8');
  const runtimeSource = readFileSync(path.resolve(SERVICE_ROOT, 'jingci_spike/runtime_service.py'), 'utf8');
  const b2Source = readFileSync(path.resolve(SERVICE_ROOT, 'jingci_spike/b2_preview_executor.py'), 'utf8');
  const dependencyLock = readFileSync(path.resolve(SERVICE_ROOT, 'requirements.lock'), 'utf8');
  const errors = evaluatePreviewRuntime({ plan, railway, dockerfile, runtimeSource, b2Source, dependencyLock });
  if (errors.length > 0) {
    console.error(`Preview runtime plan is invalid:\n- ${errors.join('\n- ')}`);
    return 1;
  }
  console.log(`Preview runtime plan is valid with one exact retained source, ${REQUIRED_VARIABLES.length} declared variable names, and no deployment authorization.`);
  return 0;
}

const isCli = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) process.exitCode = main();
