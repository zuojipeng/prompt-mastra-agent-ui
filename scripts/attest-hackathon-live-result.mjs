import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import {
  chmodSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { MAX_SCAN_BYTES, scanSecrets } from './hackathon-secret-scan.mjs';

const RESULT_SCHEMA = 'jingci.hackathon-live-result.v1';
const ATTESTATION_SCHEMA = 'jingci.hackathon-live-attestation.v1';
const RECOVERED_RESULT_SCHEMA = 'jingci.recovered-runway-b2-result.v1';
const RECOVERED_ATTESTATION_SCHEMA = 'jingci.hackathon-recovered-live-attestation.v1';
const PRIVATE_ROOT = 'artifacts/hackathon/backblaze-genmedia-2026/private';
const DEFAULT_OUTPUT = 'artifacts/hackathon/backblaze-genmedia-2026/live-attestation.json';
const HEX_64 = /^[0-9a-f]{64}$/;
const HEX_40 = /^[0-9a-f]{40}$/;
const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{2,127}$/;
const SAFE_ACTOR = /^[A-Za-z0-9][A-Za-z0-9 ._@+-]{1,127}$/;
const TASK_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DNS_HOST = /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;
const OWNED_PREFIX = /^jingci-smoke\/([0-9]{4})([0-9]{2})([0-9]{2})T([0-9]{2})([0-9]{2})([0-9]{2})Z\/[0-9a-f]{32}$/;
const URL_OR_SIGNED_QUERY = /(?:https?:\/\/|[?&](?:X-Amz-(?:Algorithm|Credential|Signature)|token|sig|signature)=)/i;

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function exactKeys(value, expected) {
  return value && typeof value === 'object' && !Array.isArray(value) &&
    Object.keys(value).length === expected.length && expected.every((key) => Object.hasOwn(value, key));
}

function validTimestamp(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value)) return false;
  const parsed = new Date(value);
  const normalized = value.includes('.') ? value : value.replace('Z', '.000Z');
  return Number.isFinite(parsed.getTime()) && parsed.toISOString() === normalized;
}

function validOwnedPrefix(value) {
  const match = typeof value === 'string' ? OWNED_PREFIX.exec(value) : null;
  if (!match) return false;
  const [, year, month, day, hour, minute, second] = match;
  return validTimestamp(`${year}-${month}-${day}T${hour}:${minute}:${second}Z`);
}

function sameSet(actual, expected) {
  return Array.isArray(actual) && actual.length === expected.length &&
    [...actual].sort().every((value, index) => value === [...expected].sort()[index]);
}

