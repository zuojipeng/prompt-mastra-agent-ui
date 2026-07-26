import { describe, expect, it } from 'vitest';

import deployment from '../docs/campaigns/backblaze-genmedia-2026/deployment-readiness.json';
import { evaluateDeployment, isDeploymentStrictReady } from '../scripts/check-hackathon-deployment.mjs';

describe('hackathon deployment readiness', () => {
  it('accepts a deployed but blocked preview without promoting release readiness', () => {
    const result = evaluateDeployment(deployment, () => true);

    expect(result.errors).toEqual([]);
    expect(deployment.status).toBe('deployed-blocked');
    expect(result.blockers).toContain('new_explicit_approval_for_one_authenticated_cloud_b2_smoke');
    expect(result.blockers).toContain('cloudflare_rate_limit_configuration');
    expect(result.blockers).toContain('human_release_approval');
    expect(isDeploymentStrictReady(deployment, result)).toBe(false);
  });

  it('rejects preview readiness without controls, URLs, and pinned commit', () => {
    const result = evaluateDeployment({ ...deployment, status: 'preview-ready', blockers: [] }, () => true);

    expect(result.errors).toContain('preview-ready requires implemented control exact_origin_cors');
    expect(result.errors).toContain('preview-ready requires implemented control reviewer_authentication');
  });

  it('rejects a deployed-blocked label without deployment evidence or blockers', () => {
    const result = evaluateDeployment({
      ...deployment,
      blockers: [],
      frontend: { ...deployment.frontend, campaign_url: null, commit: null },
      provenance_service: { ...deployment.provenance_service, public_url: null },
    }, () => true);

    expect(result.errors).toContain('deployed-blocked deployment requires at least one blocker');
    expect(result.errors).toContain('deployed-blocked requires HTTPS frontend campaign_url');
    expect(result.errors).toContain('deployed-blocked requires HTTPS provenance service URL');
    expect(result.errors).toContain('deployed-blocked requires a pinned 40-character commit');
  });

  it('rejects a missing blockers ledger instead of treating it as clear', () => {
    const withoutBlockers = Object.fromEntries(Object.entries(deployment).filter(([key]) => key !== 'blockers'));
    const result = evaluateDeployment(withoutBlockers, () => true);

    expect(result.errors).toContain('blockers must be an array');
  });

  it('does not treat a blocker-free design label as strict readiness', () => {
    const design = { ...deployment, status: 'design', blockers: [] };
    const result = evaluateDeployment(design, () => true);

    expect(result.errors).toEqual([]);
    expect(isDeploymentStrictReady(design, result)).toBe(false);
  });
});
