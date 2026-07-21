'use client';

import { useState } from 'react';

type SmokeResult = {
  status: number;
  body: unknown;
};

const runRequest = {
  schema_version: 'jingci.provenance-run-request.v1',
  project_id: 'jingci-genmedia-preview-smoke',
  shot_id: 1,
  parent_job_id: null,
  attempt: 1,
  prompt: 'Rainy neon street, a detective inspects an antique pocket watch.',
  negative_prompt: '',
  provider: 'runway',
  model: 'gen4.5',
  modality: 'video',
};

async function readJson(response: Response) {
  try {
    return await response.json();
  } catch {
    return { error: 'non_json_response' };
  }
}

export default function ProvenanceSmokePage() {
  const [busy, setBusy] = useState(false);
  const [health, setHealth] = useState<SmokeResult | null>(null);
  const [run, setRun] = useState<SmokeResult | null>(null);

  const checkHealth = async () => {
    setBusy(true);
    try {
      const response = await fetch('/api/provenance/health', { cache: 'no-store' });
      setHealth({ status: response.status, body: await readJson(response) });
    } finally {
      setBusy(false);
    }
  };

  const executeRun = async () => {
    setBusy(true);
    try {
      const response = await fetch('/api/provenance/v1/provenance-runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(runRequest),
      });
      setRun({ status: response.status, body: await readJson(response) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-6 py-12 text-gray-950">
      <p className="text-xs font-semibold uppercase text-gray-500">Jingci Preview Operations</p>
      <h1 className="mt-2 text-3xl font-semibold">Provenance smoke</h1>

      <section className="mt-8 border-y border-gray-200 py-6">
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            disabled={busy}
            onClick={checkHealth}
            className="bg-gray-950 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            Check health
          </button>
          <button
            type="button"
            disabled={busy || run !== null}
            onClick={executeRun}
            className="border border-gray-300 px-4 py-2 text-sm font-medium disabled:opacity-50"
          >
            Write one retained manifest
          </button>
        </div>
      </section>

      <section className="mt-8 grid gap-6 md:grid-cols-2">
        <div>
          <h2 className="text-sm font-semibold">Health</h2>
          <pre className="mt-2 min-h-32 overflow-auto bg-gray-100 p-4 text-xs">
            {health ? JSON.stringify(health, null, 2) : 'Not run'}
          </pre>
        </div>
        <div>
          <h2 className="text-sm font-semibold">Retained manifest</h2>
          <pre className="mt-2 min-h-32 overflow-auto bg-gray-100 p-4 text-xs">
            {run ? JSON.stringify(run, null, 2) : 'Not run'}
          </pre>
        </div>
      </section>
    </main>
  );
}