export function validatePrivateLiveResult(result, { expectedCommit } = {}) {
  const errors = [];
  if (!exactKeys(result, ['schema_version', 'status', 'run_id', 'started_at', 'finished_at', 'source', 'approval', 'provider', 'media', 'storage', 'cleanup', 'evidence'])) {
    return ['result_shape_invalid'];
  }
  if (result.schema_version !== RESULT_SCHEMA) errors.push('result_schema_invalid');
  if (result.status !== 'passed') errors.push('result_status_not_passed');
  if (!SAFE_ID.test(result.run_id ?? '')) errors.push('run_id_invalid');
  if (!validTimestamp(result.started_at) || !validTimestamp(result.finished_at) ||
      Date.parse(result.started_at) >= Date.parse(result.finished_at)) errors.push('result_time_window_invalid');

  if (!exactKeys(result.source, ['commit', 'clean']) || !HEX_40.test(result.source?.commit ?? '') || result.source?.clean !== true) {
    errors.push('source_invalid');
  } else if (expectedCommit && result.source.commit !== expectedCommit) {
    errors.push('source_commit_mismatch');
  }

  const approval = result.approval;
  if (!exactKeys(approval, ['approval_id', 'approval_document_sha256', 'run_id', 'commit', 'human_actor', 'approved_at', 'expires_at', 'consumed_at', 'maximum_attempts', 'maximum_estimated_cost_usd']) ||
      !SAFE_ID.test(approval?.approval_id ?? '') || !SAFE_ACTOR.test(approval?.human_actor ?? '') ||
      !HEX_64.test(approval?.approval_document_sha256 ?? '') ||
      approval?.run_id !== result.run_id || approval?.commit !== result.source?.commit ||
      !validTimestamp(approval?.approved_at) || !validTimestamp(approval?.expires_at) || !validTimestamp(approval?.consumed_at) ||
      approval?.maximum_attempts !== 1 || approval?.maximum_estimated_cost_usd !== 0.6) {
    errors.push('approval_invalid');
  } else if (!(Date.parse(approval.approved_at) <= Date.parse(result.started_at) &&
               Date.parse(result.started_at) <= Date.parse(approval.consumed_at) &&
               Date.parse(approval.consumed_at) <= Date.parse(result.provider?.completed_at) &&
               Date.parse(result.provider?.completed_at) < Date.parse(approval.expires_at))) {
    errors.push('approval_time_window_invalid');
  }

  const provider = result.provider;
  if (!exactKeys(provider, ['name', 'model', 'api_version', 'task_id', 'create_attempts', 'duration_seconds', 'ratio', 'completed_at']) ||
      provider?.name !== 'runway' || provider?.model !== 'gen4.5' || provider?.api_version !== '2024-11-06' ||
      !SAFE_ID.test(provider?.task_id ?? '') || provider?.create_attempts !== 1 || provider?.duration_seconds !== 5 ||
      provider?.ratio !== '1280:720' || !validTimestamp(provider?.completed_at)) {
    errors.push('provider_evidence_invalid');
  }

  const media = result.media;
  if (!exactKeys(media, ['container', 'bytes', 'duration_seconds', 'width', 'height', 'sha256']) ||
      media?.container !== 'mp4' || !Number.isSafeInteger(media?.bytes) || media.bytes <= 0 || media.bytes > 250_000_000 ||
      typeof media?.duration_seconds !== 'number' || media.duration_seconds < 4 || media.duration_seconds > 6 ||
      media?.width !== 1280 || media?.height !== 720 || !HEX_64.test(media?.sha256 ?? '')) {
    errors.push('media_probe_invalid');
  }

  const storage = result.storage;
  if (!exactKeys(storage, ['backend', 'owned_prefix', 'asset_key', 'manifest_key', 'asset_sha256', 'manifest_hash', 'readback_verified', 'lineage_verified']) ||
      storage?.backend !== 'backblaze_b2' || !validOwnedPrefix(storage?.owned_prefix) ||
      storage?.asset_key !== `${storage?.owned_prefix}/assets/${storage?.asset_sha256}.mp4` ||
      storage?.manifest_key !== `${storage?.owned_prefix}/manifests/${storage?.manifest_hash}.json` ||
      storage.asset_key === storage.manifest_key ||
      !HEX_64.test(storage?.asset_sha256 ?? '') || !HEX_64.test(storage?.manifest_hash ?? '') ||
      storage?.readback_verified !== true || storage?.lineage_verified !== true) {
    errors.push('storage_evidence_invalid');
  } else if (storage.asset_sha256 !== media?.sha256) {
    errors.push('asset_digest_mismatch');
  }

  const cleanup = result.cleanup;
  if (!exactKeys(cleanup, ['status', 'deleted_keys', 'absence_confirmed', 'residual_keys', 'backend_closed', 'local_media_removed', 'completed_at']) ||
      cleanup?.status !== 'complete' || cleanup?.absence_confirmed !== true || cleanup?.backend_closed !== true ||
      cleanup?.local_media_removed !== true ||
      !validTimestamp(cleanup?.completed_at) || !Array.isArray(cleanup?.residual_keys) || cleanup.residual_keys.length !== 0 ||
      !sameSet(cleanup?.deleted_keys, [storage?.asset_key, storage?.manifest_key])) {
    errors.push('cleanup_incomplete');
  }
  if (validTimestamp(provider?.completed_at) && validTimestamp(cleanup?.completed_at) &&
      !(Date.parse(result.started_at) <= Date.parse(provider.completed_at) &&
        Date.parse(provider.completed_at) <= Date.parse(cleanup.completed_at) &&
        Date.parse(cleanup.completed_at) <= Date.parse(result.finished_at))) errors.push('evidence_time_order_invalid');

  if (!exactKeys(result.evidence, ['scan_requested']) || result.evidence?.scan_requested !== true) {
    errors.push('evidence_scan_not_requested');
  }
  if (URL_OR_SIGNED_QUERY.test(JSON.stringify(result))) errors.push('url_or_signed_query_forbidden');
  return [...new Set(errors)];
}

