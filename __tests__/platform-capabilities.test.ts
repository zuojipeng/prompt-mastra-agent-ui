import { describe, expect, it } from 'vitest';
import {
  buildPlatformCalibrationChecklist,
  explainPlatformFirstPassShot,
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

  it('explains why a shot is selected for first-pass handoff', () => {
    const profile = resolvePlatformCapability('Seedance');

    expect(
      explainPlatformFirstPassShot(
        {
          ...shot({ shotId: 1, generationMode: 'text-to-video', riskLevel: 'low' }),
          consistencyNeed: 'medium',
          fixSuggestion: '保持主体轮廓稳定。',
        },
        profile,
      ),
    ).toBe('匹配平台偏好模式；风险在首轮容忍范围内；一致性压力适中；有明确翻车补救建议');
  });

  it('builds calibration questions for platform feedback', () => {
    const profile = resolvePlatformCapability('Seedance');
    const checklist = buildPlatformCalibrationChecklist(
      {
        ...shot({ shotId: 1, generationMode: 'text-to-video', riskLevel: 'low' }),
        fixSuggestion: '保持主体轮廓稳定。',
      },
      profile,
    );

    expect(checklist).toContain('镜头 1 是否验证了 Seedance 的 text-to-video 能力画像？');
    expect(checklist.join('\n')).toContain('主体漂移 / 动作失真 / 平台不适配');
    expect(checklist.join('\n')).toContain('记录可复用设置、素材链接');
  });
});
