'use client';

import type { FeedbackAnalytics } from '@/lib/api-client';
import { deriveFeedbackNextAction } from '@/lib/feedback-next-action';

const FEEDBACK_LABELS: Record<string, string> = {
  director_kit: '执行包整体',
  shot_card: '分镜卡片',
  platform_advice: '平台建议',
  legacy_prompt: '旧版 Prompt',
  v1: 'V1',
  v2: 'V2',
  text_to_video: '文生视频',
  'text-to-video': '文生视频',
  'image-to-video': '图生视频',
  'reference-image': '参考图',
  low: '低风险',
  medium: '中风险',
  high: '高风险',
  wasteland: '末世废土',
  fantasy: '东方奇幻',
  cyberpunk: '赛博都市',
  commercial: '商业广告',
  realistic: '现实剧情',
};

function getFeedbackLabel(value: string) {
  return FEEDBACK_LABELS[value] ?? value;
}

function AnalyticsDimension({
  title,
  items,
}: {
  title: string;
  items: FeedbackAnalytics['dimensions']['failureReasons'];
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900">
      <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">{title}</p>
      {items.length > 0 ? (
        <div className="mt-2 grid gap-2">
          {items.slice(0, 3).map((item) => (
            <div key={`${title}-${item.key}`} className="grid gap-1">
              <div className="flex items-center justify-between gap-3 text-[11px]">
                <span className="min-w-0 truncate text-gray-600 dark:text-gray-400">{getFeedbackLabel(item.key)}</span>
                <span className="shrink-0 font-medium tabular-nums text-amber-600 dark:text-amber-300">
                  差评 {item.dislikeRate}%
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                <div
                  className="h-full rounded-full bg-amber-500"
                  style={{ width: `${Math.min(item.dislikeRate, 100)}%` }}
                />
              </div>
              <p className="text-[10px] text-gray-400">
                {item.dislikes} 踩 / {item.total} 条
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-2 text-[11px] text-gray-400">暂无足够样本</p>
      )}
    </div>
  );
}

export function FeedbackInsightPanel({
  open,
  state,
  analytics,
}: {
  open: boolean;
  state: 'idle' | 'loading' | 'error';
  analytics: FeedbackAnalytics | null;
}) {
  if (!open) return null;
  const nextAction = deriveFeedbackNextAction(analytics);

  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-950/40">
      {state === 'loading' && !analytics ? (
        <p className="text-xs text-gray-500 dark:text-gray-400">正在加载反馈洞察...</p>
      ) : state === 'error' && !analytics ? (
        <p className="text-xs text-red-500">反馈洞察暂时不可用，主创作流程不受影响。</p>
      ) : analytics ? (
        <div className="space-y-4">
          {nextAction && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-900/60 dark:bg-emerald-950/20">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-700 dark:text-emerald-300">
                    下一轮建议
                  </p>
                  <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-gray-100">{nextAction.title}</p>
                </div>
                <span className="self-start rounded-md bg-white px-2 py-1 text-[11px] font-medium text-emerald-700 dark:bg-gray-900 dark:text-emerald-300">
                  {nextAction.focus}
                </span>
              </div>
              <p className="mt-2 text-xs leading-5 text-gray-700 dark:text-gray-300">{nextAction.recommendation}</p>
              <p className="mt-2 text-[11px] text-emerald-700 dark:text-emerald-300">{nextAction.evidence}</p>
              <p className="mt-2 rounded-md bg-white p-2 text-[11px] leading-5 text-gray-600 dark:bg-gray-900 dark:text-gray-300">
                {nextAction.promptHint}
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              ['样本', analytics.total],
              ['差评率', `${analytics.dislikeRate}%`],
              ['V2 占比', `${analytics.v2Share}%`],
              ['窗口', `${analytics.windowDays} 天`],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg bg-white p-3 dark:bg-gray-900">
                <p className="text-[10px] text-gray-400">{label}</p>
                <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-gray-100">{value}</p>
              </div>
            ))}
          </div>

          {analytics.qualityFlags.length > 0 && (
            <div className="grid gap-1 rounded-lg bg-amber-50 p-3 dark:bg-amber-950/20">
              {analytics.qualityFlags.map((flag) => (
                <p key={flag} className="text-[11px] text-amber-700 dark:text-amber-300">{flag}</p>
              ))}
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-3">
            <AnalyticsDimension title="高频失败原因" items={analytics.dimensions.failureReasons} />
            <AnalyticsDimension title="平台风险" items={analytics.dimensions.platforms} />
            <AnalyticsDimension title="风险标签" items={analytics.dimensions.riskTags} />
          </div>

          {analytics.highValueSamples.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">最近差评样本</p>
              <div className="mt-2 grid gap-2">
                {analytics.highValueSamples.slice(0, 3).map((sample, index) => (
                  <div key={`${sample.createdAt}-${index}`} className="rounded-lg bg-white p-3 dark:bg-gray-900">
                    <div className="flex flex-wrap items-center gap-2 text-[10px] text-gray-400">
                      <span>{getFeedbackLabel(sample.eventType)}</span>
                      {sample.platform && <span>{sample.platform}</span>}
                      {sample.generationMode && <span>{getFeedbackLabel(sample.generationMode)}</span>}
                      {sample.riskLevel && <span>{getFeedbackLabel(sample.riskLevel)}</span>}
                    </div>
                    <p className="mt-2 line-clamp-2 text-xs text-gray-700 dark:text-gray-300">{sample.input}</p>
                    {(sample.failureReasons.length > 0 || sample.comment) && (
                      <p className="mt-2 text-[11px] text-amber-600 dark:text-amber-300">
                        {[...sample.failureReasons, sample.comment].filter(Boolean).join(' / ')}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <p className="text-xs text-gray-500 dark:text-gray-400">暂无反馈洞察。</p>
      )}
    </div>
  );
}
