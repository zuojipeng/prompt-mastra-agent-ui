import { describe, expect, it } from 'vitest';

import deployment from '../docs/campaigns/backblaze-genmedia-2026/deployment-readiness.json';
import { evaluateDeployment, isDeploymentStrictReady } from '../scripts/check-hackathon-deployment.mjs';

describe('hackathon deployment readiness', () => {
  it('accepts the threat-model design while preserving deployment blockers', () => {
    const result = evaluateDeployment(deployment, () => true);

    expect(result.errors).toEqual([]);
    expect(result.blockers).toContain('edge_and_identity_integration');
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
    const withoutBlockers = Object.fromEntries(Object.entries(deployment).filter(([key]) => key !== 'blockers'));
    const result = evaluateDeployment(withoutBlockers, () => true);

    expect(result.errors).toContain('blockers must be an array');
  });

  it('does not treat a blocker-free design label as strict readiness', () => {
    const design = { ...deployment, blockers: [] };
    const result = evaluateDeployment(design, () => true);

    expect(result.errors).toEqual([]);
    expect(isDeploymentStrictReady(design, result)).toBe(false);
  });
});
