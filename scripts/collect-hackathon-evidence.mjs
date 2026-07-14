import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import {
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { evaluateDeployment, isDeploymentStrictReady } from './check-hackathon-deployment.mjs';
import { evaluateSubmission, isSubmissionStrictReady } from './check-hackathon-submission.mjs';

const SCHEMA_VERSION = 'jingci.hackathon-release-evidence.v1';
const SUBMISSION_FILE = 'docs/campaigns/backblaze-genmedia-2026/submission-readiness.json';
const DEPLOYMENT_FILE = 'docs/campaigns/backblaze-genmedia-2026/deployment-readiness.json';
const DEFAULT_OUTPUT = 'artifacts/hackathon/backblaze-genmedia-2026/release-evidence.json';
const MAX_SCAN_BYTES = 1_000_000;
const SECRET_RULES = [
  ['private_key', /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g],
  ['openai_token', /\bsk-[A-Za-z0-9_-]{24,}\b/g],
  ['github_token', /\bgh[pousr]_[A-Za-z0-9]{30,}\b/g],
  ['cloudflare_token', /\bcfut_[A-Za-z0-9_-]{30,}\b/g],
  ['aws_access_key', /\bAKIA[0-9A-Z]{16}\b/g],
  ['runway_token', /\bkey_[0-9a-fA-F]{128}\b/g],
  [
    'assigned_secret',
    /\b(?:B2_APP_KEY|B2_KEY_ID|RUNWAYML_API_SECRET|JINGCI_PREVIEW_BEARER_TOKEN|OPENAI_API_KEY|CLOUDFLARE_API_TOKEN)\s*=\s*["']?(?!<|\$\{)[A-Za-z0-9+/_=-]{20,}/g,
  ],
];

function defaultGit(root, args) {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8' });
}

function resolveInside(root, relativePath) {
  const absolute = path.resolve(root, relativePath);
  const relative = path.relative(root, absolute);
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(`artifact path must stay inside the repository: ${relativePath}`);
  }
  return absolute;
}

function readJson(root, relativePath) {
  return JSON.parse(readFileSync(resolveInside(root, relativePath), 'utf8'));
}

function sha256(buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

export function scanSecrets(files) {
  const findings = [];
  for (const file of [...files].sort((left, right) => left.path.localeCompare(right.path))) {
    const buffer = Buffer.isBuffer(file.content) ? file.content : Buffer.from(file.content);
    if (buffer.length > MAX_SCAN_BYTES || buffer.includes(0)) continue;
    const content = buffer.toString('utf8');
    for (const [rule, expression] of SECRET_RULES) {
      expression.lastIndex = 0;
      for (const match of content.matchAll(expression)) {
        findings.push({
          path: file.path,
          line: content.slice(0, match.index).split('\n').length,
          rule,
        });
      }
    }
  }
  return findings.sort((left, right) =>
    left.path.localeCompare(right.path) || left.line - right.line || left.rule.localeCompare(right.rule),
  );
}

export function collectReleaseEvidence({ root = process.cwd(), git = defaultGit } = {}) {
  const repositoryRoot = realpathSync(root);
  const submission = readJson(repositoryRoot, SUBMISSION_FILE);
  const deployment = readJson(repositoryRoot, DEPLOYMENT_FILE);
  const artifactExists = (relativePath) => {
    try {
      const absolute = resolveInside(repositoryRoot, relativePath);
      return existsSync(absolute) && lstatSync(absolute).isFile() && !lstatSync(absolute).isSymbolicLink();
    } catch {
      return false;
    }
  };
  const submissionGate = evaluateSubmission(submission, artifactExists);
  const deploymentGate = evaluateDeployment(deployment, artifactExists);

  const trackedPaths = git(repositoryRoot, ['ls-files', '-z']).split('\0').filter(Boolean).sort();
  const scanCandidates = [];
  const scanExclusions = [];
  for (const relativePath of trackedPaths) {
    const absolute = resolveInside(repositoryRoot, relativePath);
    const stat = lstatSync(absolute);
    if (stat.isSymbolicLink()) {
      scanExclusions.push({ path: relativePath, reason: 'symlink' });
      continue;
    }
    const content = readFileSync(absolute);
    if (content.length > MAX_SCAN_BYTES) {
      scanExclusions.push({ path: relativePath, reason: 'over_size_limit' });
      continue;
    }
    if (content.includes(0)) {
      scanExclusions.push({ path: relativePath, reason: 'binary' });
      continue;
    }
    scanCandidates.push({ path: relativePath, content });
  }
  const secretFindings = scanSecrets(scanCandidates);

  const artifactPaths = [...new Set([...submission.artifacts, ...deployment.artifacts])].sort();
  const artifacts = artifactPaths.map((relativePath) => {
    const absolute = resolveInside(repositoryRoot, relativePath);
    if (!artifactExists(relativePath)) throw new Error(`evidence artifact is missing or unsafe: ${relativePath}`);
    const content = readFileSync(absolute);
    return { path: relativePath, bytes: content.length, sha256: sha256(content) };
  });

  const source = {
    branch: git(repositoryRoot, ['branch', '--show-current']).trim(),
    commit: git(repositoryRoot, ['rev-parse', 'HEAD']).trim(),
    clean: git(repositoryRoot, ['status', '--porcelain']).trim() === '',
  };
  if (!/^[0-9a-f]{40}$/.test(source.commit)) throw new Error('git commit must be a 40-character SHA');

  const submissionStrictReady = isSubmissionStrictReady(submission, submissionGate);
  const deploymentStrictReady = isDeploymentStrictReady(deployment, deploymentGate);
  const blockingScanExclusions = scanExclusions.filter((item) => item.reason !== 'binary');
  const releaseCandidate =
    source.clean &&
    secretFindings.length === 0 &&
    blockingScanExclusions.length === 0 &&
    submissionStrictReady &&
    deploymentStrictReady;

  return {
    schema_version: SCHEMA_VERSION,
    project: submission.project_name,
    source,
    release_candidate: releaseCandidate,
    gates: {
      submission: {
        status: submission.status,
        structurally_valid: submissionGate.errors.length === 0,
        strict_ready: submissionStrictReady,
        errors: submissionGate.errors,
        blockers: submissionGate.blockers,
      },
      deployment: {
        status: deployment.status,
        structurally_valid: deploymentGate.errors.length === 0,
        strict_ready: deploymentStrictReady,
        errors: deploymentGate.errors,
        blockers: deploymentGate.blockers,
      },
    },
    redacted_config: {
      claims: submission.claims,
      controls: deployment.controls,
      provenance_mode: deployment.provenance_service.current_mode,
      access_model: deployment.access_model,
    },
    artifacts,
    secret_scan: {
      tracked_files_total: trackedPaths.length,
      text_files_scanned: scanCandidates.length,
      exclusions: scanExclusions,
      findings: secretFindings,
    },
  };
}

function parseOutputPath(args) {
  const outputArgument = args.find((argument) => argument.startsWith('--out='));
  return outputArgument ? outputArgument.slice('--out='.length) : DEFAULT_OUTPUT;
}

function main() {
  const strict = process.argv.includes('--strict');
  const root = process.cwd();
  const evidence = collectReleaseEvidence({ root });
  const outputPath = resolveInside(root, parseOutputPath(process.argv.slice(2)));
  mkdirSync(path.dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(evidence, null, 2)}\n`, { mode: 0o600 });

  console.log(`Release evidence written to ${path.relative(root, outputPath)}`);
  console.log(`commit=${evidence.source.commit} clean=${evidence.source.clean}`);
  console.log(
    `tracked_files_total=${evidence.secret_scan.tracked_files_total} text_files_scanned=${evidence.secret_scan.text_files_scanned} exclusions=${evidence.secret_scan.exclusions.length} secret_findings=${evidence.secret_scan.findings.length}`,
  );
  console.log(`submission_blockers=${evidence.gates.submission.blockers.length} deployment_blockers=${evidence.gates.deployment.blockers.length}`);

  const invalid =
    !evidence.gates.submission.structurally_valid ||
    !evidence.gates.deployment.structurally_valid ||
    evidence.secret_scan.findings.length > 0 ||
    evidence.secret_scan.exclusions.some((item) => item.reason !== 'binary');
  if (invalid || (strict && !evidence.release_candidate)) return 1;
  return 0;
}

const isCli = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) process.exitCode = main();
