import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { evaluatePreviewRuntime } from '../scripts/check-hackathon-preview-runtime.mjs';

const valid = {
  plan: JSON.parse(readFileSync('docs/campaigns/backblaze-genmedia-2026/preview-runtime-plan.json', 'utf8')),
  functionSource: readFileSync('functions/api/provenance/[[path]].ts', 'utf8'),
  middlewareSource: readFileSync('functions/api/provenance/_middleware.ts', 'utf8'),
  packageJson: readFileSync('package.json', 'utf8'),
  packageLock: readFileSync('package-lock.json', 'utf8'),
};

describe('hackathon Cloudflare preview runtime plan', () => {
  it('accepts the tracked undeployed runtime package', () => {
    expect(evaluatePreviewRuntime(valid)).toEqual([]);
  });

  it('rejects missing bindings and widened deployment authority', () => {
    const plan = structuredClone(valid.plan);
    plan.required_bindings = plan.required_bindings.filter(
      (item: { name: string }) => item.name !== 'B2_APP_KEY',
    );
    plan.authorization.deploy = true;
    const errors = evaluatePreviewRuntime({ ...valid, plan });
    expect(errors).toContain('missing required binding declaration: B2_APP_KEY');
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
    for (const field of ['key', 'sha256', 'size_bytes', 'provider', 'model', 'visibility', 'promotion_commit', 'deployment_configured']) {
      expect(errors).toContain(`reviewed source ${field} must match retained-source evidence`);
    }
  });

  it('rejects added source fields and unsafe write-contract widening', () => {
    const plan = structuredClone(valid.plan);
    plan.reviewed_source.signed_url = 'https://example.invalid/private.mp4?token=secret';
    plan.write_contract.source_objects_per_request = 1;
    plan.write_contract.raw_prompt_persisted = true;
    plan.write_contract.failed_manifest_deleted = false;
    const errors = evaluatePreviewRuntime({ ...valid, plan });
    expect(errors).toContain('reviewed source binding shape is invalid');
    expect(errors).toContain('preview must not duplicate the retained source');
    expect(errors).toContain('raw prompts must not be persisted');
    expect(errors).toContain('failed manifests must be deleted');
  });

  it('requires Access middleware and an exact aws4fetch lock', () => {
    const errors = evaluatePreviewRuntime({
      ...valid,
      middlewareSource: valid.middlewareSource.replace('@cloudflare/pages-plugin-cloudflare-access', 'unsafe-auth'),
      packageLock: valid.packageLock.replace(
        /("node_modules\/aws4fetch":\s*\{\s*"version":\s*)"1\.0\.20"/,
        '$1"9.9.9"',
      ),
    });
    expect(errors).toContain('Cloudflare Access plugin is required');
    expect(errors).toContain('aws4fetch lock entry must pin 1.0.20');
  });
});
