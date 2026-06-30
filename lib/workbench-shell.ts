import type { ProjectWorkspaceStage } from './project-workspace';

export type ProjectSyncState = 'idle' | 'syncing' | 'synced' | 'localOnly' | 'error';

export type WorkbenchStageId =
  | 'idea'
  | 'diagnosis'
  | 'directorKit'
  | 'execution'
  | 'feedback'
  | 'archive';

export type WorkbenchStage = {
  id: WorkbenchStageId;
  label: string;
  done: boolean;
  active: boolean;
  blocked?: boolean;
  value?: string;
};

export type ProjectSyncDisplay = {
  label: string;
  tone: 'neutral' | 'loading' | 'success' | 'warning' | 'error';
  blocked: boolean;
};

export type ProjectShellSummary = {
  title: string;
  stageLabel: string;
  targetDuration: string;
  targetTypeLabel: string;
  shotProgressLabel: string;
  healthLabel: string;
  primaryActionLabel: string;
  primaryActionDisabled: boolean;
};

export type WorkbenchShellInput = {
  creativeInput: string;
  persistedStage: ProjectWorkspaceStage;
  targetDuration: string;
  targetTypeLabel: string;
  hasDirectorKit: boolean;
  hasSelectedVersion: boolean;
  trackedShotCount: number;
  completedShotCount: number;
  feedbackTotal: number;
  analyticsOpen: boolean;
  feasibilityScore?: number | null;
  isGenerating: boolean;
  inputError?: string;
};

function clampCount(value: number) {
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
}

export function deriveProjectSyncDisplay(syncState: ProjectSyncState): ProjectSyncDisplay {
  if (syncState === 'syncing') {
    return { label: '云端同步中', tone: 'loading', blocked: false };
  }
  if (syncState === 'synced') {
    return { label: '云端已同步', tone: 'success', blocked: false };
  }
  if (syncState === 'localOnly') {
    return { label: '本地已保存，云端待上线', tone: 'warning', blocked: false };
  }
  if (syncState === 'error') {
    return { label: '云端同步失败', tone: 'warning', blocked: true };
  }
  return { label: '本地优先', tone: 'neutral', blocked: false };
}

export function deriveWorkbenchStages(input: WorkbenchShellInput): WorkbenchStage[] {
  const trackedShotCount = clampCount(input.trackedShotCount);
  const completedShotCount = Math.min(clampCount(input.completedShotCount), trackedShotCount);
  const hasInput = input.creativeInput.trim().length > 0;
  const hasExecutionProgress = trackedShotCount > 0 && completedShotCount > 0;
  const allShotsCompleted = trackedShotCount > 0 && completedShotCount >= trackedShotCount;
  const hasFeedback = input.feedbackTotal > 0;

  const activeStage: WorkbenchStageId = input.analyticsOpen
    ? 'feedback'
    : input.persistedStage === 'input'
      ? 'idea'
      : input.persistedStage === 'diagnosis'
        ? 'diagnosis'
        : input.persistedStage === 'reconstruct'
          ? 'directorKit'
          : input.hasDirectorKit && allShotsCompleted
            ? 'archive'
          : hasExecutionProgress && !allShotsCompleted
            ? 'execution'
            : input.hasDirectorKit
              ? 'directorKit'
              : 'idea';

  return [
    {
      id: 'idea',
      label: 'Idea',
      done: hasInput,
      active: activeStage === 'idea',
    },
    {
      id: 'diagnosis',
      label: 'Diagnosis',
      done: input.hasDirectorKit,
      active: activeStage === 'diagnosis',
      blocked: !hasInput,
    },
    {
      id: 'directorKit',
      label: 'DirectorKit',
      done: input.hasSelectedVersion || input.hasDirectorKit,
      active: activeStage === 'directorKit',
      blocked: !input.hasDirectorKit,
    },
    {
      id: 'execution',
      label: 'Execution',
      done: allShotsCompleted,
      active: activeStage === 'execution',
      blocked: trackedShotCount === 0,
      value: trackedShotCount > 0 ? `${completedShotCount}/${trackedShotCount}` : '0/0',
    },
    {
      id: 'feedback',
      label: 'Feedback',
      done: hasFeedback,
      active: activeStage === 'feedback',
      blocked: !input.hasDirectorKit,
      value: hasFeedback ? `${input.feedbackTotal}` : '--',
    },
    {
      id: 'archive',
      label: 'Archive',
      done: input.hasDirectorKit && allShotsCompleted,
      active: activeStage === 'archive',
      blocked: !input.hasDirectorKit,
    },
  ];
}

export function deriveProjectShellSummary(input: WorkbenchShellInput): ProjectShellSummary {
  const title = input.creativeInput.trim().slice(0, 18) || '未命名短片';
  const stages = deriveWorkbenchStages(input);
  const activeStage = stages.find((stage) => stage.active) ?? stages[0];
  const trackedShotCount = clampCount(input.trackedShotCount);
  const completedShotCount = Math.min(clampCount(input.completedShotCount), trackedShotCount);
  const hasInputError = Boolean(input.inputError);
  const canSubmit = input.creativeInput.trim().length > 0 && !hasInputError && !input.isGenerating;
  const canEnterExecution = input.hasDirectorKit && trackedShotCount > 0;

  const primaryActionLabel = input.isGenerating
    ? '生成中...'
    : input.hasDirectorKit
      ? '进入执行视图'
      : '提交创意';

  return {
    title,
    stageLabel: activeStage.label,
    targetDuration: input.targetDuration,
    targetTypeLabel: input.targetTypeLabel,
    shotProgressLabel: trackedShotCount > 0 ? `${completedShotCount}/${trackedShotCount}` : '0/0',
    healthLabel: typeof input.feasibilityScore === 'number' ? `${input.feasibilityScore}` : '--',
    primaryActionLabel,
    primaryActionDisabled: input.hasDirectorKit ? !canEnterExecution : !canSubmit,
  };
}
