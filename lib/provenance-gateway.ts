import { AwsClient } from 'aws4fetch';

import {
  normalizeProvenanceRunRequest,
  type ProvenanceRunRequest,
} from './provenance-run-contract';

const MAX_BODY_BYTES = 65_536;
const MAX_SOURCE_BYTES = 100_000_000;
const MANIFEST_PREFIX = 'jingci-preview/runs';
const SOURCE_KEY_PATTERN = /^jingci-preview\/source\/[A-Za-z0-9][A-Za-z0-9._/-]{0,199}$/;
const SHA256_PATTERN = /^[a-f0-9]{64}$/;

export interface ProvenanceGatewayEnv {
  JINGCI_PROVENANCE_ENABLED?: string;
  B2_BUCKET?: string;
  B2_REGION?: string;
  B2_KEY_ID?: string;
  B2_APP_KEY?: string;
  JINGCI_PREVIEW_SOURCE_KEY?: string;
  JINGCI_PREVIEW_SOURCE_SHA256?: string;
  JINGCI_PREVIEW_SOURCE_PROVIDER?: string;
  JINGCI_PREVIEW_SOURCE_MODEL?: string;
  JINGCI_PREVIEW_SOURCE_MAX_BYTES?: string;
}

interface PreviewConfig {
  bucket: string;
  region: string;
  keyId: string;
  appKey: string;
  sourceKey: string;
  sourceSha256: string;
  sourceProvider: string;
  sourceModel: string;
  sourceMaxBytes: number;
}

export interface B2ObjectStore {
  fetch(key: string, init: RequestInit): Promise<Response>;
}

export interface ProvenanceGatewayOptions {
  request: Request;
  path: string;
  env: ProvenanceGatewayEnv;
  objectStore?: B2ObjectStore;
  requestId?: string;
  now?: () => Date;
  randomUUID?: () => string;
}

class BodyLimitError extends Error {}

class AwsB2ObjectStore implements B2ObjectStore {
  private readonly client: AwsClient;

  constructor(private readonly config: PreviewConfig) {
    this.client = new AwsClient({
      accessKeyId: config.keyId,
      secretAccessKey: config.appKey,
      service: 's3',
      region: config.region,
    });
  }

  fetch(key: string, init: RequestInit) {
    const encodedKey = key.split('/').map(encodeURIComponent).join('/');
    const url = `https://s3.${this.config.region}.backblazeb2.com/${encodeURIComponent(this.config.bucket)}/${encodedKey}`;
    return this.client.fetch(url, { ...init, redirect: 'error' });
  }
}

function jsonResponse(status: number, body: unknown, requestId: string) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Cache-Control': 'no-store',
      'Content-Type': 'application/json; charset=utf-8',
      'X-Content-Type-Options': 'nosniff',
      'X-Request-Id': requestId,
    },
  });
}

function errorResponse(status: number, code: string, requestId: string) {
  return jsonResponse(status, { error: { code, message: 'Request could not be completed' } }, requestId);
}

function required(raw: string | undefined, name: string) {
  const value = raw?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function parseConfig(env: ProvenanceGatewayEnv): PreviewConfig {
  const bucket = required(env.B2_BUCKET, 'B2_BUCKET');
  const region = required(env.B2_REGION, 'B2_REGION');
  const keyId = required(env.B2_KEY_ID, 'B2_KEY_ID');
  const appKey = required(env.B2_APP_KEY, 'B2_APP_KEY');
  const sourceKey = required(env.JINGCI_PREVIEW_SOURCE_KEY, 'JINGCI_PREVIEW_SOURCE_KEY');
  const sourceSha256 = required(env.JINGCI_PREVIEW_SOURCE_SHA256, 'JINGCI_PREVIEW_SOURCE_SHA256').toLowerCase();
  const sourceProvider = required(env.JINGCI_PREVIEW_SOURCE_PROVIDER, 'JINGCI_PREVIEW_SOURCE_PROVIDER');
  const sourceModel = required(env.JINGCI_PREVIEW_SOURCE_MODEL, 'JINGCI_PREVIEW_SOURCE_MODEL');
  const sourceMaxBytes = Number(env.JINGCI_PREVIEW_SOURCE_MAX_BYTES);
  if (!/^[a-z0-9][a-z0-9.-]{4,61}[a-z0-9]$/.test(bucket)) throw new Error('invalid B2 bucket');
  if (!/^[a-z]{2}-[a-z]+-\d{3}$/.test(region)) throw new Error('invalid B2 region');
  if (!SOURCE_KEY_PATTERN.test(sourceKey) || sourceKey.includes('..') || sourceKey.endsWith('/')) {
    throw new Error('invalid preview source key');
  }
  if (!SHA256_PATTERN.test(sourceSha256)) throw new Error('invalid preview source digest');
  if (!Number.isInteger(sourceMaxBytes) || sourceMaxBytes < 1 || sourceMaxBytes > MAX_SOURCE_BYTES) {
    throw new Error('invalid preview source byte limit');
  }
  return {
    bucket,
    region,
    keyId,
    appKey,
    sourceKey,
    sourceSha256,
    sourceProvider,
    sourceModel,
    sourceMaxBytes,
  };
}

async function readBoundedBody(body: ReadableStream<Uint8Array> | null, maxBytes: number) {
  if (!body) return new Uint8Array();
  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) throw new BodyLimitError('body exceeds limit');
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const result = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return result;
}

