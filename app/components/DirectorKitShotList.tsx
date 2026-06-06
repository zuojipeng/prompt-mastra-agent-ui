'use client';

import type { ReactNode } from 'react';
import type { ShotCard } from '@/lib/director-kit-contract';
import type { ShotExecutionStatus } from '@/lib/director-kit-export';
import { DirectorKitShotExecutionControls } from './DirectorKitShotExecutionControls';
import type { ShotExecutionOption } from './DirectorKitExecutionPanel';

function getGenerationModeLabel(mode: ShotCard['generationMode']) {
  if (mode === 'text-to-video') return '文生视频';
  if (mode === 'image-to-video') return '图生视频';
  return '参考图';
}

function getGenerationModeClass(mode: ShotCard['generationMode']) {
  if (mode === 'text-to-video') {
    return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
  }
  if (mode === 'image-to-video') {
    return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300';
  }
  return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
}

function getRiskLabel(riskLevel: ShotCard['riskLevel']) {
  if (riskLevel === 'low') return '低';
  if (riskLevel === 'medium') return '中';
  return '高';
}

function getRiskClass(riskLevel: ShotCard['riskLevel']) {
  if (riskLevel === 'low') {
    return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300';
  }
  if (riskLevel === 'medium') {
    return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300';
  }
  return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
}

function getConsistencyLabel(consistencyNeed: ShotCard['consistencyNeed']) {
  if (consistencyNeed === 'low') return '低';
  if (consistencyNeed === 'medium') return '中';
  return '高';
}