export function buildRedactedLiveAttestation(result, rawBytes, { expectedCommit } = {}) {
  const canonicalBytes = Buffer.from(`${JSON.stringify(result, null, 2)}\n`);
  const rawInvalid = rawBytes.length <= 0 || rawBytes.length > 256_000 || rawBytes.includes(0) || !rawBytes.equals(canonicalBytes);
  const secretFindings = scanSecrets([{ path: 'private-live-result.json', content: rawBytes }]);
  const errors = validatePrivateLiveResult(result, { expectedCommit });
  if (rawInvalid) errors.push('private_result_not_canonical');
  if (secretFindings.length > 0) errors.push('secret_material_detected');
  if (errors.length > 0) return { errors: [...new Set(errors)], attestation: null, secretFindings };

  return {
    errors: [],
    secretFindings: [],
    attestation: {
      schema_version: ATTESTATION_SCHEMA,
      status: 'validated',
      source_commit: result.source.commit,
      result_sha256: sha256(rawBytes),
      result_bytes: rawBytes.length,
      binding_sha256: sha256(JSON.stringify({
        run_id: result.run_id,
        approval_id: result.approval.approval_id,
        approval_document_sha256: result.approval.approval_document_sha256,
        approval_run_id: result.approval.run_id,
        approval_commit: result.approval.commit,
        task_id: result.provider.task_id,
        owned_prefix: result.storage.owned_prefix,
      })),
      provider: {
        name: result.provider.name,
        model: result.provider.model,
        api_version: result.provider.api_version,
        task_id_hash: sha256(result.provider.task_id),
        create_attempts: result.provider.create_attempts,
        duration_seconds: result.provider.duration_seconds,
        ratio: result.provider.ratio,
      },
      media: { ...result.media },
      storage: {
        backend: result.storage.backend,
        owned_prefix_hash: sha256(result.storage.owned_prefix),
        asset_key_hash: sha256(result.storage.asset_key),
        manifest_key_hash: sha256(result.storage.manifest_key),
        asset_sha256: result.storage.asset_sha256,
        manifest_hash: result.storage.manifest_hash,
        readback_verified: true,
        lineage_verified: true,
      },
      cleanup: {
        status: 'complete',
        deleted_key_count: 2,
        absence_confirmed: true,
        residual_key_count: 0,
        backend_closed: true,
        local_media_removed: true,
      },
      started_at: result.started_at,
      finished_at: result.finished_at,
      scanner: { version: 'jingci-secret-scan.v1', passed: true, finding_count: 0, signed_url_count: 0 },
      corroborated_claims: {
        live_ai_media_provider: true,
        live_b2_upload_readback: true,
      },
      unsupported_claims: {
        public_serving: false,
        durable_retention: false,
        deployment: false,
        release_readiness: false,
        judging_access: false,
        submission: false,
      },
      claims_promotion_approval: false,
      claims_eligible: false,
    },
  };
}

