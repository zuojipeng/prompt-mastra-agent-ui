'use client';

import type { ShotExecutionStatus } from '@/lib/director-kit-export';
import type { ShotExecutionOption } from './DirectorKitExecutionPanel';

export function DirectorKitShotExecutionControls({
  shotId,
  currentStatus,
  options,
  onStatusChange,
}: {
  shotId: number;
  currentStatus: ShotExecutionStatus;
  options: ShotExecutionOption[];
  onStatusChange: (shotId: number, status: ShotExecutionStatus) => void;
}) {
  return (
    <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-800/70">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] font-semibold text-gray-700 dark:text-gray-300">执行状态</p>
        <div className="flex flex-wrap gap-1.5">
          {options.map((option) => {
            const selected = currentStatus === option.status;
            return (
              <button
                key={`${shotId}-${option.status}`}
                type="button"
                aria-pressed={selected}
                onClick={() => onStatusChange(shotId, option.status)}
                className={`rounded-md border px-2.5 py-1 text-[11px] font-medium transition-colors ${
                  selected
                    ? option.className
                    : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800'
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
