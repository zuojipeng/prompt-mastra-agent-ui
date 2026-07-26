import preview from '../docs/campaigns/backblaze-genmedia-2026/preview-deployment-result.json';
import { describe, expect, it } from 'vitest';

import { evaluatePreviewDeploymentResult } from '../scripts/check-hackathon-preview-deployment-result.mjs';

describe('hackathon preview deployment result', () => {
  it('accepts the bounded no-retry DNS failure record', () => {
    expect(evaluatePreviewDeploymentResult(preview).errors).toEqual([]);
  });

  it('rejects status promotion, retry drift, cleanup drift, and blocker removal', () => {
    const changed = JSON.parse(JSON.stringify(preview));
    changed.status = 'verified';
    changed.observations.authenticated_b2_run_retried = true;
    changed.observations.temporary_access_service_token_revoked = false;
    changed.blockers = [];

    const { errors } = evaluatePreviewDeploymentResult(changed);
    expect(errors).toContain('preview_result_status_invalid');
    expect(errors).toContain('authenticated_b2_attempt_boundary_invalid');
    expect(errors).toContain('temporary_access_service_token_revoked_must_be_true');
    expect(errors).toContain('preview_result_blockers_invalid');
  });
});
