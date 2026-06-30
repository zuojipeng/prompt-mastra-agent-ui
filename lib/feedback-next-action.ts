import type { FeedbackAnalytics, FeedbackAnalyticsBucket } from './api-client';

export type FeedbackNextAction = {
  title: string;
  focus: string;
  recommendation: string;
  evidence: string;
  promptHint: string;
};

export function buildFeedbackPromptRevision(input: string, action: FeedbackNextAction): string {
  const basePrompt = input.trim() || '基于上一版 DirectorKit，继续优化当前视频创意。';
  const revisionBlock = [
    '下一轮改写要求：',
    `- 反馈重点：${action.focus}`,
    `- ${action.promptHint}`,
    `- ${action.recommendation}`,
    '- 保留原始故事核心，只调整与反馈重点相关的镜头约束。',
  ].join('\n');

  return `${basePrompt}\n\n${revisionBlock}`;
}

function getTopBucket(items: FeedbackAnalyticsBucket[]) {
  return [...items].sort((a, b) => {
    if (b.dislikeRate !== a.dislikeRate) return b.dislikeRate - a.dislikeRate;
    return b.dislikes - a.dislikes;
  })[0] ?? null;
}

function labelFailureReason(key: string) {
  const labels: Record<string, string> = {
    主体漂移: '主体一致性',
    动作太复杂: '动作复杂度',
    平台不适配: '平台适配',
    'Prompt 太泛': 'Prompt 具体度',
    画面不稳定: '画面稳定性',
  };
  return labels[key] ?? key;
}

export function deriveFeedbackNextAction(analytics: FeedbackAnalytics | null): FeedbackNextAction | null {
  if (!analytics || analytics.total < analytics.minSampleSize) {
    return null;
  }

  const topFailure = getTopBucket(analytics.dimensions.failureReasons);
  if (topFailure && topFailure.dislikes > 0) {
    const focus = labelFailureReason(topFailure.key);
    return {
      title: '下一轮先修正高频失败点',
      focus,
      recommendation: `优先压低「${focus}」相关差评，把下一版 DirectorKit 的镜头说明、稳定性约束和负面词写得更具体。`,
      evidence: `${topFailure.dislikes}/${topFailure.total} 条反馈提到该问题，差评率 ${topFailure.dislikeRate}%`,
      promptHint: `下一轮改写时，先补充「${focus}」的可执行约束，并减少容易触发该问题的镜头动作。`,
    };
  }

  const topPlatform = getTopBucket(analytics.dimensions.platforms);
  if (topPlatform && topPlatform.dislikes > 0) {
    return {
      title: '下一轮先做平台适配',
      focus: topPlatform.key,
      recommendation: `优先为「${topPlatform.key}」生成独立平台版本，不要直接复用通用 Prompt。`,
      evidence: `${topPlatform.dislikes}/${topPlatform.total} 条平台反馈为差评，差评率 ${topPlatform.dislikeRate}%`,
      promptHint: `下一轮导出时，为「${topPlatform.key}」单独收敛时长、镜头运动和风险词。`,
    };
  }

  const topRisk = getTopBucket(analytics.dimensions.riskTags);
  if (topRisk && topRisk.dislikes > 0) {
    return {
      title: '下一轮先降低风险标签',
      focus: topRisk.key,
      recommendation: `优先处理「${topRisk.key}」相关风险，给每个高风险镜头增加替代动作或保守版描述。`,
      evidence: `${topRisk.dislikes}/${topRisk.total} 条风险标签反馈为差评，差评率 ${topRisk.dislikeRate}%`,
      promptHint: `下一轮生成前，先把「${topRisk.key}」相关镜头拆成更短、更稳定的动作。`,
    };
  }

  if (analytics.dislikeRate > 0) {
    return {
      title: '下一轮先做小步复盘',
      focus: '整体质量',
      recommendation: '样本没有集中到单一失败维度，下一轮先保留有效结构，只小幅调整镜头动作和平台版本。',
      evidence: `${analytics.dislikes}/${analytics.total} 条反馈为差评，整体差评率 ${analytics.dislikeRate}%`,
      promptHint: '下一轮只改一个变量：镜头动作、平台版本或风险词，不要同时大改故事结构。',
    };
  }

  return {
    title: '下一轮可以扩大复用',
    focus: '高满意方向',
    recommendation: '当前反馈没有明显差评集中点，可以把这版 DirectorKit 保存为模板，并继续做平台分发。',
    evidence: `${analytics.likes}/${analytics.total} 条反馈为正向反馈`,
    promptHint: '下一轮优先复用当前叙事结构，只为不同平台生成轻量变体。',
  };
}
