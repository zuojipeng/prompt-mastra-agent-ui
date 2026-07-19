import { describe, expect, it } from 'vitest';

import {
  handleProvenanceGateway,
  PROVENANCE_GATEWAY_MAX_BODY_BYTES,
  type B2ObjectStore,
  type ProvenanceGatewayEnv,
} from '@/lib/provenance-gateway';

const origin = 'https://preview.example.com';
const source = new TextEncoder().encode('reviewed runway video');
const sourceSha256 = '08e4f63ffcf3cd29dc4d2c388e60142ece84274aa1a0bcf26c65e90b49d92356';
const env: ProvenanceGatewayEnv = {
  JINGCI_PROVENANCE_ENABLED: 'YES',
  B2_BUCKET: 'jingci-genmedia-2026-zuojipeng',
  B2_REGION: 'us-east-005',
  B2_KEY_ID: 'test-key-id',
  B2_APP_KEY: 'test-application-key',
  JINGCI_PREVIEW_SOURCE_KEY: 'jingci-preview/source/runway-gen45-ca8ea95388d2.mp4',
  JINGCI_PREVIEW_SOURCE_SHA256: sourceSha256,
  JINGCI_PREVIEW_SOURCE_PROVIDER: 'runway',
  JINGCI_PREVIEW_SOURCE_MODEL: 'gen4.5',
  JINGCI_PREVIEW_SOURCE_MAX_BYTES: String(source.byteLength),
};

function runRequest(overrides: Record<string, unknown> = {}) {
  return {
    schema_version: 'jingci.provenance-run-request.v1',
    project_id: 'project-1',
    shot_id: 1,
    parent_job_id: null,
    attempt: 1,
    prompt: 'wasteland robot shot',
    negative_prompt: '',
    provider: 'runway',
    model: 'gen4.5',
    modality: 'video',
    ...overrides,
  };
}