export function validatePrivateRecoveredResult(result) {
  const errors = [];
  const expectedKeys = [
    'schema_version', 'status', 'source', 'prefix', 'task_id', 'output_host',
    'asset_key', 'manifest_key', 'asset_sha256', 'asset_size_bytes', 'manifest_hash',
    'probe', 'provider_create_count', 'storage_cleanup', 'local_media_preserved',
  ];
  if (!exactKeys(result, expectedKeys)) return ['recovered_result_shape_invalid'];
  if (result.schema_version !== RECOVERED_RESULT_SCHEMA || result.status !== 'passed' ||
      result.source !== 'existing_succeeded_runway_task') errors.push('recovered_result_identity_invalid');
  if (!validOwnedPrefix(result.prefix)) errors.push('recovered_prefix_invalid');
  if (!TASK_ID.test(result.task_id ?? '')) errors.push('recovered_task_id_invalid');
  if (typeof result.output_host !== 'string' || !DNS_HOST.test(result.output_host) ||
      result.output_host !== result.output_host.toLowerCase()) errors.push('recovered_output_host_invalid');
  if (!HEX_64.test(result.asset_sha256 ?? '') || !HEX_64.test(result.manifest_hash ?? '') ||
      !Number.isSafeInteger(result.asset_size_bytes) || result.asset_size_bytes <= 0 ||
      result.asset_size_bytes > 250_000_000) errors.push('recovered_media_digest_invalid');
  const expectedAssetKey = `${result.prefix}/assets/${result.asset_sha256?.slice(0, 2)}/${result.asset_sha256?.slice(2, 4)}/${result.asset_sha256}.mp4`;
  const manifestPrefix = `${result.prefix}/manifests/`;
  const manifestId = typeof result.manifest_key === 'string' && result.manifest_key.startsWith(manifestPrefix) &&
    result.manifest_key.endsWith('.json')
    ? result.manifest_key.slice(manifestPrefix.length, -'.json'.length)
    : '';
  if (result.asset_key !== expectedAssetKey || !TASK_ID.test(manifestId) ||
      result.asset_key === result.manifest_key) errors.push('recovered_storage_key_invalid');
  if (!exactKeys(result.probe, ['codec', 'width', 'height', 'duration_seconds']) ||
      result.probe?.codec !== 'h264' || result.probe?.width !== 1280 || result.probe?.height !== 720 ||
      typeof result.probe?.duration_seconds !== 'number' || result.probe.duration_seconds < 4 ||
      result.probe.duration_seconds > 6) errors.push('recovered_probe_invalid');
  if (result.provider_create_count !== 0) errors.push('recovery_provider_create_forbidden');
  if (result.storage_cleanup !== true || result.local_media_preserved !== true) {
    errors.push('recovered_cleanup_or_media_invalid');
  }
  if (URL_OR_SIGNED_QUERY.test(JSON.stringify(result))) errors.push('url_or_signed_query_forbidden');
  return [...new Set(errors)];
}

export function buildRedactedRecoveredAttestation(result, rawBytes, { expectedCommit } = {}) {
  const canonicalBytes = Buffer.from(`${JSON.stringify(result, null, 2)}\n`);
  const rawInvalid = rawBytes.length <= 0 || rawBytes.length > 256_000 || rawBytes.includes(0) ||
    !rawBytes.equals(canonicalBytes);
  const secretFindings = scanSecrets([{ path: 'private-recovered-result.json', content: rawBytes }]);
  const errors = validatePrivateRecoveredResult(result);
  if (!HEX_40.test(expectedCommit ?? '')) errors.push('attestation_source_mismatch');
  if (rawInvalid) errors.push('private_result_not_canonical');
  if (secretFindings.length > 0) errors.push('secret_material_detected');
  if (errors.length > 0) return { errors: [...new Set(errors)], attestation: null, secretFindings };

  return {
    errors: [],
    secretFindings: [],
    attestation: {
      schema_version: RECOVERED_ATTESTATION_SCHEMA,
      status: 'validated_recovery',
      source_commit: expectedCommit,
      result_sha256: sha256(rawBytes),
      result_bytes: rawBytes.length,
      binding_sha256: sha256(JSON.stringify({
        task_id: result.task_id,
        output_host: result.output_host,
        owned_prefix: result.prefix,
        asset_key: result.asset_key,
        manifest_key: result.manifest_key,
      })),
      provider: {
        name: 'runway',
        model: 'gen4.5',
        api_version: '2024-11-06',
        source_state: result.source,
        task_id_hash: sha256(result.task_id),
        output_host_hash: sha256(result.output_host),
        provider_create_count_in_recovery: 0,
      },
      media: {
        container: 'mp4',
        codec: result.probe.codec,
        bytes: result.asset_size_bytes,
        duration_seconds: result.probe.duration_seconds,
        width: result.probe.width,
        height: result.probe.height,
        sha256: result.asset_sha256,
      },
      storage: {
        backend: 'backblaze_b2',
        owned_prefix_hash: sha256(result.prefix),
        asset_key_hash: sha256(result.asset_key),
        manifest_key_hash: sha256(result.manifest_key),
        asset_sha256: result.asset_sha256,
        manifest_hash: result.manifest_hash,
        readback_verified: true,
        lineage_verified: true,
      },
      cleanup: {
        status: 'complete',
        deleted_key_count: 2,
        residual_key_count: 0,
        backend_closed: true,
        local_media_preserved: true,
      },
      scanner: { version: 'jingci-secret-scan.v1', passed: true, finding_count: 0, signed_url_count: 0 },
      corroborated_claims: {
        recovered_succeeded_runway_output: true,
        live_b2_upload_readback_cleanup: true,
      },
      unsupported_claims: {
        atomic_runway_to_b2_transaction: false,
        provider_create_attempt_count: false,
        public_serving: false,
        durable_retention: false,
        deployment: false,
        release_readiness: false,
        judging_access: false,
        submission: false,
      },
      claims_promotion_approval: false,
      claims_eligible: false,
    },
  };
}

