import { describe, expect, it } from 'vitest';

import deployment from '../docs/campaigns/backblaze-genmedia-2026/deployment-readiness.json';
import { evaluateDeployment } from '../scripts/check-hackathon-deployment.mjs';

describe('hackathon deployment readiness', () => {
  it('accepts the threat-model design while preserving deployment blockers', () => {
    const result = evaluateDeployment(deployment, () => true);

    expect(result.errors).toEqual([]);
    expect(result.blockers).toContain('public_service_hardening');
    expect(result.blockers).toContain('human_release_approval');
  });

  it('rejects preview readiness without controls, URLs, and pinned commit', () => {
    const result = evaluateDeployment({ ...deployment, status: 'preview-ready', blockers: [] }, () => true);

    expect(result.errors).toContain('preview-ready requires implemented control exact_origin_cors');
    expect(result.errors).toContain('preview-ready requires implemented control reviewer_authentication');
    expect(result.errors).toContain('preview-ready requires HTTPS frontend campaign_url');
    expect(result.errors).toContain('preview-ready requires HTTPS provenance service URL');
    expect(result.errors).toContain('preview-ready requires a pinned 40-character commit');
  });

  it('rejects a missing blockers ledger instead of treating it as clear', () => {
    const { blockers: _blockers, ...withoutBlockers } = deployment;
    const result = evaluateDeployment(withoutBlockers, () => true);

    expect(result.errors).toContain('blockers must be an array');
  });
});
