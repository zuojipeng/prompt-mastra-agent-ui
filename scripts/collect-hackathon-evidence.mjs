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
import { evaluateRedactedLiveAttestation } from './attest-hackathon-live-result.mjs';
import { evaluateClaimsPromotion, isClaimsPromotionApproved } from './check-hackathon-claims-promotion.mjs';
import { MAX_SCAN_BYTES, scanSecrets } from './hackathon-secret-scan.mjs';

const SCHEMA_VERSION = 'jingci.hackathon-release-evidence.v2';
const SUBMISSION_FILE = 'docs/campaigns/backblaze-genmedia-2026/submission-readiness.json';
const DEPLOYMENT_FILE = 'docs/campaigns/backblaze-genmedia-2026/deployment-readiness.json';
const DEFAULT_OUTPUT = 'artifacts/hackathon/backblaze-genmedia-2026/release-evidence.json';
const LIVE_ATTESTATION_FILE = 'artifacts/hackathon/backblaze-genmedia-2026/live-attestation.json';
const CLAIMS_PROMOTION_FILE = 'docs/campaigns/backblaze-genmedia-2026/claims-promotion-approval.json';

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

export { scanSecrets } from './hackathon-secret-scan.mjs';

export function collectReleaseEvidence({
  root = process.cwd(),
  git = defaultGit,
  liveAttestationFile = LIVE_ATTESTATION_FILE,
  claimsPromotionFile = CLAIMS_PROMOTION_FILE,
} = {}) {
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

  let liveAttestation = null;
  let liveAttestationGate = { errors: [], blockers: ['redacted_live_attestation_missing'] };
  let liveAttestationSummary = null;
  let claimsPromotion = null;
  let claimsPromotionRaw = null;
  let claimsPromotionGate = { errors: [], blockers: ['claims_promotion_approval_missing'] };
  let claimsPromotionSummary = null;
  const claimsPromotionAbsolute = resolveInside(repositoryRoot, claimsPromotionFile);
  if (existsSync(claimsPromotionAbsolute)) {
    try {
      const stat = lstatSync(claimsPromotionAbsolute);
      if (!stat.isFile() || stat.isSymbolicLink() || stat.size <= 0 || stat.size > 256_000) {
        claimsPromotionGate = { errors: ['claims_promotion_file_unsafe'], blockers: [] };
      } else {
        claimsPromotionRaw = readFileSync(claimsPromotionAbsolute);
        claimsPromotion = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(claimsPromotionRaw));
        if (!claimsPromotionRaw.equals(Buffer.from(`${JSON.stringify(claimsPromotion, null, 2)}\n`))) {
          claimsPromotionGate = { errors: ['claims_promotion_not_canonical'], blockers: [] };
        }
      }
    } catch {
      claimsPromotionGate = { errors: ['claims_promotion_parse_failed'], blockers: [] };
    }
  }
  const liveAttestationAbsolute = resolveInside(repositoryRoot, liveAttestationFile);
  if (existsSync(liveAttestationAbsolute)) {
    const stat = lstatSync(liveAttestationAbsolute);
    const realAttestationPath = realpathSync(liveAttestationAbsolute);
    const realRelative = path.relative(repositoryRoot, realAttestationPath);
    if (!realRelative || realRelative.startsWith('..') || path.isAbsolute(realRelative) ||
        !stat.isFile() || stat.isSymbolicLink() || (stat.mode & 0o777) !== 0o600 || stat.nlink !== 1 ||
        (typeof process.getuid === 'function' && stat.uid !== process.getuid()) || stat.size <= 0 || stat.size > 256_000) {
      liveAttestationGate = { errors: ['live_attestation_file_unsafe'], blockers: [] };
    } else {
      try {
        const raw = readFileSync(liveAttestationAbsolute);
        const decoded = new TextDecoder('utf-8', { fatal: true }).decode(raw);
        liveAttestation = JSON.parse(decoded);
        const expectedAttestationCommit = claimsPromotion?.attestation?.source_commit ?? source.commit;
        liveAttestationGate = evaluateRedactedLiveAttestation(liveAttestation, {
          expectedCommit: expectedAttestationCommit,
        });
        if (!raw.equals(Buffer.from(`${JSON.stringify(liveAttestation, null, 2)}\n`))) {
          liveAttestationGate.errors.push('live_attestation_not_canonical');
        }
        if (scanSecrets([{ path: liveAttestationFile, content: raw }]).length > 0) {
          liveAttestationGate.errors.push('live_attestation_secret_material');
        }
        if (claimsPromotion && claimsPromotionGate.errors.length === 0) {
          claimsPromotionGate = evaluateClaimsPromotion(claimsPromotion, {
            root: repositoryRoot,
            attestationRaw: raw,
          });
          if (isClaimsPromotionApproved(claimsPromotion, claimsPromotionGate)) {
            liveAttestationGate.blockers = [];
            claimsPromotionSummary = {
              path: claimsPromotionFile,
              bytes: claimsPromotionRaw.length,
              sha256: sha256(claimsPromotionRaw),
              approved_at: claimsPromotion.approved_at,
              allowed_uses: claimsPromotion.allowed_uses,
              expanded_authorizations: false,
            };
          }
        }
        if (liveAttestationGate.errors.length === 0) {
          liveAttestationSummary = {
            path: liveAttestationFile,
            bytes: raw.length,
            sha256: sha256(raw),
            source_commit: liveAttestation.source_commit,
            result_sha256: liveAttestation.result_sha256,
            claims_eligible: isClaimsPromotionApproved(claimsPromotion, claimsPromotionGate),
          };
        }
      } catch {
        liveAttestationGate = { errors: ['live_attestation_parse_failed'], blockers: [] };
      }
    }
  }
  const assertedLiveClaims = ['live_ai_media_provider', 'live_b2_upload_readback']
    .filter((claim) => submission.claims?.[claim] === true);
  if (assertedLiveClaims.length > 0 && !liveAttestation) {
    liveAttestationGate.errors.push('asserted_live_claims_require_attestation');
  } else if (assertedLiveClaims.length > 0 && liveAttestationGate.errors.length === 0 &&
      !isClaimsPromotionApproved(claimsPromotion, claimsPromotionGate)) {
    liveAttestationGate.errors.push('asserted_live_claims_require_promotion_approval');
  }

  const submissionStrictReady = isSubmissionStrictReady(submission, submissionGate);
  const deploymentStrictReady = isDeploymentStrictReady(deployment, deploymentGate);
  const blockingScanExclusions = scanExclusions.filter((item) => item.reason !== 'binary');
  const releaseCandidate =
    source.clean &&
    secretFindings.length === 0 &&
    blockingScanExclusions.length === 0 &&
    submissionStrictReady &&
    deploymentStrictReady;
  const liveEvidenceStrictReady = liveAttestationGate.errors.length === 0 &&
    isClaimsPromotionApproved(claimsPromotion, claimsPromotionGate);
  const releaseCandidateWithLiveEvidence = releaseCandidate && liveEvidenceStrictReady;

  return {
    schema_version: SCHEMA_VERSION,
    project: submission.project_name,
    source,
    release_candidate: releaseCandidateWithLiveEvidence,
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
      live_evidence: {
        status: liveAttestation ? liveAttestation.status : 'absent',
        structurally_valid: liveAttestationGate.errors.length === 0,
        strict_ready: liveEvidenceStrictReady,
        errors: liveAttestationGate.errors,
        blockers: liveAttestationGate.blockers,
        attestation: liveAttestationSummary,
        claims_promotion: {
          status: claimsPromotion?.status ?? 'absent',
          structurally_valid: claimsPromotionGate.errors.length === 0,
          errors: claimsPromotionGate.errors,
          blockers: claimsPromotionGate.blockers,
          approval: claimsPromotionSummary,
        },
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
  console.log(`live_evidence_blockers=${evidence.gates.live_evidence.blockers.length}`);

  const invalid =
    !evidence.gates.submission.structurally_valid ||
    !evidence.gates.deployment.structurally_valid ||
    !evidence.gates.live_evidence.structurally_valid ||
    evidence.secret_scan.findings.length > 0 ||
    evidence.secret_scan.exclusions.some((item) => item.reason !== 'binary');
  if (invalid || (strict && !evidence.release_candidate)) return 1;
  return 0;
}

const isCli = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) process.exitCode = main();
