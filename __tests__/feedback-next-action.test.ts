import { describe, expect, it } from 'vitest';
import { deriveFeedbackNextAction } from '@/lib/feedback-next-action';
import type { FeedbackAnalytics } from '@/lib/api-client';

function createAnalytics(overrides: Partial<FeedbackAnalytics> = {}): FeedbackAnalytics {
  return {
    windowDays: 30,
    total: 12,
    likes: 7,
    dislikes: 5,
    dislikeRate: 42,
    v2Share: 100,
    minSampleSize: 5,
    qualityFlags: [],
    dimensions: {
      eventTypes: [],
      targetTypes: [],
      platforms: [],
      generationModes: [],
      riskLevels: [],
      riskTags: [],
      failureReasons: [],
    },
    highValueSamples: [],
    ...overrides,
  };
}

describe('deriveFeedbackNextAction', () => {
  it('returns null when sample size is too small', () => {
    expect(deriveFeedbackNextAction(createAnalytics({ total: 3, minSampleSize: 5 }))).toBeNull();
  });

  it('prioritizes high-frequency failure reasons', () => {
    const action = deriveFeedbackNextAction(
      createAnalytics({
        dimensions: {
          eventTypes: [],
          targetTypes: [],
          platforms: [{ key: 'Kling', total: 4, likes: 1, dislikes: 3, dislikeRate: 75 }],
          generationModes: [],
          riskLevels: [],
          riskTags: [],
          failureReasons: [
            { key: '主体漂移', total: 5, likes: 1, dislikes: 4, dislikeRate: 80 },
            { key: '平台不适配', total: 4, likes: 1, dislikes: 3, dislikeRate: 75 },
          ],
        },
      }),
    );

    expect(action).toMatchObject({
      title: '下一轮先修正高频失败点',
      focus: '主体一致性',
    });
    expect(action?.promptHint).toContain('主体一致性');
  });

  it('falls back to platform adaptation when no failure reason exists', () => {
    const action = deriveFeedbackNextAction(
      createAnalytics({
        dimensions: {
          eventTypes: [],
          targetTypes: [],
          platforms: [{ key: 'Runway', total: 5, likes: 1, dislikes: 4, dislikeRate: 80 }],
          generationModes: [],
          riskLevels: [],
          riskTags: [],
          failureReasons: [],
        },
      }),
    );

    expect(action).toMatchObject({
      title: '下一轮先做平台适配',
      focus: 'Runway',
    });
  });

  it('returns a positive reuse action when there are no dislikes', () => {
    const action = deriveFeedbackNextAction(createAnalytics({ likes: 12, dislikes: 0, dislikeRate: 0 }));

    expect(action).toMatchObject({
      title: '下一轮可以扩大复用',
      focus: '高满意方向',
    });
  });
});
