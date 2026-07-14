import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCHEMA_VERSION = 'jingci.hackathon-demo-rehearsal.v1';
const CLAIMS = ['live_ai_media_provider', 'live_b2_storage', 'public_deployment', 'final_demo'];

export function evaluateDemo(payload, artifactExists = existsSync) {
  const errors = [];
  const evidenceModes = new Set();
  if (!payload || typeof payload !== 'object') return { errors: ['demo payload must be an object'], blockers: [] };
  if (payload.schema_version !== SCHEMA_VERSION) errors.push(`schema_version must be ${SCHEMA_VERSION}`);
  if (!['local-rehearsal', 'final-ready'].includes(payload.status)) errors.push('status must be local-rehearsal or final-ready');
  if (!Number.isInteger(payload.target_runtime_seconds) || payload.target_runtime_seconds < 1 || payload.target_runtime_seconds > 175) {
    errors.push('target_runtime_seconds must be an integer between 1 and 175');
  }
  for (const claim of CLAIMS) {
    if (typeof payload.claims?.[claim] !== 'boolean') errors.push(`claim ${claim} must be boolean`);
  }
  if (!Array.isArray(payload.segments) || payload.segments.length === 0) {
    errors.push('segments must not be empty');
  } else {
    let expectedStart = 0;
    for (const segment of payload.segments) {
      if (segment.start !== expectedStart || !Number.isInteger(segment.end) || segment.end <= segment.start) {
        errors.push(`segment ${segment.name ?? 'unknown'} must be contiguous and increasing`);
      }
      if (!['ui', 'fixture', 'local', 'live'].includes(segment.evidence_mode)) {
        errors.push(`segment ${segment.name ?? 'unknown'} has invalid evidence_mode`);
      }
      evidenceModes.add(segment.evidence_mode);
      expectedStart = segment.end;
    }
    if (expectedStart !== payload.target_runtime_seconds) errors.push('segments must end at target_runtime_seconds');
    if (payload.status === 'local-rehearsal' && (!evidenceModes.has('local') || !evidenceModes.has('fixture'))) {
      errors.push('local rehearsal must include both local and fixture evidence modes');
    }
  }
  if (!Array.isArray(payload.artifacts) || payload.artifacts.length === 0) {
    errors.push('artifacts must not be empty');
  } else {
    for (const artifact of payload.artifacts) {
      if (typeof artifact !== 'string' || !artifactExists(path.resolve(artifact))) errors.push(`missing artifact: ${artifact}`);
    }
  }
  if (!Array.isArray(payload.blockers)) errors.push('blockers must be an array');
  const blockers = Array.isArray(payload.blockers) ? payload.blockers.filter((item) => typeof item === 'string') : [];
  if (Array.isArray(payload.blockers) && blockers.length !== payload.blockers.length) errors.push('blockers must contain only strings');

  if (payload.status === 'local-rehearsal') {
    for (const claim of CLAIMS) {
      if (payload.claims?.[claim] !== false) errors.push(`local rehearsal cannot claim ${claim}`);
    }
    if (payload.visual_reel?.public_url) errors.push('local rehearsal cannot include a public video URL');
  }
  if (payload.status === 'final-ready') {
    if (blockers.length > 0) errors.push('final-ready demo cannot contain blockers');
    for (const claim of CLAIMS) {
      if (payload.claims?.[claim] !== true) errors.push(`final-ready demo requires claim ${claim}`);
    }
    if (!/^https:\/\//.test(payload.visual_reel?.public_url ?? '')) errors.push('final-ready demo requires a public HTTPS video URL');
    if (!evidenceModes.has('live')) errors.push('final-ready demo requires a live evidence segment');
    if (payload.visual_reel?.audio !== true && payload.visual_reel?.captions !== true) {
      errors.push('final-ready demo requires voiceover or accurate captions');
    }
  }
  return { errors, blockers };
}

export function isDemoStrictReady(payload, result = evaluateDemo(payload)) {
  return result.errors.length === 0 && result.blockers.length === 0 && payload?.status === 'final-ready';
}

function main() {
  const strict = process.argv.includes('--strict');
  const file = path.resolve('docs/campaigns/backblaze-genmedia-2026/demo-rehearsal.json');
  const payload = JSON.parse(readFileSync(file, 'utf8'));
  const result = evaluateDemo(payload);
  if (result.errors.length > 0) {
    console.error(`Demo rehearsal is invalid:\n- ${result.errors.join('\n- ')}`);
    return 1;
  }
  if (result.blockers.length > 0) {
    console.log(`Demo rehearsal is structurally valid with ${result.blockers.length} open blockers:`);
    for (const blocker of result.blockers) console.log(`- ${blocker}`);
    return strict ? 1 : 0;
  }
  if (strict && !isDemoStrictReady(payload, result)) {
    console.error('Strict demo readiness requires status final-ready.');
    return 1;
  }
  console.log(`Demo readiness is valid with no open blockers (${payload.status}).`);
  return 0;
}

const isCli = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) process.exitCode = main();
