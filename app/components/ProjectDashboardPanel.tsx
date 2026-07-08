'use client';

import { useMemo, useState } from 'react';
import { DIRECTOR_KIT_TARGET_TYPES } from '@/lib/director-kit-contract';
import type { LocalProjectWorkspaceSummary, ProjectWorkspaceStage } from '@/lib/project-workspace';

type ProjectDashboardPanelProps = {
  open: boolean;
  projects: LocalProjectWorkspaceSummary[];
  activeProjectId: string | null;
  onOpenProject: (projectId: string) => void;
  onDeleteProject: (projectId: string) => void;
  onClose: () => void;
};

const STAGE_LABELS: Record<ProjectWorkspaceStage, string> = {
  input: 'Draft',
  diagnosis: 'Diagnosed',
  reconstruct: 'Versions',
  result: 'DirectorKit Ready',
};

const STAGE_OPTIONS: Array<{ id: 'all' | ProjectWorkspaceStage; label: string }> = [
  { id: 'all', label: '全部' },
  { id: 'input', label: 'Draft' },
  { id: 'diagnosis', label: 'Diagnosed' },
  { id: 'reconstruct', label: 'Versions' },
  { id: 'result', label: 'Ready' },
];

const CALIBRATION_OUTCOME_LABELS: Record<NonNullable<LocalProjectWorkspaceSummary['latestCalibrationOutcome']>, string> = {
  validated: '通过',
  rejected: '未通过',
  inconclusive: '不确定',
};

function getHandoffLabel(project: LocalProjectWorkspaceSummary) {
  return project.handoffReady ? '可交接' : project.handoffBlockingIssueCount > 0 ? `缺 ${project.handoffBlockingIssueCount} 项` : '--';
}

function formatProjectTime(updatedAt: string) {
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(updatedAt));
}

function getTargetTypeLabel(targetType: string) {
  return DIRECTOR_KIT_TARGET_TYPES.find((type) => type.id === targetType)?.label ?? targetType;
}