export function evaluateRedactedRecoveredAttestation(attestation, { expectedCommit } = {}) {
  const errors = [];
  const expectedKeys = [
    'schema_version', 'status', 'source_commit', 'result_sha256', 'result_bytes', 'binding_sha256',
    'provider', 'media', 'storage', 'cleanup', 'scanner', 'corroborated_claims',
    'unsupported_claims', 'claims_promotion_approval', 'claims_eligible',
  ];
  if (!exactKeys(attestation, expectedKeys)) return { errors: ['attestation_shape_invalid'], blockers: [] };
  if (attestation.schema_version !== RECOVERED_ATTESTATION_SCHEMA || attestation.status !== 'validated_recovery') {
    errors.push('attestation_identity_invalid');
  }
  for (const field of ['result_sha256', 'binding_sha256']) {
    if (!HEX_64.test(attestation[field] ?? '')) errors.push(`${field}_invalid`);
  }
  if (!HEX_40.test(attestation.source_commit ?? '') || (expectedCommit && attestation.source_commit !== expectedCommit)) {
    errors.push('attestation_source_mismatch');
  }
  if (!Number.isSafeInteger(attestation.result_bytes) || attestation.result_bytes <= 0 ||
      attestation.result_bytes > 256_000) errors.push('attestation_size_invalid');
  if (URL_OR_SIGNED_QUERY.test(JSON.stringify(attestation)) ||
      scanSecrets([{ path: 'attestation.json', content: JSON.stringify(attestation) }]).length > 0) {
    errors.push('attestation_not_redacted');
  }
  if (attestation.claims_promotion_approval !== false || attestation.claims_eligible !== false) {
    errors.push('claims_promotion_not_supported');
  }
  if (!exactKeys(attestation.provider, ['name', 'model', 'api_version', 'source_state', 'task_id_hash', 'output_host_hash', 'provider_create_count_in_recovery']) ||
      attestation.provider?.name !== 'runway' || attestation.provider?.model !== 'gen4.5' ||
      attestation.provider?.api_version !== '2024-11-06' ||
      attestation.provider?.source_state !== 'existing_succeeded_runway_task' ||
      !HEX_64.test(attestation.provider?.task_id_hash ?? '') ||
      !HEX_64.test(attestation.provider?.output_host_hash ?? '') ||
      attestation.provider?.provider_create_count_in_recovery !== 0) errors.push('attestation_provider_invalid');
  if (!exactKeys(attestation.media, ['container', 'codec', 'bytes', 'duration_seconds', 'width', 'height', 'sha256']) ||
      attestation.media?.container !== 'mp4' || attestation.media?.codec !== 'h264' ||
      !Number.isSafeInteger(attestation.media?.bytes) || attestation.media.bytes <= 0 ||
      attestation.media.bytes > 250_000_000 || typeof attestation.media?.duration_seconds !== 'number' ||
      attestation.media.duration_seconds < 4 || attestation.media.duration_seconds > 6 ||
      attestation.media?.width !== 1280 || attestation.media?.height !== 720 ||
      !HEX_64.test(attestation.media?.sha256 ?? '')) errors.push('attestation_media_invalid');
  if (!exactKeys(attestation.storage, ['backend', 'owned_prefix_hash', 'asset_key_hash', 'manifest_key_hash', 'asset_sha256', 'manifest_hash', 'readback_verified', 'lineage_verified']) ||
      attestation.storage?.backend !== 'backblaze_b2' || !HEX_64.test(attestation.storage?.owned_prefix_hash ?? '') ||
      !HEX_64.test(attestation.storage?.asset_key_hash ?? '') || !HEX_64.test(attestation.storage?.manifest_key_hash ?? '') ||
      !HEX_64.test(attestation.storage?.asset_sha256 ?? '') || !HEX_64.test(attestation.storage?.manifest_hash ?? '') ||
      attestation.storage?.readback_verified !== true || attestation.storage?.lineage_verified !== true ||
      attestation.storage?.asset_sha256 !== attestation.media?.sha256) errors.push('attestation_storage_invalid');
  if (!exactKeys(attestation.cleanup, ['status', 'deleted_key_count', 'residual_key_count', 'backend_closed', 'local_media_preserved']) ||
      attestation.cleanup?.status !== 'complete' || attestation.cleanup?.deleted_key_count !== 2 ||
      attestation.cleanup?.residual_key_count !== 0 || attestation.cleanup?.backend_closed !== true ||
      attestation.cleanup?.local_media_preserved !== true) errors.push('attestation_cleanup_invalid');
  if (!exactKeys(attestation.scanner, ['version', 'passed', 'finding_count', 'signed_url_count']) ||
      attestation.scanner?.version !== 'jingci-secret-scan.v1' || attestation.scanner?.passed !== true ||
      attestation.scanner?.finding_count !== 0 || attestation.scanner?.signed_url_count !== 0) {
    errors.push('attestation_scan_invalid');
  }
  if (!exactKeys(attestation.corroborated_claims, ['recovered_succeeded_runway_output', 'live_b2_upload_readback_cleanup']) ||
      attestation.corroborated_claims?.recovered_succeeded_runway_output !== true ||
      attestation.corroborated_claims?.live_b2_upload_readback_cleanup !== true) {
    errors.push('attestation_claim_scope_invalid');
  }
  const unsupportedKeys = [
    'atomic_runway_to_b2_transaction', 'provider_create_attempt_count', 'public_serving',
    'durable_retention', 'deployment', 'release_readiness', 'judging_access', 'submission',
  ];
  if (!exactKeys(attestation.unsupported_claims, unsupportedKeys) ||
      Object.values(attestation.unsupported_claims ?? {}).some((value) => value !== false)) {
    errors.push('attestation_unsupported_claim_invalid');
  }
  return { errors: [...new Set(errors)], blockers: ['live_claims_promotion_approval_missing'] };
}

