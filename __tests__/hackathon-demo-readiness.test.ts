import { describe, expect, it } from 'vitest';

import rehearsal from '../docs/campaigns/backblaze-genmedia-2026/demo-rehearsal.json';
import { evaluateDemo, isDemoStrictReady } from '../scripts/check-hackathon-demo.mjs';

describe('hackathon demo readiness', () => {
  it('accepts the truthful local rehearsal while preserving blockers', () => {
    const result = evaluateDemo(rehearsal, () => true);

    expect(result.errors).toEqual([]);
    expect(result.blockers).toContain('human_recording_approval');
    expect(result.blockers).toContain('public_demo_video');
    expect(isDemoStrictReady(rehearsal, result)).toBe(false);
  });

  it('rejects live claims and a public URL on local evidence', () => {
    const dishonest = {
      ...rehearsal,
      claims: { ...rehearsal.claims, live_b2_storage: true },
      visual_reel: { ...rehearsal.visual_reel, public_url: 'https://video.example/demo' },
    };
    const result = evaluateDemo(dishonest, () => true);

    expect(result.errors).toContain('local rehearsal cannot claim live_b2_storage');
    expect(result.errors).toContain('local rehearsal cannot include a public video URL');
  });

  it('rejects a gap in the timed narration', () => {
    const segments = rehearsal.segments.map((segment, index) => (
      index === 1 ? { ...segment, start: segment.start + 1 } : segment
    ));
    const result = evaluateDemo({ ...rehearsal, segments }, () => true);

    expect(result.errors).toContain('segment creative_diagnosis must be contiguous and increasing');
  });

  it('allows accurate captions instead of forcing an audio track for final readiness', () => {
    const final = {
      ...rehearsal,
      status: 'final-ready',
      claims: Object.fromEntries(Object.keys(rehearsal.claims).map((claim) => [claim, true])),
      visual_reel: {
        ...rehearsal.visual_reel,
        public_url: 'https://video.example/jingci-final',
        captions: true,
      },
      segments: rehearsal.segments.map((segment) => (
        segment.name === 'local_provenance_proof' ? { ...segment, evidence_mode: 'live' } : segment
      )),
      blockers: [],
    };
    const result = evaluateDemo(final, () => true);

    expect(result.errors).toEqual([]);
    expect(isDemoStrictReady(final, result)).toBe(true);
  });
});
