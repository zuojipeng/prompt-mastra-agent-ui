import { describe, expect, it } from 'vitest';
import {
  buildExecutionChecklist,
  buildOperatorHandoffNotes,
  buildPlatformFeedPack,
  buildProjectSnapshot,
  buildShotPrompt,
  summarizeOperatorHandoffAcceptance,
  summarizeShotExecution,
  type DirectorKitExportContext,
} from '@/lib/director-kit-export';
import type { DirectorKit } from '@/lib/director-kit-contract';

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
      action: '机器人沿街清扫，远处红裙人偶隐约可见。',
      mood: '孤独',
      motion: '缓慢推近',
      generationMode: 'text-to-video',
      consistencyNeed: 'medium',
      riskLevel: 'low',
      riskTags: ['主体一致性'],
      stabilityChecklist: ['固定机器人轮廓', '避免快速横移'],
      fixSuggestion: '保持机器人轮廓和红裙人偶位置稳定。',
    },
    {
      shotId: 2,
      duration: '7s',
      purpose: '建立关系',
      framing: '中景',
      description: '机器人停在红裙人偶前。',
      action: '机器人抬起机械臂擦去灰尘。',
      mood: '温柔',
      motion: '固定镜头',
      generationMode: 'reference-image',
      consistencyNeed: 'high',
      riskLevel: 'medium',
      riskTags: ['动作稳定'],
      stabilityChecklist: [],
      fixSuggestion: '必要时改为静态特写。',
    },
  ],
  masterPrompt: '废土小镇里，一个旧清洁机器人守护红裙人偶。',
  negativePrompt: '畸形，闪烁，文字水印',
  platformAdvice: [
    {
      platform: 'Seedance',
      note: '适合中文画面描述和短片节奏。',
      recommended: true,
      bestFor: '文生视频主路径。',
      promptTips: ['先写主体和环境，再写镜头运动。'],
      settings: ['建议 5s 单镜测试'],
      avoid: ['避免多人同屏复杂动作。'],
    },
  ],
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

const context: DirectorKitExportContext = {
  creativeInput: '废土小镇里，一个旧清洁机器人守护红裙人偶',
  targetDuration: '60s',
  targetType: 'cyberpunk',
  shotExecutionStatus: { 1: 'generated', 2: 'failed' },
  shotResultNotes: { 1: 'Seedance 链接：shot-1', 2: '动作抖动，需改静态特写' },
  generatedAt: '2026-06-06T00:00:00.000Z',
  projectIterations: [
    {
      id: 'iteration-1',
      title: '主体一致性 改写',
      createdAt: '2026-06-06T00:30:00.000Z',
      source: 'feedback_next_action',
      focus: '主体一致性',
      sourcePrompt: '废土小镇里，一个旧清洁机器人守护红裙人偶',
      promptDraft: '固定旧清洁机器人的外形轮廓，减少复杂动作。',
      evidence: '4/5 条反馈提到该问题，差评率 80%',
    },
  ],
  platformCalibrations: [
    {
      id: 'calibration-1',
      createdAt: '2026-06-06T01:00:00.000Z',
      platform: 'Seedance',
      capabilityProfileId: 'seedance',
      shotId: 1,
      outcome: 'validated',
      resultNote: '主体稳定，动作轻微可用。',
      failureReasons: [],
      reusableSettings: '5s, cinematic, low motion',
      materialLink: 'https://example.com/shot-1',
      nextAction: 'expand_full_queue',
    },
  ],
};

