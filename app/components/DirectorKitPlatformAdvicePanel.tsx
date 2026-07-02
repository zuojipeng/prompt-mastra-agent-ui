'use client';

import type { ReactNode } from 'react';
import type { DirectorKit } from '@/lib/director-kit-contract';

type PlatformAdvice = DirectorKit['platformAdvice'][number];

function AdviceList({
  label,
  items,
}: {
  label: string;
  items?: string[];
}) {
  if (!items?.length) return null;

  return (
    <div>
      <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400">{label}</p>
      <ul className="mt-0.5 grid gap-0.5">
        {items.map((item, index) => (
          <li key={`${label}-${index}`} className="flex items-start gap-1.5 text-[11px] text-gray-500 dark:text-gray-400">
            <span className="mt-0.5 text-gray-400">•</span>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function DirectorKitPlatformAdvicePanel({
  platformAdvice,
  copiedPlatform,
  onCopyPlatformFeedPack,
  renderFeedback,
  renderCalibration,
}: {
  platformAdvice: PlatformAdvice[];
  copiedPlatform: string | null;
  onCopyPlatformFeedPack: (advice: PlatformAdvice) => void;
  renderFeedback: (advice: PlatformAdvice) => ReactNode;
  renderCalibration?: (advice: PlatformAdvice) => ReactNode;
}) {
  if (!platformAdvice.length) return null;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold text-gray-900 dark:text-gray-100">平台建议 / 投喂</h3>
        <span className="rounded bg-blue-50 px-2 py-1 text-[11px] font-medium text-blue-700 dark:bg-blue-950/30 dark:text-blue-300">
          {platformAdvice.length} 个平台建议
        </span>
      </div>
      <div className="grid gap-2">
        {platformAdvice.map((advice) => (
          <div key={advice.platform} className="flex items-start gap-3 rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
            <span className={`mt-0.5 shrink-0 rounded px-2 py-0.5 text-xs font-bold ${
              advice.recommended
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                : 'bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
            }`}>
              {advice.recommended ? '推荐' : '可选'}
            </span>
            <div className="min-w-0 space-y-2">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{advice.platform}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{advice.note}</p>
              {advice.bestFor && (
                <p className="text-xs text-gray-600 dark:text-gray-300">
                  <span className="font-medium">适合：</span>{advice.bestFor}
                </p>
              )}
              <AdviceList label="Prompt 写法" items={advice.promptTips} />
              <AdviceList label="推荐设置" items={advice.settings} />
              <AdviceList label="避免" items={advice.avoid} />
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => onCopyPlatformFeedPack(advice)}
                  className="rounded-md border border-gray-200 bg-white px-3 py-1.5 text-[11px] font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
                >
                  复制平台投喂包
                </button>
                {copiedPlatform === advice.platform && (
                  <span className="text-[11px] text-emerald-600 dark:text-emerald-300">平台投喂包已复制</span>
                )}
              </div>
              {renderFeedback(advice)}
              {renderCalibration?.(advice)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
