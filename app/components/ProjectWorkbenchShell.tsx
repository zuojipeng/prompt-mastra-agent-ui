'use client';

import type {
  ProjectShellSummary,
  ProjectSyncDisplay,
  WorkbenchStage,
} from '@/lib/workbench-shell';

type ProjectWorkbenchShellProps = {
  summary: ProjectShellSummary;
  syncDisplay: ProjectSyncDisplay;
  projectCount: number;
  stages: WorkbenchStage[];
  onOpenProjects: () => void;
};

const SYNC_TONE_CLASS: Record<ProjectSyncDisplay['tone'], string> = {
  neutral: 'border-gray-200 bg-gray-50 text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300',
  loading: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-300',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300',
  warning: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300',
  error: 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300',
};

export function ProjectWorkbenchShell({
  summary,
  syncDisplay,
  projectCount,
  stages,
  onOpenProjects,
}: ProjectWorkbenchShellProps) {
  return (
    <section className="mb-4 rounded-lg border border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-900">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-gray-400">
              Jingci Workbench
            </p>
            <span className={`rounded-md border px-2 py-0.5 text-[10px] font-semibold ${SYNC_TONE_CLASS[syncDisplay.tone]}`}>
              {syncDisplay.label}
            </span>
          </div>
          <h1 className="mt-1 truncate text-base font-semibold text-gray-950 dark:text-gray-50">
            {summary.title}
          </h1>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {summary.targetDuration} · {summary.targetTypeLabel} · {summary.stageLabel}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4 xl:flex xl:items-center">
          <button
            type="button"
            onClick={onOpenProjects}
            className="rounded-md border border-gray-200 bg-white px-3 py-2 text-left transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:hover:bg-gray-800"
          >
            <p className="text-[10px] text-gray-400">Projects</p>
            <p className="mt-0.5 font-semibold tabular-nums text-gray-800 dark:text-gray-100">
              {projectCount}
            </p>
          </button>
          <div className="rounded-md bg-gray-50 px-3 py-2 dark:bg-gray-800">
            <p className="text-[10px] text-gray-400">Stage</p>
            <p className="mt-0.5 font-semibold text-gray-800 dark:text-gray-100">{summary.stageLabel}</p>
          </div>
          <div className="rounded-md bg-gray-50 px-3 py-2 dark:bg-gray-800">
            <p className="text-[10px] text-gray-400">Health</p>
            <p className="mt-0.5 font-semibold tabular-nums text-gray-800 dark:text-gray-100">
              {summary.healthLabel}
            </p>
          </div>
          <div className="rounded-md bg-gray-50 px-3 py-2 dark:bg-gray-800">
            <p className="text-[10px] text-gray-400">Progress</p>
            <p className="mt-0.5 font-semibold tabular-nums text-gray-800 dark:text-gray-100">
              {summary.shotProgressLabel}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4 hidden gap-2 lg:grid lg:grid-cols-6">
        {stages.map((stage) => (
          <div
            key={stage.id}
            className={`rounded-md border px-3 py-2 ${
              stage.active
                ? 'border-cyan-200 bg-cyan-50 dark:border-cyan-900/60 dark:bg-cyan-950/30'
                : stage.done
                  ? 'border-emerald-200 bg-emerald-50/70 dark:border-emerald-900/60 dark:bg-emerald-950/20'
                  : stage.blocked
                    ? 'border-gray-200 bg-gray-50 opacity-60 dark:border-gray-800 dark:bg-gray-950'
                    : 'border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <p className="truncate text-xs font-semibold text-gray-800 dark:text-gray-100">{stage.label}</p>
              <span
                className={`h-2 w-2 rounded-full ${
                  stage.done
                    ? 'bg-emerald-500'
                    : stage.active
                      ? 'bg-cyan-600'
                      : stage.blocked
                        ? 'bg-gray-300 dark:bg-gray-700'
                        : 'bg-gray-400'
                }`}
              />
            </div>
            {stage.value && <p className="mt-1 text-[10px] text-gray-500 dark:text-gray-400">{stage.value}</p>}
          </div>
        ))}
      </div>
    </section>
  );
}