export function DirectorKitShotList({
  shotCards,
  copiedShotId,
  shotExecutionStatus,
  shotExecutionOptions,
  shotResultNotes,
  onCopyShotPrompt,
  onStatusChange,
  onShotResultNoteChange,
  selectedShotId,
  onSelectShot,
  renderFeedback,
}: {
  shotCards: ShotCard[];
  copiedShotId: number | null;
  shotExecutionStatus: Record<number, ShotExecutionStatus>;
  shotExecutionOptions: ShotExecutionOption[];
  shotResultNotes: Record<number, string>;
  onCopyShotPrompt: (card: ShotCard) => void;
  onStatusChange: (shotId: number, status: ShotExecutionStatus) => void;
  onShotResultNoteChange: (shotId: number, value: string) => void;
  selectedShotId?: number | null;
  onSelectShot?: (card: ShotCard) => void;
  renderFeedback: (card: ShotCard) => ReactNode;
}) {
  if (!shotCards.length) return null;

  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-gray-900 dark:text-gray-100">🎥 分镜卡片（{shotCards.length} 个镜头）</h3>
      <div className="grid gap-3">
        {shotCards.map((card) => (
          <div
            key={card.shotId}
            className={`rounded-xl border bg-white p-5 dark:bg-gray-900 space-y-3 ${
              selectedShotId === card.shotId
                ? 'border-cyan-300 ring-2 ring-cyan-100 dark:border-cyan-800 dark:ring-cyan-950'
                : 'border-gray-200 dark:border-gray-800'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-gray-700 dark:text-gray-300">镜头 {card.shotId}</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">时长 {card.duration}</span>
                {onSelectShot && (
                  <button
                    type="button"
                    onClick={() => onSelectShot(card)}
                    className="rounded-md border border-gray-200 bg-white px-2 py-1 text-[11px] font-medium text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
                  >
                    {selectedShotId === card.shotId ? '当前镜头' : '设为当前'}
                  </button>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 dark:text-gray-400">
              <p><span className="font-medium">景别：</span>{card.framing}</p>
              <p><span className="font-medium">目的：</span>{card.purpose}</p>
              <p><span className="font-medium">情绪：</span>{card.mood}</p>
              <p><span className="font-medium">运镜：</span>{card.motion}</p>
            </div>
            <p className="text-sm text-gray-900 dark:text-gray-100">{card.description}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{card.action}</p>
            <div className="flex flex-wrap gap-2">
              <span className={`rounded px-2 py-0.5 text-[11px] font-medium ${getGenerationModeClass(card.generationMode)}`}>
                {getGenerationModeLabel(card.generationMode)}
              </span>
              <span className={`rounded px-2 py-0.5 text-[11px] font-medium ${getRiskClass(card.riskLevel)}`}>
                风险: {getRiskLabel(card.riskLevel)}
              </span>
              <span className="rounded bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                一致性: {getConsistencyLabel(card.consistencyNeed)}
              </span>
            </div>
            {(card.riskTags ?? []).length > 0 && (
              <div className="flex flex-wrap gap-1">
                {(card.riskTags ?? []).map((tag, index) => (
                  <span
                    key={`${tag}-${index}`}
                    className="rounded bg-red-50 px-1.5 py-0.5 text-[10px] text-red-500 dark:bg-red-950/30 dark:text-red-400"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
            {(card.riskTagDetails ?? []).length > 0 && (
              <div className="grid gap-2 rounded-lg bg-red-50/70 p-3 dark:bg-red-950/20">
                <p className="text-[11px] font-semibold text-red-700 dark:text-red-300">风险标签说明</p>
                {(card.riskTagDetails ?? []).map((risk, index) => (
                  <div key={`${risk.tag}-${index}`} className="text-[11px] text-gray-600 dark:text-gray-400">
                    <span className="font-medium text-gray-800 dark:text-gray-200">{risk.tag}：</span>
                    {risk.impact}
                    <span className="ml-1 text-emerald-700 dark:text-emerald-300">规避：{risk.mitigation}</span>
                  </div>
                ))}
              </div>
            )}
            {(card.stabilityChecklist ?? []).length > 0 && (
              <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-800/70">
                <p className="text-[11px] font-semibold text-gray-700 dark:text-gray-300">生成前稳定性检查</p>
                <ul className="mt-1 grid gap-1">
                  {(card.stabilityChecklist ?? []).map((item, index) => (
                    <li key={`${item}-${index}`} className="flex items-start gap-1.5 text-[11px] text-gray-600 dark:text-gray-400">
                      <span className="mt-0.5 text-emerald-500">✓</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {card.fixSuggestion && (
              <p className="rounded-lg bg-emerald-50 p-2 text-[11px] text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400">
                💡 {card.fixSuggestion}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => onCopyShotPrompt(card)}
                className="rounded-md border border-gray-200 bg-white px-3 py-1.5 text-[11px] font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                复制镜头 Prompt
              </button>
              {copiedShotId === card.shotId && (
                <span className="text-[11px] text-emerald-600 dark:text-emerald-300">镜头 Prompt 已复制</span>
              )}
            </div>
            <DirectorKitShotExecutionControls
              shotId={card.shotId}
              currentStatus={shotExecutionStatus[card.shotId] ?? 'pending'}
              options={shotExecutionOptions}
              onStatusChange={onStatusChange}
            />
            <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-800/70">
              <label
                htmlFor={`shot-result-note-${card.shotId}`}
                className="text-[11px] font-semibold text-gray-700 dark:text-gray-300"
              >
                素材链接 / 结果备注
              </label>
              <textarea
                id={`shot-result-note-${card.shotId}`}
                value={shotResultNotes[card.shotId] ?? ''}
                onChange={(event) => onShotResultNoteChange(card.shotId, event.target.value)}
                placeholder="粘贴平台生成链接、文件名或记录翻车原因..."
                className="mt-2 min-h-16 w-full resize-y rounded-md border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700 outline-none transition-colors placeholder:text-gray-400 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:placeholder:text-gray-500 dark:focus:border-emerald-500 dark:focus:ring-emerald-950"
              />
            </div>
            {renderFeedback(card)}
          </div>
        ))}
      </div>
    </div>
  );
}
