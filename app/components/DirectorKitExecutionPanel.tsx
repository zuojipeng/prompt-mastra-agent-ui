'use client';

import type { ShotExecutionStatus } from '@/lib/director-kit-export';

export type ShotExecutionOption = {
  status: ShotExecutionStatus;
  label: string;
  className: string;
};

export type ShotExecutionSummary = Record<ShotExecutionStatus, number>;

export function DirectorKitExecutionPanel({
  completedShotCount,
  trackedShotCount,
  executionProgress,
  executionSummary,
  shotExecutionOptions,
  copiedChecklist,
  copiedSnapshot,
  onCopyExecutionChecklist,
  onCopyProjectSnapshot,
}: {
  completedShotCount: number;
  trackedShotCount: number;
  executionProgress: number;
  executionSummary: ShotExecutionSummary;
  shotExecutionOptions: ShotExecutionOption[];
  copiedChecklist: boolean;
  copiedSnapshot: boolean;
  onCopyExecutionChecklist: () => void;
  onCopyProjectSnapshot: () => void;
}) {
  if (!trackedShotCount) return null;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">出片执行进度</p>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {completedShotCount}/{trackedShotCount} 个镜头已有执行结果
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          <div className="h-2 w-28 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all"
              style={{ width: `${executionProgress}%` }}
            />
          </div>
          <span className="w-10 text-right font-medium tabular-nums">{executionProgress}%</span>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onCopyExecutionChecklist}
          className="rounded-md border border-gray-200 bg-white px-3 py-1.5 text-[11px] font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          复制执行清单
        </button>
        {copiedChecklist && (
          <span className="text-[11px] text-emerald-600 dark:text-emerald-300">执行清单已复制</span>
        )}
        <button
          type="button"
          onClick={onCopyProjectSnapshot}
          className="rounded-md border border-gray-200 bg-white px-3 py-1.5 text-[11px] font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          复制项目快照
        </button>
        {copiedSnapshot && (
          <span className="text-[11px] text-emerald-600 dark:text-emerald-300">项目快照已复制</span>
        )}
      </div>
      <div className="mt-3 grid grid-cols-4 gap-2 text-center">
        {shotExecutionOptions.map((option) => (
          <div key={option.status} className={`rounded-lg border px-2 py-2 ${option.className}`}>
            <p className="text-[10px]">{option.label}</p>
            <p className="mt-0.5 text-sm font-semibold tabular-nums">{executionSummary[option.status]}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
