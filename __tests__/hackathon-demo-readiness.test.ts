import { describe, expect, it } from 'vitest';

import rehearsal from '../docs/campaigns/backblaze-genmedia-2026/demo-rehearsal.json';
import { evaluateDemo, isDemoStrictReady } from '../scripts/check-hackathon-demo.mjs';

describe('hackathon demo readiness', () => {
  it('accepts the verified public final demo with no publication blockers', () => {
    const result = evaluateDemo(rehearsal, () => true);

    expect(result.errors).toEqual([]);
    expect(result.blockers).toEqual([]);
    expect(rehearsal.status).toBe('final-ready');
    expect(rehearsal.visual_reel.public_url).toBe('https://youtu.be/I4dsEfnbUX4');
    expect(isDemoStrictReady(rehearsal, result)).toBe(true);
  });

  it('rejects final or public claims before publication approval', () => {
    const premature = {
      ...rehearsal,
      status: 'publication-review',
      claims: { ...rehearsal.claims, final_demo: true },
      visual_reel: { ...rehearsal.visual_reel, public_url: 'https://video.example/demo' },
      blockers: ['human_video_publication_approval', 'public_demo_video'],
    };
    const result = evaluateDemo(premature, () => true);

    expect(result.errors).toContain('publication review cannot claim final_demo');
    expect(result.errors).toContain('publication review cannot include a public video URL');
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
