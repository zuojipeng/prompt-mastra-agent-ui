import { describe, expect, it } from 'vitest';

import readiness from '../docs/campaigns/backblaze-genmedia-2026/submission-readiness.json';
import { evaluateSubmission, isSubmissionStrictReady } from '../scripts/check-hackathon-submission.mjs';

describe('hackathon submission readiness', () => {
  it('accepts the honest draft while retaining every open gate', () => {
    const result = evaluateSubmission(readiness, () => true);

    expect(result.errors).toEqual([]);
    expect(result.blockers).toContain('live_claims_promotion_approval');
    expect(result.blockers).toContain('human_submission_approval');
  });

  it('rejects a ready claim without live and public evidence', () => {
    const result = evaluateSubmission({ ...readiness, status: 'ready', blockers: [] }, () => true);

    expect(result.errors).toContain('ready submission requires working_app_url');
    expect(result.errors).toContain('ready submission requires public_demo_video_url');
    expect(result.errors).toContain('ready submission requires claim live_ai_media_provider');
    expect(result.errors).toContain('ready submission requires claim live_b2_upload_readback');
    expect(result.errors).toContain('ready submission requires claim public_campaign_deployment');
  });

  it('does not treat a blocker-free draft label as strict readiness', () => {
    const draft = { ...readiness, blockers: [] };
    const result = evaluateSubmission(draft, () => true);

    expect(result.errors).toEqual([]);
    expect(isSubmissionStrictReady(draft, result)).toBe(false);
  });
});
