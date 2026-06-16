import { describe, expect, it } from 'vitest';
import {
  clearLocalProjectWorkspace,
  createLocalProjectWorkspace,
  deriveProjectTitle,
  loadLocalProjectWorkspace,
  saveLocalProjectWorkspace,
  type LocalProjectWorkspace,
} from '@/lib/project-workspace';
import type { DirectorKit } from '@/lib/director-kit-contract';

function createStorage() {
  const values = new Map<string, string>();

  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
    removeItem: (key: string) => {
      values.delete(key);
    },
  };
}

const kit: DirectorKit = {
  diagnosis: {
    feasibilityScore: 82,
    keyRisks: ['主体一致性'],
    riskLevel: 'medium',
    suggestedAdjustments: ['减少复杂动作'],
    recommendedDirection: '改成更稳定的废土守护短片。',
  },
  versions: [
    {
      versionType: 'safest',
      label: '稳妥版',
      summary: '减少复杂动作。',
      rewrittenIdea: '旧清洁机器人守护红裙人偶。',
      whyThisWorks: '主体单一。',
      reducedRisks: ['多人调度'],
      bestFor: '文生视频',
    },
    {
      versionType: 'stylish',
      label: '风格版',
      summary: '强化红裙人偶。',
      rewrittenIdea: '红裙人偶成为唯一视觉符号。',
      whyThisWorks: '视觉符号清晰。',
      reducedRisks: ['主体漂移'],
      bestFor: '参考图',
    },
    {
      versionType: 'cinematic',
      label: '电影版',
      summary: '三段镜头建立孤独、守护和悬念。',
      rewrittenIdea: '机器人穿过废土小镇，停在红裙人偶前。',
      whyThisWorks: '镜头目的明确。',
      reducedRisks: ['叙事跳跃'],
      bestFor: '短片剪辑',
    },
  ],
  selectedVersion: null,
  storySetting: {
    logline: '一个旧清洁机器人在废土小镇守护红裙人偶。',
    directorIntent: '用低调动作表达孤独和守护。',
    protagonist: '旧清洁机器人',
    worldSetting: '风沙弥漫的废土小镇',
    visualMotif: '红裙人偶',
  },
  shotCards: [
    {
      shotId: 1,
      duration: '5s',
      purpose: '建立世界',
      framing: '全景',
      description: '风沙中的废土小镇，旧清洁机器人缓慢出现。',
      action: '机器人沿街清扫。',
      mood: '孤独',
      motion: '缓慢推近',
      generationMode: 'text-to-video',
      consistencyNeed: 'medium',
      riskLevel: 'low',
      riskTags: ['主体一致性'],
      stabilityChecklist: ['固定机器人轮廓'],
      fixSuggestion: '保持机器人轮廓稳定。',
    },
  ],
  masterPrompt: '废土小镇里，一个旧清洁机器人守护红裙人偶。',
  negativePrompt: '畸形，闪烁，文字水印',
  platformAdvice: [],
  postProductionAdvice: {
    editingRhythm: '慢节奏',
    soundEffects: ['风声'],
    music: '低沉环境音乐',
    subtitles: '少量旁白字幕',
  },
  riskRemediation: {
    topRisks: ['机器人外观漂移'],
    alternativeShots: ['使用背影或剪影镜头'],
    backupStrategies: ['先生成主角参考图'],
  },
};

describe('project workspace persistence', () => {
  it('derives a compact project title from creative input', () => {
    expect(deriveProjectTitle('  废土小镇里，\n一个旧清洁机器人守护红裙人偶  ')).toBe(
      '废土小镇里， 一个旧清洁机器人守护红裙人偶',
    );
    expect(deriveProjectTitle('   ')).toBe('未命名项目');
  });

  it('creates a workspace snapshot while preserving an existing id', () => {
    const first = createLocalProjectWorkspace(
      {
        creativeInput: '废土小镇里，一个旧清洁机器人守护红裙人偶',
        targetDuration: '60s',
        targetType: 'cyberpunk',
        v2State: 'result',
        directorKit: kit,
        selectedVersionIndex: 2,
        selectedShotId: 1,
        shotExecutionStatus: { 1: 'usable' },
        shotResultNotes: { 1: 'Seedance 链接：shot-1' },
      },
      null,
      '2026-06-16T00:00:00.000Z',
    );
    const second = createLocalProjectWorkspace(first, first, '2026-06-16T01:00:00.000Z');

    expect(second.id).toBe(first.id);
    expect(second.createdAt).toBe('2026-06-16T00:00:00.000Z');
    expect(second.updatedAt).toBe('2026-06-16T01:00:00.000Z');
    expect(second.shotExecutionStatus[1]).toBe('usable');
  });

  it('saves, loads, and clears a valid local workspace', () => {
    const storage = createStorage();
    const workspace = createLocalProjectWorkspace(
      {
        creativeInput: '废土小镇里，一个旧清洁机器人守护红裙人偶',
        targetDuration: '30s',
        targetType: 'wasteland',
        v2State: 'diagnosis',
        directorKit: kit,
        selectedVersionIndex: null,
        selectedShotId: 1,
        shotExecutionStatus: { 1: 'generated' },
        shotResultNotes: { 1: '初版可用' },
      },
      null,
      '2026-06-16T00:00:00.000Z',
    );

    expect(saveLocalProjectWorkspace(workspace, storage)).toBe(true);
    expect(loadLocalProjectWorkspace(storage)).toMatchObject<Partial<LocalProjectWorkspace>>({
      creativeInput: '废土小镇里，一个旧清洁机器人守护红裙人偶',
      targetDuration: '30s',
      v2State: 'diagnosis',
      selectedShotId: 1,
    });
    expect(clearLocalProjectWorkspace(storage)).toBe(true);
    expect(loadLocalProjectWorkspace(storage)).toBeNull();
  });

  it('ignores invalid or corrupted workspace payloads', () => {
    const storage = createStorage();
    storage.setItem('jingci-current-project', '{broken');
    expect(loadLocalProjectWorkspace(storage)).toBeNull();

    storage.setItem(
      'jingci-current-project',
      JSON.stringify({
        schemaVersion: 99,
        creativeInput: 'invalid',
      }),
    );
    expect(loadLocalProjectWorkspace(storage)).toBeNull();
  });
});