describe('director kit export builders', () => {
  it('summarizes shot execution status', () => {
    expect(summarizeShotExecution(kit, context)).toEqual({
      pending: 0,
      generated: 1,
      failed: 1,
      usable: 0,
      total: 2,
      completed: 2,
      progress: 100,
    });
  });

  it('summarizes operator handoff acceptance blockers', () => {
    expect(summarizeOperatorHandoffAcceptance(kit, context)).toEqual({
      ready: true,
      blockingIssueCount: 0,
      pendingShotIds: [],
      missingEvidenceShotIds: [],
      failedWithoutReasonShotIds: [],
      calibrationCount: 1,
    });

    expect(summarizeOperatorHandoffAcceptance(kit, {
      ...context,
      shotExecutionStatus: { 1: 'generated', 2: 'failed' },
      shotResultNotes: {},
      platformCalibrations: [],
    })).toMatchObject({
      ready: false,
      blockingIssueCount: 2,
      pendingShotIds: [],
      missingEvidenceShotIds: [1],
      failedWithoutReasonShotIds: [2],
      calibrationCount: 0,
    });
  });

  it('builds a per-shot prompt with stability checklist', () => {
    const prompt = buildShotPrompt(kit, kit.shotCards[0]);

    expect(prompt).toContain('镜头 1｜5s｜文生视频');
    expect(prompt).toContain('主 Prompt：废土小镇里，一个旧清洁机器人守护红裙人偶。');
    expect(prompt).toContain('生成前稳定性检查：');
    expect(prompt).toContain('- 固定机器人轮廓');
    expect(prompt).toContain('Negative Prompt：畸形，闪烁，文字水印');
  });

  it('builds an execution checklist with notes and status', () => {
    const checklist = buildExecutionChecklist(kit, context);

    expect(checklist).toContain('# 镜词导演执行清单');
    expect(checklist).toContain('目标类型：赛博都市');
    expect(checklist).toContain('进度：2/2（100%）');
    expect(checklist).toContain('## 镜头 1｜5s｜已生成');
    expect(checklist).toContain('素材/备注：Seedance 链接：shot-1');
    expect(checklist).toContain('## 镜头 2｜7s｜翻车');
  });

  it('builds a deterministic project snapshot when generatedAt is provided', () => {
    const snapshot = buildProjectSnapshot(kit, context);

    expect(snapshot).toContain('# 镜词项目快照');
    expect(snapshot).toContain('生成时间：2026-06-06T00:00:00.000Z');
    expect(snapshot).toContain('状态分布：未生成 0｜已生成 1｜翻车 1｜可用 0');
    expect(snapshot).toContain('- 素材/备注：动作抖动，需改静态特写');
    expect(snapshot).toContain('## 迭代记录');
    expect(snapshot).toContain('### 迭代 1｜主体一致性 改写');
    expect(snapshot).toContain('- 证据：4/5 条反馈提到该问题，差评率 80%');
    expect(snapshot).toContain('## 平台校准证据');
    expect(snapshot).toContain('### 校准 1｜Seedance｜镜头 1');
    expect(snapshot).toContain('- 结果：已验证');
    expect(snapshot).toContain('- 能力画像：seedance');
    expect(snapshot).toContain('- 可复用设置：5s, cinematic, low motion');
    expect(snapshot).toContain('- 素材链接：https://example.com/shot-1');
    expect(snapshot).toContain('- 下一步：扩展到全片队列');
    expect(snapshot).toContain('## 下一步');
  });

  it('omits platform calibration section when no evidence exists', () => {
    const snapshot = buildProjectSnapshot(kit, { ...context, platformCalibrations: [] });

    expect(snapshot).not.toContain('## 平台校准证据');
  });

  it('builds operator handoff notes with calibration state and next actions', () => {
    const handoff = buildOperatorHandoffNotes(kit, context);

    expect(handoff).toContain('# 镜词 Operator 交接说明');
    expect(handoff).toContain('平台校准：共 1 条｜已验证 1｜未通过 0');
    expect(handoff).toContain('交接验收：可交接');
    expect(handoff).toContain('- 1 条校准建议扩展到全片队列。');
    expect(handoff).toContain('## 逐镜头交接');
    expect(handoff).toContain('- 镜头 1｜已生成｜文生视频｜低风险');
    expect(handoff).toContain('素材/备注：Seedance 链接：shot-1');
    expect(handoff).toContain('## 最近平台校准证据');
    expect(handoff).toContain('- Seedance｜镜头 1｜已验证');
    expect(handoff).toContain('可复用设置：5s, cinematic, low motion');
    expect(handoff).toContain('下一轮 Prompt 修订要引用本交接说明中的平台校准证据。');
  });

  it('keeps operator handoff actionable before calibration exists', () => {
    const handoff = buildOperatorHandoffNotes(kit, { ...context, platformCalibrations: [] });

    expect(handoff).toContain('平台校准：共 0 条｜已验证 0｜未通过 0');
    expect(handoff).toContain('- 先执行推荐平台首轮镜头，并回填平台校准结果。');
    expect(handoff).not.toContain('## 最近平台校准证据');
  });

  it('builds a platform feed pack', () => {
    const pack = buildPlatformFeedPack(kit, kit.platformAdvice[0], context);

    expect(pack).toContain('# Seedance 平台投喂包');
    expect(pack).toContain('推荐级别：推荐');
    expect(pack).toContain('## 项目上下文');
    expect(pack).toContain('原始创意：废土小镇里，一个旧清洁机器人守护红裙人偶');
    expect(pack).toContain('目标时长：60s');
    expect(pack).toContain('目标类型：赛博都市');
    expect(pack).toContain('出片进度：2/2（100%）');
    expect(pack).toContain('## 平台适配策略');
    expect(pack).toContain('首轮测试：先跑下列低风险/高匹配镜头，再扩展到全片。');
    expect(pack).toContain('- 镜头 1｜文生视频｜低风险｜建立世界');
    expect(pack).toContain('选择理由：匹配平台偏好模式；风险在首轮容忍范围内；一致性压力适中；有明确翻车补救建议');
    expect(pack).toContain('能力画像：Seedance｜偏好 文生视频、参考图｜首轮 2 镜头');
    expect(pack).toContain('风险容忍：中风险');
    expect(pack).toContain('平台偏好：文生视频主路径。');
    expect(pack).toContain('规避重点：避免多人同屏复杂动作。');
    expect(pack).toContain('## 反馈校准点');
    expect(pack).toContain('### 镜头 1 校准');
    expect(pack).toContain('镜头 1 是否验证了 Seedance 的 text-to-video 能力画像？');
    expect(pack).toContain('如果失败，记录失败原因：主体漂移 / 动作失真 / 平台不适配 / Prompt 太泛 / 画面不稳定 / 其他。');
    expect(pack).toContain('## 分镜投喂顺序');
    expect(pack).toContain('- 镜头 1｜5s｜文生视频');
    expect(pack).toContain('状态：已生成');
    expect(pack).toContain('素材/备注：动作抖动，需改静态特写');
    expect(pack).toContain('Prompt 写法：');
    expect(pack).toContain('- 建议 5s 单镜测试');
    expect(pack).toContain('## 执行提醒');
  });
});
