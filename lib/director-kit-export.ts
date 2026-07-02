import type {
  DirectorKit,
  DirectorKitTargetDuration,
  DirectorKitTargetType,
  ShotCard,
} from './director-kit-contract';
import {
  explainPlatformFirstPassShot,
  rankPlatformFirstPassShots,
  resolvePlatformCapability,
} from './platform-capabilities';
import type { ProjectWorkspaceIteration } from './project-workspace';

export type ShotExecutionStatus = 'pending' | 'generated' | 'failed' | 'usable';

export type DirectorKitExportContext = {
  creativeInput: string;
  targetDuration: DirectorKitTargetDuration;
  targetType: DirectorKitTargetType;
  shotExecutionStatus: Record<number, ShotExecutionStatus>;
  shotResultNotes: Record<number, string>;
  generatedAt?: string;
  projectIterations?: ProjectWorkspaceIteration[];
};

type PlatformAdvice = DirectorKit['platformAdvice'][number];

const EXPORT_LABELS: Record<string, string> = {
  'text-to-video': '文生视频',
  'image-to-video': '图生视频',
  'reference-image': '参考图',
  low: '低风险',
  medium: '中风险',
  high: '高风险',
  wasteland: '末世废土',
  ancient: '古风',
  cyberpunk: '赛博都市',
  wuxia: '武侠',
  thriller: '悬疑',
  romance: '言情',
  scifi: '科幻',
  comedy: '喜剧',
};

const SHOT_STATUS_LABELS: Record<ShotExecutionStatus, string> = {
  pending: '未生成',
  generated: '已生成',
  failed: '翻车',
  usable: '可用',
};

function label(value: string) {
  return EXPORT_LABELS[value] ?? value;
}

function getShotStatusLabel(context: DirectorKitExportContext, shotId: number) {
  return SHOT_STATUS_LABELS[context.shotExecutionStatus[shotId] ?? 'pending'];
}

function getResultNote(context: DirectorKitExportContext, shotId: number) {
  return context.shotResultNotes[shotId]?.trim();
}

export function summarizeShotExecution(kit: DirectorKit, context: DirectorKitExportContext) {
  const summary = (kit.shotCards ?? []).reduce(
    (acc, card) => {
      const status = context.shotExecutionStatus[card.shotId] ?? 'pending';
      acc[status] += 1;
      return acc;
    },
    { pending: 0, generated: 0, failed: 0, usable: 0 } satisfies Record<ShotExecutionStatus, number>,
  );
  const total = kit.shotCards?.length ?? 0;
  const completed = summary.generated + summary.failed + summary.usable;
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

  return {
    ...summary,
    total,
    completed,
    progress,
  };
}

export function buildShotPrompt(kit: DirectorKit, card: ShotCard) {
  const checklist = (card.stabilityChecklist ?? []).map((item) => `- ${item}`).join('\n');
  const riskTags = (card.riskTags ?? []).join('、') || '无';

  return [
    `镜头 ${card.shotId}｜${card.duration}｜${label(card.generationMode)}`,
    '',
    `主 Prompt：${kit.masterPrompt}`,
    '',
    `画面：${card.description}`,
    `动作：${card.action}`,
    `景别：${card.framing}`,
    `运镜：${card.motion}`,
    `情绪：${card.mood}`,
    `镜头目的：${card.purpose}`,
    `一致性要求：${label(card.consistencyNeed)}`,
    `风险等级：${label(card.riskLevel)}`,
    `风险标签：${riskTags}`,
    card.fixSuggestion ? `补救建议：${card.fixSuggestion}` : '',
    checklist ? `\n生成前稳定性检查：\n${checklist}` : '',
    kit.negativePrompt ? `\nNegative Prompt：${kit.negativePrompt}` : '',
  ].filter(Boolean).join('\n');
}