export function ProjectDashboardPanel({
  open,
  projects,
  activeProjectId,
  onOpenProject,
  onDeleteProject,
  onClose,
}: ProjectDashboardPanelProps) {
  const [query, setQuery] = useState('');
  const [stageFilter, setStageFilter] = useState<'all' | ProjectWorkspaceStage>('all');

  const filteredProjects = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return projects.filter((project) => {
      const matchesQuery =
        !normalizedQuery ||
        project.title.toLowerCase().includes(normalizedQuery) ||
        getTargetTypeLabel(project.targetType).toLowerCase().includes(normalizedQuery) ||
        (project.latestIterationFocus ?? '').toLowerCase().includes(normalizedQuery) ||
        (project.latestCalibrationPlatform ?? '').toLowerCase().includes(normalizedQuery) ||
        getHandoffLabel(project).toLowerCase().includes(normalizedQuery);
      const matchesStage = stageFilter === 'all' || project.stage === stageFilter;
      return matchesQuery && matchesStage;
    });
  }, [projects, query, stageFilter]);

  const totalShots = projects.reduce((total, project) => total + project.shotCount, 0);
  const completedShots = projects.reduce((total, project) => total + project.completedShotCount, 0);
  const readyProjects = projects.filter((project) => project.stage === 'result').length;
  const totalIterations = projects.reduce((total, project) => total + project.iterationCount, 0);
  const totalCalibrations = projects.reduce((total, project) => total + project.calibrationCount, 0);
  const handoffReadyProjects = projects.filter((project) => project.handoffReady).length;

  if (!open) return null;

  return (
    <section
      aria-label="项目仪表盘"
      className="mb-4 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900"
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-400">Project Dashboard</p>
          <h2 className="mt-1 text-base font-semibold text-gray-950 dark:text-gray-50">项目仪表盘</h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="self-start rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          收起
        </button>
      </div>

      <div className="mt-4 grid gap-2 text-xs sm:grid-cols-6">
        <div className="rounded-md bg-gray-50 p-3 dark:bg-gray-800/70">
          <p className="text-[10px] text-gray-400">Projects</p>
          <p className="mt-1 text-lg font-semibold tabular-nums text-gray-900 dark:text-gray-100">{projects.length}</p>
        </div>
        <div className="rounded-md bg-gray-50 p-3 dark:bg-gray-800/70">
          <p className="text-[10px] text-gray-400">Ready</p>
          <p className="mt-1 text-lg font-semibold tabular-nums text-gray-900 dark:text-gray-100">{readyProjects}</p>
        </div>
        <div className="rounded-md bg-gray-50 p-3 dark:bg-gray-800/70">
          <p className="text-[10px] text-gray-400">Shot Progress</p>
          <p className="mt-1 text-lg font-semibold tabular-nums text-gray-900 dark:text-gray-100">
            {completedShots}/{totalShots}
          </p>
        </div>
        <div className="rounded-md bg-gray-50 p-3 dark:bg-gray-800/70">
          <p className="text-[10px] text-gray-400">Revisions</p>
          <p className="mt-1 text-lg font-semibold tabular-nums text-gray-900 dark:text-gray-100">{totalIterations}</p>
        </div>
        <div className="rounded-md bg-gray-50 p-3 dark:bg-gray-800/70">
          <p className="text-[10px] text-gray-400">Calibrations</p>
          <p className="mt-1 text-lg font-semibold tabular-nums text-gray-900 dark:text-gray-100">{totalCalibrations}</p>
        </div>
        <div className="rounded-md bg-gray-50 p-3 dark:bg-gray-800/70">
          <p className="text-[10px] text-gray-400">Handoff</p>
          <p className="mt-1 text-lg font-semibold tabular-nums text-gray-900 dark:text-gray-100">{handoffReadyProjects}</p>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="搜索项目标题或类型"
          className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition-colors focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:focus:ring-emerald-950 lg:max-w-xs"
        />
        <div className="flex flex-wrap gap-1.5">
          {STAGE_OPTIONS.map((stage) => (
            <button
              key={stage.id}
              type="button"
              onClick={() => setStageFilter(stage.id)}
              className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
                stageFilter === stage.id
                  ? 'bg-gray-950 text-white dark:bg-gray-100 dark:text-gray-950'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
              }`}
            >
              {stage.label}
            </button>
          ))}
        </div>
      </div>

      {filteredProjects.length > 0 ? (
        <div className="mt-4 overflow-hidden rounded-md border border-gray-200 dark:border-gray-800">
          <div className="hidden grid-cols-[minmax(0,1.5fr)_110px_100px_80px_80px_110px_100px_100px] gap-3 border-b border-gray-200 bg-gray-50 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-400 dark:border-gray-800 dark:bg-gray-950 lg:grid">
            <span>Project</span>
            <span>Stage</span>
            <span>Type</span>
            <span>Progress</span>
            <span>Revision</span>
            <span>Calibration</span>
            <span>Handoff</span>
            <span>Updated</span>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-gray-800">
            {filteredProjects.map((project) => (
              <div
                key={project.id}
                className={`grid gap-3 px-3 py-3 lg:grid-cols-[minmax(0,1.5fr)_110px_100px_80px_80px_110px_100px_100px] lg:items-center ${
                  activeProjectId === project.id ? 'bg-emerald-50/70 dark:bg-emerald-950/20' : 'bg-white dark:bg-gray-900'
                }`}
              >
                <div className="min-w-0">
                  <button
                    type="button"
                    onClick={() => onOpenProject(project.id)}
                    className="block w-full truncate text-left text-sm font-semibold text-gray-900 hover:text-emerald-700 dark:text-gray-100 dark:hover:text-emerald-300"
                  >
                    {project.title}
                  </button>
                  <p className="mt-1 text-[11px] text-gray-400 lg:hidden">
                    {STAGE_LABELS[project.stage]} · {getTargetTypeLabel(project.targetType)} · {formatProjectTime(project.updatedAt)}
                  </p>
                  {project.latestIterationFocus && (
                    <p className="mt-1 truncate text-[11px] text-emerald-700 dark:text-emerald-300">
                      最近改写：{project.latestIterationFocus}
                    </p>
                  )}
                  {project.latestCalibrationPlatform && project.latestCalibrationOutcome && (
                    <p className="mt-1 truncate text-[11px] text-cyan-700 dark:text-cyan-300">
                      最近校准：{project.latestCalibrationPlatform} · {CALIBRATION_OUTCOME_LABELS[project.latestCalibrationOutcome]}
                    </p>
                  )}
                  <p className={`mt-1 truncate text-[11px] ${project.handoffReady ? 'text-emerald-700 dark:text-emerald-300' : 'text-amber-700 dark:text-amber-300'}`}>
                    交接状态：{getHandoffLabel(project)}
                  </p>
                </div>
                <span className="hidden text-xs font-medium text-gray-600 dark:text-gray-300 lg:block">
                  {STAGE_LABELS[project.stage]}
                </span>
                <span className="hidden text-xs text-gray-500 dark:text-gray-400 lg:block">
                  {project.targetDuration} · {getTargetTypeLabel(project.targetType)}
                </span>
                <span className="text-xs tabular-nums text-gray-600 dark:text-gray-300">
                  {project.shotCount ? `${project.completedShotCount}/${project.shotCount}` : '--'}
                </span>
                <span className="text-xs tabular-nums text-gray-600 dark:text-gray-300">
                  {project.iterationCount ? `${project.iterationCount} 轮` : '--'}
                </span>
                <span className="text-xs tabular-nums text-gray-600 dark:text-gray-300">
                  {project.calibrationCount
                    ? `${project.calibrationCount} 次${project.latestCalibrationOutcome ? ` · ${CALIBRATION_OUTCOME_LABELS[project.latestCalibrationOutcome]}` : ''}`
                    : '--'}
                </span>
                <span className={`text-xs font-medium tabular-nums ${project.handoffReady ? 'text-emerald-700 dark:text-emerald-300' : 'text-amber-700 dark:text-amber-300'}`}>
                  {getHandoffLabel(project)}
                </span>
                <div className="flex items-center justify-between gap-3">
                  <span className="hidden text-xs text-gray-500 dark:text-gray-400 lg:block">
                    {formatProjectTime(project.updatedAt)}
                  </span>
                  <button
                    type="button"
                    onClick={() => onDeleteProject(project.id)}
                    className="text-xs font-medium text-gray-400 transition-colors hover:text-red-500"
                  >
                    删除
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="mt-4 rounded-md border border-dashed border-gray-200 p-6 text-center dark:border-gray-700">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">没有匹配项目</p>
          <p className="mt-1 text-xs text-gray-400">保存项目后可以在这里检索和继续创作。</p>
        </div>
      )}
    </section>
  );
}
