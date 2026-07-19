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
  b2Source: readFileSync(path.join(root, 'jingci_spike/b2_preview_executor.py'), 'utf8'),
  b2ConfigSource: readFileSync(path.join(root, 'jingci_spike/b2_config.py'), 'utf8'),
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

  it('rejects retained-source substitution and false deployment state', () => {
    const plan = structuredClone(valid.plan);
    plan.reviewed_source.key = 'jingci-preview/source/another.mp4';
    plan.reviewed_source.sha256 = '0'.repeat(64);
    plan.reviewed_source.size_bytes = 1;
    plan.reviewed_source.provider = 'another-provider';
    plan.reviewed_source.model = 'another-model';
    plan.reviewed_source.visibility = 'public';
    plan.reviewed_source.promotion_commit = '0'.repeat(40);
    plan.reviewed_source.deployment_configured = true;
    const errors = evaluatePreviewRuntime({ ...valid, plan });
    for (const field of [
      'key',
      'sha256',
      'size_bytes',
      'provider',
      'model',
      'visibility',
      'promotion_commit',
      'deployment_configured',
    ]) {
      expect(errors).toContain(`reviewed source ${field} must match retained-source evidence`);
    }
  });

  it('rejects reviewed-source fields that are added outside the contract', () => {
    const plan = structuredClone(valid.plan);
    plan.reviewed_source.signed_url = 'https://example.invalid/private.mp4?token=secret';
    expect(evaluatePreviewRuntime({ ...valid, plan })).toContain(
      'reviewed source binding shape is invalid',
    );
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

  it('rejects removal or widening of the B2 no-retry transport', () => {
    const errors = evaluatePreviewRuntime({
      ...valid,
      b2ConfigSource: valid.b2ConfigSource
        .replaceAll('NoRetryS3StorageBackend', 'RetryingS3StorageBackend')
        .replace('"total_max_attempts": 1', '"total_max_attempts": 3'),
    });
    expect(errors).toContain('B2 live transport must use the reviewed no-retry backend');
    expect(errors).toContain('B2 live transport must allow exactly one total attempt');
  });
});