export function buildExecutionChecklist(kit: DirectorKit, context: DirectorKitExportContext) {
  const story = kit.storySetting;
  const selectedVersion = kit.selectedVersion;
  const execution = summarizeShotExecution(kit, context);
  const shotLines = (kit.shotCards ?? []).map((card) => {
    const resultNote = getResultNote(context, card.shotId);
    return [
      `## 镜头 ${card.shotId}｜${card.duration}｜${getShotStatusLabel(context, card.shotId)}`,
      `目的：${card.purpose}`,
      `画面：${card.description}`,
      `动作：${card.action}`,
      `生成模式：${label(card.generationMode)}`,
      `风险：${label(card.riskLevel)}｜${(card.riskTags ?? []).join('、') || '无'}`,
      resultNote ? `素材/备注：${resultNote}` : '',
      card.fixSuggestion ? `补救：${card.fixSuggestion}` : '',
    ].filter(Boolean).join('\n');
  });
  const platformLines = (kit.platformAdvice ?? []).map((advice) =>
    [
      `- ${advice.platform}${advice.recommended ? '（推荐）' : ''}：${advice.note}`,
      advice.bestFor ? `  适合：${advice.bestFor}` : '',
    ].filter(Boolean).join('\n'),
  );

  return [
    '# 镜词导演执行清单',
    '',
    `原始创意：${context.creativeInput}`,
    `目标时长：${context.targetDuration}`,
    `目标类型：${label(context.targetType)}`,
    selectedVersion ? `选择版本：${selectedVersion.label}｜${selectedVersion.versionType}` : '',
    '',
    '## 故事设定',
    story ? `梗概：${story.logline}` : '',
    story ? `主角：${story.protagonist}` : '',
    story ? `世界观：${story.worldSetting}` : '',
    story ? `视觉母题：${story.visualMotif}` : '',
    '',
    '## 出片进度',
    `进度：${execution.completed}/${execution.total}（${execution.progress}%）`,
    `未生成：${execution.pending}｜已生成：${execution.generated}｜翻车：${execution.failed}｜可用：${execution.usable}`,
    '',
    '## 分镜执行',
    shotLines.join('\n\n'),
    '',
    '## 平台建议',
    platformLines.join('\n'),
    '',
    '## 主 Prompt',
    kit.masterPrompt,
    kit.negativePrompt ? `\nNegative Prompt：${kit.negativePrompt}` : '',
    '',
    '## 风险补救',
    `Top 风险：${(kit.riskRemediation?.topRisks ?? []).join('、') || '无'}`,
    `替代镜头：${(kit.riskRemediation?.alternativeShots ?? []).join('、') || '无'}`,
    `备用策略：${(kit.riskRemediation?.backupStrategies ?? []).join('、') || '无'}`,
  ].filter(Boolean).join('\n');
}

export function buildProjectSnapshot(kit: DirectorKit, context: DirectorKitExportContext) {
  const selectedVersion = kit.selectedVersion;
  const story = kit.storySetting;
  const execution = summarizeShotExecution(kit, context);
  const shotLines = (kit.shotCards ?? []).map((card) => {
    const resultNote = getResultNote(context, card.shotId);

    return [
      `### 镜头 ${card.shotId}｜${getShotStatusLabel(context, card.shotId)}`,
      `- 时长：${card.duration}`,
      `- 目的：${card.purpose}`,
      `- 画面：${card.description}`,
      `- 动作：${card.action}`,
      `- 平台模式：${label(card.generationMode)}`,
      `- 风险：${label(card.riskLevel)}｜${(card.riskTags ?? []).join('、') || '无'}`,
      resultNote ? `- 素材/备注：${resultNote}` : '- 素材/备注：待补充',
    ].join('\n');
  });
  const platformLines = (kit.platformAdvice ?? []).map((advice) =>
    [
      `### ${advice.platform}${advice.recommended ? '（推荐）' : ''}`,
      `- 适合：${advice.bestFor || advice.note}`,
      `- 说明：${advice.note}`,
      advice.settings?.length ? `- 设置：${advice.settings.join('；')}` : '',
      advice.avoid?.length ? `- 避免：${advice.avoid.join('；')}` : '',
    ].filter(Boolean).join('\n'),
  );
  const iterationLines = (context.projectIterations ?? []).slice(0, 5).map((iteration, index) =>
    [
      `### 迭代 ${index + 1}｜${iteration.title}`,
      `- 来源：${iteration.source === 'feedback_next_action' ? '反馈改写' : '手动迭代'}`,
      `- 重点：${iteration.focus}`,
      `- 证据：${iteration.evidence}`,
      `- 草稿：${iteration.promptDraft}`,
    ].join('\n'),
  );

  return [
    '# 镜词项目快照',
    '',
    `生成时间：${context.generatedAt ?? new Date().toISOString()}`,
    `项目创意：${context.creativeInput}`,
    `目标时长：${context.targetDuration}`,
    `目标类型：${label(context.targetType)}`,
    selectedVersion ? `采用版本：${selectedVersion.label}｜${selectedVersion.summary}` : '',
    '',
    '## 项目状态',
    `出片进度：${execution.completed}/${execution.total}（${execution.progress}%）`,
    `状态分布：未生成 ${execution.pending}｜已生成 ${execution.generated}｜翻车 ${execution.failed}｜可用 ${execution.usable}`,
    '',
    '## 故事圣经',
    story ? `- 梗概：${story.logline}` : '',
    story ? `- 导演意图：${story.directorIntent}` : '',
    story ? `- 主角：${story.protagonist}` : '',
    story ? `- 世界观：${story.worldSetting}` : '',
    story ? `- 视觉母题：${story.visualMotif}` : '',
    '',
    '## 分镜素材目录',
    shotLines.join('\n\n'),
    '',
    '## 平台投喂策略',
    platformLines.join('\n\n'),
    '',
    iterationLines.length > 0 ? '## 迭代记录' : '',
    iterationLines.join('\n\n'),
    iterationLines.length > 0 ? '' : '',
    '## 主 Prompt',
    kit.masterPrompt,
    kit.negativePrompt ? `\nNegative Prompt：${kit.negativePrompt}` : '',
    '',
    '## 风险补救',
    `- Top 风险：${(kit.riskRemediation?.topRisks ?? []).join('、') || '无'}`,
    `- 替代镜头：${(kit.riskRemediation?.alternativeShots ?? []).join('、') || '无'}`,
    `- 备用策略：${(kit.riskRemediation?.backupStrategies ?? []).join('、') || '无'}`,
    '',
    '## 下一步',
    '- 对未生成镜头继续逐镜头投喂。',
    '- 对翻车镜头补充失败原因并回到镜词反馈。',
    '- 对可用镜头沉淀素材链接，进入剪辑和复盘。',
  ].filter(Boolean).join('\n');
}

