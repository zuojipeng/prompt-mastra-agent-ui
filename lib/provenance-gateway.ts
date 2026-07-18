const MAX_BODY_BYTES = 65_536;
const UPSTREAM_TIMEOUT_MS = 12_000;

export interface ProvenanceGatewayEnv {
  JINGCI_PROVENANCE_ENABLED?: string;
  PROVENANCE_SERVICE_URL?: string;
  PROVENANCE_SERVICE_TOKEN?: string;
}

export interface ProvenanceGatewayOptions {
  request: Request;
  path: string;
  env: ProvenanceGatewayEnv;
  fetchImpl?: typeof fetch;
  requestId?: string;
  timeoutMs?: number;
}

class BodyLimitError extends Error {}

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

function parseServiceUrl(rawUrl: string | undefined) {
  if (!rawUrl) throw new Error('missing service URL');
  const url = new URL(rawUrl);
  if (
    url.protocol !== 'https:'
    || !url.hostname
    || url.username
    || url.password
    || url.pathname !== '/'
    || url.search
    || url.hash
  ) {
    throw new Error('invalid service URL');
  }
  return url;
}

function validateToken(token: string | undefined) {
  if (!token || token.length < 32 || /\s/.test(token)) throw new Error('invalid service token');
  return token;
}

async function readBoundedBody(body: ReadableStream<Uint8Array> | null, maxBytes = MAX_BODY_BYTES) {
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
  if (path === 'health' && method === 'GET') return '/health';
  if (path === 'v1/provenance-runs' && method === 'POST') return '/v1/provenance-runs';
  return null;
}

function isSameOriginRequest(request: Request) {
  const expectedOrigin = new URL(request.url).origin;
  const origin = request.headers.get('Origin');
  const fetchSite = request.headers.get('Sec-Fetch-Site');
  return origin === expectedOrigin && (!fetchSite || fetchSite === 'same-origin');
}

function normalizeUpstreamStatus(status: number) {
  if ([200, 400, 408, 409, 413, 415, 422, 429, 503].includes(status)) return status;
  return 502;
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

export async function handleProvenanceGateway({
  request,
  path,
  env,
  fetchImpl = fetch,
  requestId = crypto.randomUUID(),
  timeoutMs = UPSTREAM_TIMEOUT_MS,
}: ProvenanceGatewayOptions) {
  const route = routeFor(path.replace(/^\/+|\/+$/g, ''), request.method);
  if (!route) return errorResponse(404, 'not_found', requestId);
  if (env.JINGCI_PROVENANCE_ENABLED !== 'YES') {
    return errorResponse(503, 'service_disabled', requestId);
  }
  if (request.method === 'POST' && !isSameOriginRequest(request)) {
    return errorResponse(403, 'origin_denied', requestId);
  }
  if (request.method === 'POST') {
    const contentType = request.headers.get('Content-Type')?.split(';', 1)[0].trim().toLowerCase();
    if (contentType !== 'application/json') {
      return errorResponse(415, 'unsupported_media_type', requestId);
    }
  }

  let serviceUrl: URL;
  let serviceToken: string;
  try {
    serviceUrl = parseServiceUrl(env.PROVENANCE_SERVICE_URL);
    serviceToken = validateToken(env.PROVENANCE_SERVICE_TOKEN);
  } catch {
    return errorResponse(503, 'service_misconfigured', requestId);
  }

  const declaredLength = Number(request.headers.get('Content-Length') || '0');
  if (!Number.isFinite(declaredLength) || declaredLength < 0 || declaredLength > MAX_BODY_BYTES) {
    return errorResponse(413, 'payload_too_large', requestId);
  }

  let requestBody: Uint8Array;
  try {
    requestBody = await readBoundedBody(request.body);
  } catch (error) {
    if (error instanceof BodyLimitError) return errorResponse(413, 'payload_too_large', requestId);
    return errorResponse(400, 'invalid_request_body', requestId);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const upstreamUrl = new URL(route, serviceUrl);
    const response = await fetchImpl(upstreamUrl, {
      method: request.method,
      headers: {
        Authorization: `Bearer ${serviceToken}`,
        'Content-Type': 'application/json',
        Origin: new URL(request.url).origin,
        'X-Request-Id': requestId,
      },
      body: request.method === 'POST' ? toArrayBuffer(requestBody) : undefined,
      redirect: 'error',
      signal: controller.signal,
    });
    if (!response.headers.get('Content-Type')?.toLowerCase().startsWith('application/json')) {
      return errorResponse(502, 'invalid_upstream_response', requestId);
    }
    let responseBody: Uint8Array;
    try {
      responseBody = await readBoundedBody(response.body);
    } catch {
      return errorResponse(502, 'invalid_upstream_response', requestId);
    }
    const status = normalizeUpstreamStatus(response.status);
    if (status !== response.status || status >= 500) {
      return errorResponse(status, 'upstream_unavailable', requestId);
    }
    return new Response(toArrayBuffer(responseBody), {
      status,
      headers: {
        'Cache-Control': 'no-store',
        'Content-Type': 'application/json; charset=utf-8',
        'X-Content-Type-Options': 'nosniff',
        'X-Request-Id': requestId,
      },
    });
  } catch {
    return errorResponse(502, 'upstream_unavailable', requestId);
  } finally {
    clearTimeout(timeout);
  }
}

export const PROVENANCE_GATEWAY_MAX_BODY_BYTES = MAX_BODY_BYTES;
