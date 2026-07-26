import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  buildCampaignStatusSummary,
  evaluateCampaignStatusSummary,
} from '../scripts/check-hackathon-campaign-status.mjs';

const summary = readFileSync(path.resolve(
  'docs/campaigns/backblaze-genmedia-2026/docs/status-summary.md',
), 'utf8');

describe('hackathon campaign status summary', () => {
  it('keeps one generated, public-safe view of the current blocked stage', () => {
    expect(evaluateCampaignStatusSummary(summary).errors).toEqual([]);
    expect(summary).toContain('Current stage: **Protected preview verification**');
    expect(summary).toContain('Preview runtime: **deployed-blocked**');
    expect(summary).toContain('Current authenticated cloud B2 smoke reached HTTP: **no**');
    expect(summary).toContain('Claims approval grants deployment authority: **no**');
    expect(summary).not.toMatch(/https?:\/\//);
    expect(summary).not.toMatch(/[a-f0-9]{40,}/);
  });

  it('detects manual status drift', () => {
    expect(evaluateCampaignStatusSummary(`${buildCampaignStatusSummary()}\nmanual claim`).errors)
      .toContain('status_summary_drift');
  });

  it('rejects a summary regenerated from a tampered source gate', () => {
    const sources = {
      handoff: { status: 'complete', current_stage: null, stages: [] },
      deployment: { status: 'deployed', blockers: [] },
      preview: { status: 'verified', observations: {} },
      claims: {
        status: 'approved',
        allowed_uses: {},
        authorizations: { deployment: true },
      },
      submission: { blockers: [] },
    };

    expect(evaluateCampaignStatusSummary(buildCampaignStatusSummary(sources), sources).errors)
      .toContain('source_gate_invalid');
  });

  it('refuses to hide a newly introduced deployment blocker', () => {
    const sources = {
      handoff: { status: 'blocked', current_stage: 'preview_deployment', stages: [] },
      deployment: { status: 'deployed-blocked', blockers: ['unknown_new_gate'] },
      preview: {
        status: 'deployed_smoke_unreached_blocked',
        observations: {
          production_access_unauthenticated: 302,
          preview_access_unauthenticated: 302,
          authenticated_b2_run_status: 'not_reached_dns_resolution_failed',
        },
      },
      claims: {
        status: 'approved',
        allowed_uses: {},
        authorizations: {},
      },
      submission: { blockers: [] },
    };

    expect(evaluateCampaignStatusSummary(buildCampaignStatusSummary(sources), sources).errors)
      .toContain('unclassified_deployment_blocker');
  });
});