export function buildPlatformFeedPack(
  kit: DirectorKit,
  advice: PlatformAdvice,
  context?: DirectorKitExportContext,
) {
  const list = (title: string, items: string[] | undefined) =>
    items?.length ? [`${title}：`, ...items.map((item) => `- ${item}`)].join('\n') : '';
  const execution = context ? summarizeShotExecution(kit, context) : null;
  const projectLines = context
    ? [
      '## 项目上下文',
      `原始创意：${context.creativeInput}`,
      `目标时长：${context.targetDuration}`,
      `目标类型：${label(context.targetType)}`,
      execution ? `出片进度：${execution.completed}/${execution.total}（${execution.progress}%）` : '',
    ].filter(Boolean)
    : [];
  const platformCapability = resolvePlatformCapability(advice.platform);
  const firstPassShots = rankPlatformFirstPassShots(kit.shotCards ?? [], platformCapability).map((card) =>
    [
      `- 镜头 ${card.shotId}｜${label(card.generationMode)}｜${label(card.riskLevel)}｜${card.purpose}`,
      `  选择理由：${explainPlatformFirstPassShot(card, platformCapability)}`,
    ].join('\n'),
  );
  const platformStrategy = [
    '## 平台适配策略',
    `首轮测试：${firstPassShots.length ? '先跑下列低风险/高匹配镜头，再扩展到全片。' : '暂无分镜，先补齐 DirectorKit 分镜。'}`,
    firstPassShots.join('\n'),
    `能力画像：${platformCapability.displayName}｜偏好 ${platformCapability.preferredModes.map(label).join('、')}｜首轮 ${platformCapability.maxFirstPassShots} 镜头`,
    `风险容忍：${label(platformCapability.riskTolerance)}`,
    platformCapability.handoffNotes.length ? `交付提示：${platformCapability.handoffNotes.join('；')}` : '',
    advice.bestFor ? `平台偏好：${advice.bestFor}` : '',
    advice.avoid?.length ? `规避重点：${advice.avoid.join('；')}` : '',
  ].filter(Boolean);
  const shotQueue = (kit.shotCards ?? []).map((card) =>
    [
      `- 镜头 ${card.shotId}｜${card.duration}｜${label(card.generationMode)}`,
      `  画面：${card.description}`,
      `  动作：${card.action}`,
      context ? `  状态：${getShotStatusLabel(context, card.shotId)}` : '',
      context && getResultNote(context, card.shotId) ? `  素材/备注：${getResultNote(context, card.shotId)}` : '',
    ].filter(Boolean).join('\n'),
  );

  return [
    `# ${advice.platform} 平台投喂包`,
    '',
    advice.recommended ? '推荐级别：推荐' : '推荐级别：可选',
    `适合：${advice.bestFor || advice.note}`,
    `说明：${advice.note}`,
    '',
    projectLines.join('\n'),
    projectLines.length > 0 ? '' : '',
    platformStrategy.join('\n'),
    '',
    '## 主 Prompt',
    kit.masterPrompt,
    kit.negativePrompt ? `\n## Negative Prompt\n${kit.negativePrompt}` : '',
    '',
    shotQueue.length > 0 ? '## 分镜投喂顺序' : '',
    shotQueue.join('\n'),
    shotQueue.length > 0 ? '' : '',
    list('Prompt 写法', advice.promptTips),
    '',
    list('推荐设置', advice.settings),
    '',
    list('避免', advice.avoid),
    '',
    '## 执行提醒',
    '- 先用单镜头短时长测试。',
    '- 高风险镜头优先使用参考图或图生视频。',
    '- 生成后回到镜词标记镜头状态并提交反馈。',
  ].filter(Boolean).join('\n');
}
