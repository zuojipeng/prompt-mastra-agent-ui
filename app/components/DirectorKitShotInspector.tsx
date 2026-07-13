'use client';

import type { ReactNode } from 'react';
import type { ShotCard } from '@/lib/director-kit-contract';
import type { ShotExecutionStatus } from '@/lib/director-kit-export';
import type { ProvenanceRun } from '@/lib/provenance-run-contract';
import { DirectorKitShotExecutionControls } from './DirectorKitShotExecutionControls';
import type { ShotExecutionOption } from './DirectorKitExecutionPanel';
import { ShotProvenancePanel } from './ShotProvenancePanel';

export function DirectorKitShotInspector({
  shot,
  copiedShotId,
  currentStatus,
  shotExecutionOptions,
  resultNote,
  provenanceRun,
  provenanceBusy,
  onCopyShotPrompt,
  onRunProvenance,
  onStatusChange,
  onShotResultNoteChange,
  renderFeedback,
}: {
  shot: ShotCard | null;
  copiedShotId: number | null;
  currentStatus: ShotExecutionStatus;
  shotExecutionOptions: ShotExecutionOption[];
  resultNote: string;
  provenanceRun: ProvenanceRun | null;
  provenanceBusy: boolean;
  onCopyShotPrompt: (card: ShotCard) => void;
  onRunProvenance: (card: ShotCard, outcome?: 'succeeded' | 'failed') => void;
  onStatusChange: (shotId: number, status: ShotExecutionStatus) => void;
  onShotResultNoteChange: (shotId: number, value: string) => void;
  renderFeedback: (card: ShotCard) => ReactNode;
}) {
  if (!shot) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">当前镜头</p>
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">生成 DirectorKit 后选择一个镜头开始执行。</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-400">Current Shot</p>
          <h3 className="mt-1 text-sm font-semibold text-gray-900 dark:text-gray-100">镜头 {shot.shotId}</h3>
        </div>
        <span className="rounded bg-gray-100 px-2 py-1 text-[11px] font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-300">
          {shot.duration}
        </span>
      </div>

      <div className="grid gap-2 text-xs text-gray-600 dark:text-gray-400">
        <p><span className="font-medium text-gray-800 dark:text-gray-200">目的：</span>{shot.purpose}</p>
        <p><span className="font-medium text-gray-800 dark:text-gray-200">画面：</span>{shot.description}</p>
        <p><span className="font-medium text-gray-800 dark:text-gray-200">动作：</span>{shot.action}</p>
      </div>

      <button
        type="button"
        onClick={() => onCopyShotPrompt(shot)}
        className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
      >
        复制当前镜头 Prompt
      </button>
      {copiedShotId === shot.shotId && (
        <p className="text-[11px] text-emerald-600 dark:text-emerald-300">当前镜头 Prompt 已复制</p>
      )}

      <ShotProvenancePanel
        shotId={shot.shotId}
        run={provenanceRun}
        busy={provenanceBusy}
        embedded
        onRun={(outcome) => onRunProvenance(shot, outcome)}
      />

      <DirectorKitShotExecutionControls
        shotId={shot.shotId}
        currentStatus={currentStatus}
        options={shotExecutionOptions}
        onStatusChange={onStatusChange}
      />

      <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-800/70">
        <label
          htmlFor={`shot-inspector-result-note-${shot.shotId}`}
          className="text-[11px] font-semibold text-gray-700 dark:text-gray-300"
        >
          当前镜头素材 / 备注
        </label>
        <textarea
          id={`shot-inspector-result-note-${shot.shotId}`}
          value={resultNote}
          onChange={(event) => onShotResultNoteChange(shot.shotId, event.target.value)}
          placeholder="记录平台链接、文件名或失败原因..."
          className="mt-2 min-h-20 w-full resize-y rounded-md border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700 outline-none transition-colors placeholder:text-gray-400 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:placeholder:text-gray-500 dark:focus:border-emerald-500 dark:focus:ring-emerald-950"
        />
      </div>

      {renderFeedback(shot)}
    </div>
  );
}
