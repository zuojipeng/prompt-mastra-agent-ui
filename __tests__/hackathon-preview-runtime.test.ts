import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { evaluatePreviewRuntime } from '../scripts/check-hackathon-preview-runtime.mjs';

const root = path.resolve('spikes/genblaze-provenance');
const valid = {
  plan: JSON.parse(readFileSync('docs/campaigns/backblaze-genmedia-2026/preview-runtime-plan.json', 'utf8')),
  railway: JSON.parse(readFileSync(path.join(root, 'railway.json'), 'utf8')),
  dockerfile: readFileSync(path.join(root, 'Dockerfile'), 'utf8'),
  runtimeSource: readFileSync(path.join(root, 'jingci_spike/runtime_service.py'), 'utf8'),
  dependencyLock: readFileSync(path.join(root, 'requirements.lock'), 'utf8'),
};

describe('hackathon preview runtime plan', () => {
  it('accepts the tracked undeployed runtime package', () => {
    expect(evaluatePreviewRuntime(valid)).toEqual([]);
  });

  it('rejects missing controls and widened deployment authority', () => {
    const plan = structuredClone(valid.plan);
    plan.required_variables = plan.required_variables.filter(
      (item: { name: string }) => item.name !== 'JINGCI_PREVIEW_BEARER_TOKEN',
    );
    plan.authorization.deploy = true;
    const errors = evaluatePreviewRuntime({ ...valid, plan });
    expect(errors).toContain('missing required variable declaration: JINGCI_PREVIEW_BEARER_TOKEN');
    expect(errors).toContain('authorization deploy must remain false');
  });

  it('rejects root execution, secret declarations, and floating dependencies', () => {
    const errors = evaluatePreviewRuntime({
      ...valid,
      dockerfile: valid.dockerfile.replace('USER jingci', 'USER root').concat('\nARG API_SECRET\n'),
      dependencyLock: valid.dependencyLock.replace('genblaze==0.4.1', 'genblaze>=0.4.1'),
    });
    expect(errors).toContain('container must run as a non-root user');
    expect(errors).toContain('Dockerfile must not declare secret inputs');
    expect(errors).toContain('dependency lock must pin Genblaze');
    expect(errors).toContain('dependency is not exactly pinned: genblaze>=0.4.1');
  });
});
