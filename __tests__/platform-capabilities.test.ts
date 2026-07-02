import { describe, expect, it } from 'vitest';
import {
  rankPlatformFirstPassShots,
  resolvePlatformCapability,
} from '@/lib/platform-capabilities';
import type { ShotCard } from '@/lib/director-kit-contract';

function shot(input: Pick<ShotCard, 'shotId' | 'generationMode' | 'riskLevel'>): ShotCard {
  return {
    shotId: input.shotId,
    duration: '5s',
    purpose: `目的 ${input.shotId}`,
    framing: '中景',
    description: `画面 ${input.shotId}`,
    action: `动作 ${input.shotId}`,
    mood: '平静',
    motion: '固定镜头',
    generationMode: input.generationMode,
    consistencyNeed: 'medium',
    riskLevel: input.riskLevel,
    riskTags: [],
    stabilityChecklist: [],
    fixSuggestion: '',
  };
}

describe('platform capabilities', () => {
  it('resolves known platform profiles and generic fallback', () => {
    expect(resolvePlatformCapability('Seedance Pro')).toMatchObject({
      id: 'seedance',
      preferredModes: ['text-to-video', 'reference-image'],
      maxFirstPassShots: 2,
    });

    expect(resolvePlatformCapability('Unknown Lab')).toMatchObject({
      id: 'generic',
      displayName: 'Unknown Lab',
      preferredModes: ['text-to-video', 'image-to-video', 'reference-image'],
    });
  });

  it('ranks first-pass shots by platform mode preference, risk, and shot order', () => {
    const profile = resolvePlatformCapability('Kling');
    const ranked = rankPlatformFirstPassShots(
      [
        shot({ shotId: 3, generationMode: 'text-to-video', riskLevel: 'low' }),
        shot({ shotId: 2, generationMode: 'image-to-video', riskLevel: 'medium' }),
        shot({ shotId: 1, generationMode: 'image-to-video', riskLevel: 'low' }),
      ],
      profile,
    );

    expect(ranked.map((item) => item.shotId)).toEqual([1, 2]);
  });
});