function request(body = JSON.stringify(runRequest())) {
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

class MemoryB2Store implements B2ObjectStore {
  readonly objects = new Map<string, Uint8Array>();
  readonly calls: Array<{ key: string; method: string }> = [];
  failReadback = false;
  failPutAfterWrite = false;

  constructor() {
    this.objects.set(env.JINGCI_PREVIEW_SOURCE_KEY!, source);
  }

  async fetch(key: string, init: RequestInit) {
    const method = init.method || 'GET';
    this.calls.push({ key, method });
    if (method === 'HEAD') return new Response(null, { status: this.objects.has(key) ? 200 : 404 });
    if (method === 'GET') {
      const value = this.objects.get(key);
      if (!value) return new Response(null, { status: 404 });
      const body = this.failReadback && key.endsWith('/manifest.json')
        ? new TextEncoder().encode('tampered')
        : value;
      const responseBody = new Uint8Array(body.byteLength);
      responseBody.set(body);
      return new Response(responseBody.buffer, {
        status: 200,
        headers: { 'Content-Length': String(body.byteLength) },
      });
    }
    if (method === 'PUT') {
      this.objects.set(key, new Uint8Array(init.body as ArrayBuffer));
      if (this.failPutAfterWrite) return new Response(null, { status: 500 });
      return new Response(null, { status: 200 });
    }
    if (method === 'DELETE') {
      this.objects.delete(key);
      return new Response(null, { status: 204 });
    }
    return new Response(null, { status: 405 });
  }
}

const fixedOptions = {
  now: () => new Date('2026-07-19T12:00:00.000Z'),
  randomUUID: () => '11111111-2222-4333-8444-555555555555',
};

describe('Cloudflare B2 provenance gateway', () => {
  it('verifies the retained source and persists one read-back manifest', async () => {
    const store = new MemoryB2Store();
    const response = await handleProvenanceGateway({
      request: request(),
      path: 'v1/provenance-runs',
      env,
      objectStore: store,
      requestId: 'request-1',
      ...fixedOptions,
    });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({
      schema_version: 'jingci.provenance-run.v1',
      provider: 'runway',
      model: 'gen4.5',
      status: 'succeeded',
      result: {
        asset: { sha256: sourceSha256, size_bytes: source.byteLength },
        manifest: { verified: true },
      },
    });
    expect(body.result.asset.url).toMatch(/^b2:\/\/jingci-genmedia-2026-zuojipeng\/jingci-preview\/source\//);
    expect(body.result.manifest.uri).toContain('/jingci-preview/runs/');
    expect(store.calls.map(({ method }) => method)).toEqual(['GET', 'HEAD', 'PUT', 'GET']);
    const manifestBytes = [...store.objects.entries()].find(([key]) => key.endsWith('/manifest.json'))?.[1];
    const manifest = JSON.parse(new TextDecoder().decode(manifestBytes));
    expect(manifest).toMatchObject({
      schema_version: 'jingci.retained-source-manifest.v1',
      prompt_sha256: expect.stringMatching(/^[a-f0-9]{64}$/),
      project_id_sha256: expect.stringMatching(/^[a-f0-9]{64}$/),
      parent_job_id_sha256: null,
    });
    expect(JSON.stringify(manifest)).not.toContain('wasteland robot shot');
    expect(JSON.stringify(manifest)).not.toContain('project-1');
  });

  it('serves a no-network health response only when fully configured', async () => {
    const store = new MemoryB2Store();
    const health = await handleProvenanceGateway({
      request: new Request(`${origin}/api/provenance/health`),
      path: 'health',
      env,
      objectStore: store,
      requestId: 'request-2',
    });
    expect(health.status).toBe(200);
    expect(await health.json()).toEqual({ status: 'ok', mode: 'cloudflare-b2-preview' });
    expect(store.calls).toEqual([]);
    expect((await handleProvenanceGateway({
      request: new Request(`${origin}/api/provenance/health`),
      path: 'health',
      env: { ...env, B2_APP_KEY: undefined },
      requestId: 'request-3',
    })).status).toBe(503);
  });

  it('rejects invalid lineage and cleans a manifest that fails read-back', async () => {
    const lineageStore = new MemoryB2Store();
    const lineage = await handleProvenanceGateway({
      request: request(JSON.stringify(runRequest({ model: 'other-model' }))),
      path: 'v1/provenance-runs',
      env,
      objectStore: lineageStore,
      requestId: 'request-4',
      ...fixedOptions,
    });
    expect(lineage.status).toBe(400);
    expect(lineageStore.calls).toEqual([]);

    const tamperedStore = new MemoryB2Store();
    tamperedStore.failReadback = true;
    const tampered = await handleProvenanceGateway({
      request: request(),
      path: 'v1/provenance-runs',
      env,
      objectStore: tamperedStore,
      requestId: 'request-5',
      ...fixedOptions,
    });
    expect(tampered.status).toBe(502);
    expect(tamperedStore.calls.map(({ method }) => method)).toEqual(['GET', 'HEAD', 'PUT', 'GET', 'DELETE']);
    expect([...tamperedStore.objects.keys()].filter((key) => key.endsWith('/manifest.json'))).toEqual([]);
  });

  it('compensates an ambiguous manifest write response without touching the source', async () => {
    const store = new MemoryB2Store();
    store.failPutAfterWrite = true;
    const response = await handleProvenanceGateway({
      request: request(),
      path: 'v1/provenance-runs',
      env,
      objectStore: store,
      requestId: 'request-ambiguous-put',
      ...fixedOptions,
    });
    expect(response.status).toBe(502);
    expect(store.calls.map(({ method }) => method)).toEqual(['GET', 'HEAD', 'PUT', 'DELETE']);
    expect(store.objects.get(env.JINGCI_PREVIEW_SOURCE_KEY!)).toEqual(source);
    expect([...store.objects.keys()].filter((key) => key.endsWith('/manifest.json'))).toEqual([]);
  });

  it('rejects cross-site, unsupported, malformed, and oversized requests before B2', async () => {
    const store = new MemoryB2Store();
    const crossSite = request();
    crossSite.headers.set('Origin', 'https://attacker.example');
    expect((await handleProvenanceGateway({ request: crossSite, path: 'v1/provenance-runs', env, objectStore: store })).status).toBe(403);
    expect((await handleProvenanceGateway({
      request: new Request(`${origin}/api/provenance/v1/provenance-runs`, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain', Origin: origin },
        body: '{}',
      }),
      path: 'v1/provenance-runs',
      env,
      objectStore: store,
    })).status).toBe(415);
    expect((await handleProvenanceGateway({ request: request('not-json'), path: 'v1/provenance-runs', env, objectStore: store })).status).toBe(400);
    expect((await handleProvenanceGateway({
      request: request('x'.repeat(PROVENANCE_GATEWAY_MAX_BODY_BYTES + 1)),
      path: 'v1/provenance-runs',
      env,
      objectStore: store,
    })).status).toBe(413);
    expect(store.calls).toEqual([]);
  });

  it('exposes only the health and provenance routes', async () => {
    const store = new MemoryB2Store();
    const response = await handleProvenanceGateway({
      request: new Request(`${origin}/api/provenance/admin`),
      path: 'admin',
      env,
      objectStore: store,
    });
    expect(response.status).toBe(404);
    expect(store.calls).toEqual([]);
  });
});
