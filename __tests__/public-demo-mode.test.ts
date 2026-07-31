import { afterEach, describe, expect, it, vi } from 'vitest';

import { createDirectorKit, fetchFeedbackAnalytics, fetchPromptHistory, uploadFeedback } from '../lib/api-client';
import { fetchProjectSummaries, syncProjectWorkspaceStatus } from '../lib/project-api-client';
import { getProvenanceTransportMode } from '../lib/provenance-http-client';
import { isPublicDemoMode } from '../lib/public-demo-mode';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('public demo mode', () => {
  it('forces fixture provenance even when a preview URL is configured', () => {
    vi.stubEnv('NEXT_PUBLIC_DEMO_MODE', 'fixture');
    vi.stubEnv('NEXT_PUBLIC_PROVENANCE_API_URL', '/api/provenance');

    expect(isPublicDemoMode()).toBe(true);
    expect(getProvenanceTransportMode()).toBe('fixture');
  });

  it('builds a DirectorKit without a network request', async () => {
    vi.stubEnv('NEXT_PUBLIC_DEMO_MODE', 'fixture');
    const fetchMock = vi.fn(() => Promise.reject(new Error('network must remain unreachable')));
    vi.stubGlobal('fetch', fetchMock);

    const kit = await createDirectorKit({
      message: '废土小镇里，一个旧清洁机器人守护红裙人偶',
      targetDuration: '30s',
      targetType: 'wasteland',
    });

    expect(kit.diagnosis.feasibilityScore).toBe(82);
    expect(kit.shotCards).toHaveLength(2);
    expect(kit.shotCards.map((shot) => shot.duration)).toEqual(['15s', '15s']);
    expect(kit.masterPrompt).toContain('旧清洁机器人');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('keeps the deterministic shot plan consistent with each target duration', async () => {
    vi.stubEnv('NEXT_PUBLIC_DEMO_MODE', 'fixture');
    for (const targetDuration of ['30s', '60s', '90s'] as const) {
      const kit = await createDirectorKit({ message: 'one idea', targetDuration, targetType: 'wasteland' });
      const total = kit.shotCards.reduce((sum, shot) => sum + Number.parseInt(shot.duration, 10), 0);
      expect(total).toBe(Number.parseInt(targetDuration, 10));
    }
  });

  it('keeps feedback, history, analytics, and project sync offline', async () => {
    vi.stubEnv('NEXT_PUBLIC_DEMO_MODE', 'fixture');
    const fetchMock = vi.fn(() => Promise.reject(new Error('network must remain unreachable')));
    vi.stubGlobal('fetch', fetchMock);

    await uploadFeedback({ input: 'idea', prompt: 'prompt', shotIndex: 1, rating: 'like' });
    expect(await fetchPromptHistory()).toEqual([]);
    expect(await fetchFeedbackAnalytics()).toBeNull();
    expect(await fetchProjectSummaries()).toEqual([]);
    expect(await syncProjectWorkspaceStatus({} as never)).toBe('unavailable');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