export function evaluateRedactedLiveAttestation(attestation, { expectedCommit } = {}) {
  if (attestation?.schema_version === RECOVERED_ATTESTATION_SCHEMA) {
    return evaluateRedactedRecoveredAttestation(attestation, { expectedCommit });
  }
  const errors = [];
  if (!exactKeys(attestation, ['schema_version', 'status', 'source_commit', 'result_sha256', 'result_bytes', 'binding_sha256', 'provider', 'media', 'storage', 'cleanup', 'started_at', 'finished_at', 'scanner', 'corroborated_claims', 'unsupported_claims', 'claims_promotion_approval', 'claims_eligible'])) {
    return { errors: ['attestation_shape_invalid'], blockers: [] };
  }
  if (attestation.schema_version !== ATTESTATION_SCHEMA || attestation.status !== 'validated') errors.push('attestation_identity_invalid');
  for (const field of ['result_sha256', 'binding_sha256']) {
    if (!HEX_64.test(attestation[field] ?? '')) errors.push(`${field}_invalid`);
  }
  if (!HEX_40.test(attestation.source_commit ?? '') || (expectedCommit && attestation.source_commit !== expectedCommit)) errors.push('attestation_source_mismatch');
  if (!Number.isSafeInteger(attestation.result_bytes) || attestation.result_bytes <= 0 || attestation.result_bytes > 256_000) errors.push('attestation_size_invalid');
  if (!validTimestamp(attestation.started_at) || !validTimestamp(attestation.finished_at) ||
      Date.parse(attestation.started_at) >= Date.parse(attestation.finished_at)) errors.push('attestation_timestamp_invalid');
  if (URL_OR_SIGNED_QUERY.test(JSON.stringify(attestation)) || scanSecrets([{ path: 'attestation.json', content: JSON.stringify(attestation) }]).length > 0) {
    errors.push('attestation_not_redacted');
  }
  if (attestation.claims_promotion_approval !== false || attestation.claims_eligible !== false) errors.push('claims_promotion_not_supported');
  if (!exactKeys(attestation.provider, ['name', 'model', 'api_version', 'task_id_hash', 'create_attempts', 'duration_seconds', 'ratio']) ||
      attestation.provider?.name !== 'runway' || attestation.provider?.model !== 'gen4.5' || attestation.provider?.api_version !== '2024-11-06' ||
      !HEX_64.test(attestation.provider?.task_id_hash ?? '') || attestation.provider?.create_attempts !== 1 ||
      attestation.provider?.duration_seconds !== 5 || attestation.provider?.ratio !== '1280:720') errors.push('attestation_provider_invalid');
  if (!exactKeys(attestation.media, ['container', 'bytes', 'duration_seconds', 'width', 'height', 'sha256']) ||
      attestation.media?.container !== 'mp4' || !Number.isSafeInteger(attestation.media?.bytes) || attestation.media.bytes <= 0 ||
      attestation.media.bytes > 250_000_000 || typeof attestation.media?.duration_seconds !== 'number' ||
      attestation.media.duration_seconds < 4 || attestation.media.duration_seconds > 6 ||
      attestation.media?.width !== 1280 || attestation.media?.height !== 720 ||
      !HEX_64.test(attestation.media?.sha256 ?? '')) errors.push('attestation_media_invalid');
  if (!exactKeys(attestation.storage, ['backend', 'owned_prefix_hash', 'asset_key_hash', 'manifest_key_hash', 'asset_sha256', 'manifest_hash', 'readback_verified', 'lineage_verified']) ||
      attestation.storage?.backend !== 'backblaze_b2' || !HEX_64.test(attestation.storage?.owned_prefix_hash ?? '') ||
      !HEX_64.test(attestation.storage?.asset_key_hash ?? '') || !HEX_64.test(attestation.storage?.manifest_key_hash ?? '') ||
      !HEX_64.test(attestation.storage?.asset_sha256 ?? '') || !HEX_64.test(attestation.storage?.manifest_hash ?? '') ||
      attestation.storage?.readback_verified !== true || attestation.storage?.lineage_verified !== true ||
      attestation.storage?.asset_sha256 !== attestation.media?.sha256) errors.push('attestation_storage_invalid');
  if (!exactKeys(attestation.cleanup, ['status', 'deleted_key_count', 'absence_confirmed', 'residual_key_count', 'backend_closed', 'local_media_removed']) ||
      attestation.cleanup?.status !== 'complete' || attestation.cleanup?.deleted_key_count !== 2 ||
      attestation.cleanup?.absence_confirmed !== true || attestation.cleanup?.residual_key_count !== 0 ||
      attestation.cleanup?.backend_closed !== true || attestation.cleanup?.local_media_removed !== true) errors.push('attestation_cleanup_invalid');
  if (!exactKeys(attestation.scanner, ['version', 'passed', 'finding_count', 'signed_url_count']) ||
      attestation.scanner?.version !== 'jingci-secret-scan.v1' || attestation.scanner?.passed !== true ||
      attestation.scanner?.finding_count !== 0 || attestation.scanner?.signed_url_count !== 0) errors.push('attestation_scan_invalid');
  if (!exactKeys(attestation.corroborated_claims, ['live_ai_media_provider', 'live_b2_upload_readback']) ||
      attestation.corroborated_claims?.live_ai_media_provider !== true ||
      attestation.corroborated_claims?.live_b2_upload_readback !== true) errors.push('attestation_claim_scope_invalid');
  if (!exactKeys(attestation.unsupported_claims, ['public_serving', 'durable_retention', 'deployment', 'release_readiness', 'judging_access', 'submission']) ||
      Object.values(attestation.unsupported_claims ?? {}).some((value) => value !== false)) errors.push('attestation_unsupported_claim_invalid');
  return { errors: [...new Set(errors)], blockers: ['live_claims_promotion_approval_missing'] };
}