function routeFor(path: string, method: string) {
  if (path === 'health' && method === 'GET') return 'health';
  if (path === 'v1/provenance-runs' && method === 'POST') return 'run';
  return null;
}

function isSameOriginRequest(request: Request) {
  const expectedOrigin = new URL(request.url).origin;
  const origin = request.headers.get('Origin');
  const fetchSite = request.headers.get('Sec-Fetch-Site');
  return origin === expectedOrigin && (!fetchSite || fetchSite === 'same-origin');
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${stableJson(record[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

async function sha256(bytes: Uint8Array | string) {
  const input = typeof bytes === 'string' ? new TextEncoder().encode(bytes) : bytes;
  const digest = await crypto.subtle.digest('SHA-256', toArrayBuffer(input));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function sameBytes(left: Uint8Array, right: Uint8Array) {
  if (left.byteLength !== right.byteLength) return false;
  let difference = 0;
  for (let index = 0; index < left.byteLength; index += 1) difference |= left[index] ^ right[index];
  return difference === 0;
}

async function requireOk(response: Response, operation: string) {
  if (!response.ok) throw new Error(`${operation} failed`);
  return response;
}

async function executeB2Run({
  request,
  config,
  store,
  now,
  randomUUID,
}: {
  request: ProvenanceRunRequest;
  config: PreviewConfig;
  store: B2ObjectStore;
  now: () => Date;
  randomUUID: () => string;
}) {
  const sourceResponse = await requireOk(await store.fetch(config.sourceKey, { method: 'GET' }), 'source read');
  const declaredSize = Number(sourceResponse.headers.get('Content-Length') || '0');
  if (declaredSize > config.sourceMaxBytes) throw new Error('source exceeds byte limit');
  const sourceBytes = await readBoundedBody(sourceResponse.body, config.sourceMaxBytes);
  const sourceDigest = await sha256(sourceBytes);
  if (!sourceBytes.byteLength || sourceDigest !== config.sourceSha256) throw new Error('source digest mismatch');

  const runId = randomUUID().replaceAll('-', '');
  const jobId = `preview-shot-${request.shot_id}-attempt-${request.attempt}-${runId}`;
  const timestamp = now().toISOString();
  const manifest = {
    schema_version: 'jingci.retained-source-manifest.v1',
    job_id: jobId,
    project_id_sha256: await sha256(request.project_id),
    shot_id: request.shot_id,
    parent_job_id_sha256: request.parent_job_id ? await sha256(request.parent_job_id) : null,
    attempt: request.attempt,
    provider: config.sourceProvider,
    model: config.sourceModel,
    modality: 'video',
    source: {
      uri: `b2://${config.bucket}/${config.sourceKey}`,
      sha256: sourceDigest,
      size_bytes: sourceBytes.byteLength,
      media_type: 'video/mp4',
    },
    prompt_sha256: await sha256(request.prompt),
    negative_prompt_sha256: await sha256(request.negative_prompt),
    created_at: timestamp,
  };
  const canonicalManifest = stableJson(manifest);
  const canonicalHash = await sha256(canonicalManifest);
  const storedManifest = new TextEncoder().encode(stableJson({ ...manifest, canonical_hash: canonicalHash }));
  const manifestKey = `${MANIFEST_PREFIX}/${runId}/manifest.json`;
  let manifestMayExist = false;
  try {
    const collision = await store.fetch(manifestKey, { method: 'HEAD' });
    if (collision.status !== 404) throw new Error('manifest destination is not empty');
    manifestMayExist = true;
    await requireOk(await store.fetch(manifestKey, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: toArrayBuffer(storedManifest),
    }), 'manifest write');
    const readback = await requireOk(await store.fetch(manifestKey, { method: 'GET' }), 'manifest readback');
    const readbackBytes = await readBoundedBody(readback.body, MAX_BODY_BYTES);
    if (!sameBytes(storedManifest, readbackBytes)) throw new Error('manifest readback mismatch');
  } catch (error) {
    if (manifestMayExist) {
      const cleanup = await store.fetch(manifestKey, { method: 'DELETE' });
      if (!cleanup.ok && cleanup.status !== 404) throw new Error('manifest cleanup failed');
    }
    throw error;
  }

  return {
    schema_version: 'jingci.provenance-run.v1',
    job_id: jobId,
    project_id: request.project_id,
    shot_id: request.shot_id,
    parent_job_id: request.parent_job_id,
    attempt: request.attempt,
    status: 'succeeded',
    provider: config.sourceProvider,
    model: config.sourceModel,
    modality: 'video',
    created_at: timestamp,
    updated_at: timestamp,
    result: {
      asset: {
        url: `b2://${config.bucket}/${config.sourceKey}`,
        media_type: 'video/mp4',
        sha256: sourceDigest,
        size_bytes: sourceBytes.byteLength,
      },
      manifest: {
        uri: `b2://${config.bucket}/${manifestKey}`,
        canonical_hash: canonicalHash,
        verified: true,
      },
    },
    error: null,
  };
}

export async function handleProvenanceGateway({
  request,
  path,
  env,
  objectStore,
  requestId = crypto.randomUUID(),
  now = () => new Date(),
  randomUUID = () => crypto.randomUUID(),
}: ProvenanceGatewayOptions) {
  const route = routeFor(path.replace(/^\/+|\/+$/g, ''), request.method);
  if (!route) return errorResponse(404, 'not_found', requestId);
  if (env.JINGCI_PROVENANCE_ENABLED !== 'YES') return errorResponse(503, 'service_disabled', requestId);

  let config: PreviewConfig;
  try {
    config = parseConfig(env);
  } catch {
    return errorResponse(503, 'service_misconfigured', requestId);
  }
  if (route === 'health') {
    return jsonResponse(200, { status: 'ok', mode: 'cloudflare-b2-preview' }, requestId);
  }
  if (!isSameOriginRequest(request)) return errorResponse(403, 'origin_denied', requestId);
  const contentType = request.headers.get('Content-Type')?.split(';', 1)[0].trim().toLowerCase();
  if (contentType !== 'application/json') return errorResponse(415, 'unsupported_media_type', requestId);
  const declaredLength = Number(request.headers.get('Content-Length') || '0');
  if (!Number.isFinite(declaredLength) || declaredLength < 0 || declaredLength > MAX_BODY_BYTES) {
    return errorResponse(413, 'payload_too_large', requestId);
  }

  let body: Uint8Array;
  try {
    body = await readBoundedBody(request.body, MAX_BODY_BYTES);
  } catch {
    return errorResponse(413, 'payload_too_large', requestId);
  }
  let runRequest: ProvenanceRunRequest | null = null;
  try {
    runRequest = normalizeProvenanceRunRequest(JSON.parse(new TextDecoder().decode(body)));
  } catch {
    // The public response intentionally does not distinguish parser failures.
  }
  if (!runRequest) return errorResponse(400, 'invalid_request', requestId);
  if (runRequest.provider !== config.sourceProvider || runRequest.model !== config.sourceModel) {
    return errorResponse(400, 'invalid_lineage', requestId);
  }

  try {
    const run = await executeB2Run({
      request: runRequest,
      config,
      store: objectStore ?? new AwsB2ObjectStore(config),
      now,
      randomUUID,
    });
    return jsonResponse(200, run, requestId);
  } catch {
    return errorResponse(502, 'storage_unavailable', requestId);
  }
}

export const PROVENANCE_GATEWAY_MAX_BODY_BYTES = MAX_BODY_BYTES;
