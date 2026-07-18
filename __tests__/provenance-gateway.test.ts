import { describe, expect, it, vi } from 'vitest';
import {
  handleProvenanceGateway,
  PROVENANCE_GATEWAY_MAX_BODY_BYTES,
  type ProvenanceGatewayEnv,
} from '@/lib/provenance-gateway';

const origin = 'https://preview.example.com';
const env: ProvenanceGatewayEnv = {
  JINGCI_PROVENANCE_ENABLED: 'YES',
  PROVENANCE_SERVICE_URL: 'https://jingci-provenance.example.net',
  PROVENANCE_SERVICE_TOKEN: 'a'.repeat(32),
};

function request(body = JSON.stringify({ schema_version: 'jingci.provenance-run-request.v1' })) {
  return new Request(`${origin}/api/provenance/v1/provenance-runs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      'Sec-Fetch-Site': 'same-origin',
    },
    body,
  });
}

describe('provenance Pages gateway', () => {
  it('injects the server-side token and forwards only to the configured HTTPS service', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(JSON.stringify({ status: 'succeeded' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }));
    const response = await handleProvenanceGateway({
      request: request(),
      path: 'v1/provenance-runs',
      env,
      fetchImpl: fetchImpl as typeof fetch,
      requestId: 'request-1',
    });
    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(fetchImpl).toHaveBeenCalledOnce();
    const [url, init] = fetchImpl.mock.calls[0] as [URL, RequestInit];
    expect(url.toString()).toBe('https://jingci-provenance.example.net/v1/provenance-runs');
    expect(new Headers(init.headers).get('Authorization')).toBe(`Bearer ${env.PROVENANCE_SERVICE_TOKEN}`);
    expect(new Headers(init.headers).get('Origin')).toBe(origin);
  });

  it('fails closed when disabled or misconfigured', async () => {
    const fetchImpl = vi.fn();
    const disabled = await handleProvenanceGateway({
      request: request(),
      path: 'v1/provenance-runs',
      env: { ...env, JINGCI_PROVENANCE_ENABLED: 'NO' },
      fetchImpl,
      requestId: 'request-2',
    });
    expect(disabled.status).toBe(503);

    const insecure = await handleProvenanceGateway({
      request: request(),
      path: 'v1/provenance-runs',
      env: { ...env, PROVENANCE_SERVICE_URL: 'http://127.0.0.1:8788' },
      fetchImpl,
      requestId: 'request-3',
    });
    expect(insecure.status).toBe(503);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('rejects cross-site, unsupported, and oversized requests before upstream fetch', async () => {
    const fetchImpl = vi.fn();
    const crossSiteRequest = request();
    crossSiteRequest.headers.set('Origin', 'https://attacker.example');
    expect((await handleProvenanceGateway({
      request: crossSiteRequest,
      path: 'v1/provenance-runs',
      env,
      fetchImpl,
      requestId: 'request-4',
    })).status).toBe(403);

    expect((await handleProvenanceGateway({
      request: new Request(`${origin}/api/provenance/v1/provenance-runs`, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain', Origin: origin },
        body: '{}',
      }),
      path: 'v1/provenance-runs',
      env,
      fetchImpl,
      requestId: 'request-5',
    })).status).toBe(415);

    expect((await handleProvenanceGateway({
      request: request('x'.repeat(PROVENANCE_GATEWAY_MAX_BODY_BYTES + 1)),
      path: 'v1/provenance-runs',
      env,
      fetchImpl,
      requestId: 'request-6',
    })).status).toBe(413);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('does not relay redirects, non-JSON bodies, oversized responses, or upstream auth failures', async () => {
    for (const upstreamResponse of [
      new Response(null, { status: 302, headers: { Location: 'https://attacker.example' } }),
      new Response('not-json', { status: 200, headers: { 'Content-Type': 'text/plain' } }),
      new Response('x'.repeat(PROVENANCE_GATEWAY_MAX_BODY_BYTES + 1), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
      new Response(JSON.stringify({ error: 'bad token' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }),
    ]) {
      const response = await handleProvenanceGateway({
        request: request(),
        path: 'v1/provenance-runs',
        env,
        fetchImpl: vi.fn().mockResolvedValue(upstreamResponse),
        requestId: 'request-7',
      });
      expect(response.status).toBe(502);
      expect(await response.text()).not.toContain('bad token');
    }
  });

  it('exposes only the health and provenance routes', async () => {
    const fetchImpl = vi.fn();
    const response = await handleProvenanceGateway({
      request: new Request(`${origin}/api/provenance/admin`, { method: 'GET' }),
      path: 'admin',
      env,
      fetchImpl,
      requestId: 'request-8',
    });
    expect(response.status).toBe(404);
    expect(fetchImpl).not.toHaveBeenCalled();

    const healthFetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ status: 'ok' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }));
    const health = await handleProvenanceGateway({
      request: new Request(`${origin}/api/provenance/health`, { method: 'GET' }),
      path: 'health',
      env,
      fetchImpl: healthFetch,
      requestId: 'request-9',
    });
    expect(health.status).toBe(200);
    expect((healthFetch.mock.calls[0] as [URL])[0].toString())
      .toBe('https://jingci-provenance.example.net/health');
  });

  it('aborts a stalled upstream request at the gateway deadline', async () => {
    const fetchImpl = vi.fn((_url: URL, init?: RequestInit) => new Promise((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
    }));
    const response = await handleProvenanceGateway({
      request: request(),
      path: 'v1/provenance-runs',
      env,
      fetchImpl: fetchImpl as typeof fetch,
      requestId: 'request-10',
      timeoutMs: 0,
    });
    expect(response.status).toBe(502);
    expect(await response.json()).toMatchObject({ error: { code: 'upstream_unavailable' } });
  });
});