function resolveInside(root, relativePath) {
  const absolute = path.resolve(root, relativePath);
  const relative = path.relative(root, absolute);
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) throw new Error('path must stay inside repository');
  return absolute;
}

function isInside(root, absolutePath) {
  const relative = path.relative(root, absolutePath);
  return relative && !relative.startsWith('..') && !path.isAbsolute(relative);
}

export function attestPrivateLiveResultFile({ inputPath, outputPath, expectedCommit }) {
  const stat = lstatSync(inputPath);
  if (!stat.isFile() || stat.isSymbolicLink()) throw new Error('private result must be a regular non-symlink file');
  if ((stat.mode & 0o777) !== 0o600) throw new Error('private result mode must be 0600');
  if (typeof process.getuid === 'function' && stat.uid !== process.getuid()) throw new Error('private result must be owner-owned');
  if (stat.nlink !== 1) throw new Error('private result must have one hard link');
  if (stat.size <= 0 || stat.size > Math.min(MAX_SCAN_BYTES, 256_000)) throw new Error('private result size is invalid');
  const rawBytes = readFileSync(inputPath);
  if (rawBytes.includes(0)) throw new Error('private result must be UTF-8 JSON');
  const decoded = new TextDecoder('utf-8', { fatal: true }).decode(rawBytes);
  const result = JSON.parse(decoded);
  const evaluated = result?.schema_version === RECOVERED_RESULT_SCHEMA
    ? buildRedactedRecoveredAttestation(result, rawBytes, { expectedCommit })
    : buildRedactedLiveAttestation(result, rawBytes, { expectedCommit });
  if (evaluated.errors.length > 0) throw new Error(`private result rejected: ${evaluated.errors.join(', ')}`);
  if (existsSync(outputPath)) throw new Error('attestation output must not already exist');
  mkdirSync(path.dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(evaluated.attestation, null, 2)}\n`, { mode: 0o600, flag: 'wx' });
  chmodSync(outputPath, 0o600);
  return evaluated.attestation;
}

function argumentValue(name) {
  const prefix = `--${name}=`;
  return process.argv.find((item) => item.startsWith(prefix))?.slice(prefix.length);
}

function main() {
  const root = realpathSync(process.cwd());
  const inputRelative = argumentValue('in');
  const outputRelative = argumentValue('out') ?? DEFAULT_OUTPUT;
  if (!inputRelative || !inputRelative.startsWith(`${PRIVATE_ROOT}/`)) {
    console.error(`--in must name a mode-0600 file below ${PRIVATE_ROOT}/`);
    return 1;
  }
  if (outputRelative !== DEFAULT_OUTPUT) {
    console.error(`--out is fixed to ${DEFAULT_OUTPUT}`);
    return 1;
  }
  try {
    const inputPath = resolveInside(root, inputRelative);
    const outputPath = resolveInside(root, outputRelative);
    const privateRoot = resolveInside(root, PRIVATE_ROOT);
    const privateRootStat = lstatSync(privateRoot);
    if (!privateRootStat.isDirectory() || (privateRootStat.mode & 0o777) !== 0o700 ||
        (typeof process.getuid === 'function' && privateRootStat.uid !== process.getuid()) ||
        !isInside(root, realpathSync(privateRoot)) ||
        realpathSync(path.dirname(inputPath)) !== realpathSync(privateRoot)) {
      throw new Error('private evidence directory must be owner-owned mode 0700 with no nested path');
    }
    mkdirSync(path.dirname(outputPath), { recursive: true });
    if (!isInside(root, realpathSync(path.dirname(outputPath)))) throw new Error('attestation output directory escaped repository');
    const expectedCommit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
    const dirty = execFileSync('git', ['status', '--porcelain', '--untracked-files=no'], { cwd: root, encoding: 'utf8' }).trim();
    if (dirty) throw new Error('tracked worktree must be clean before attestation');
    const attestation = attestPrivateLiveResultFile({ inputPath, outputPath, expectedCommit });
    console.log(`Redacted live attestation written to ${path.relative(root, outputPath)}`);
    console.log(`source_commit=${attestation.source_commit} claims_eligible=false`);
    return 0;
  } catch (error) {
    console.error(error instanceof Error ? error.message : 'private result attestation failed');
    return 1;
  }
}

const isCli = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) process.exitCode = main();
