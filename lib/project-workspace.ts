import type {
  DirectorKit,
  DirectorKitTargetDuration,
  DirectorKitTargetType,
} from './director-kit-contract';
import {
  DIRECTOR_KIT_TARGET_DURATIONS,
  DIRECTOR_KIT_TARGET_TYPES,
} from './director-kit-contract';
import type { ShotExecutionStatus } from './director-kit-export';
import { deriveShotHandoffReadiness } from './handoff-readiness';

export const LOCAL_PROJECT_WORKSPACE_KEY = 'jingci-current-project';
export const LOCAL_PROJECT_WORKSPACE_LIBRARY_KEY = 'jingci-project-library';
export const LOCAL_PROJECT_WORKSPACE_SCHEMA_VERSION = 1;
export const LOCAL_PROJECT_WORKSPACE_LIBRARY_LIMIT = 12;

export type ProjectWorkspaceStage = 'input' | 'diagnosis' | 'reconstruct' | 'result';

export type ProjectWorkspaceIterationSource = 'feedback_next_action' | 'manual';

export type ProjectWorkspaceIteration = {
  id: string;
  title: string;
  createdAt: string;
  source: ProjectWorkspaceIterationSource;
  focus: string;
  sourcePrompt: string;
  promptDraft: string;
  evidence: string;
};

export type ProjectWorkspaceIterationDigest = {
  sourceLabel: string;
  sourceLength: number;
  draftLength: number;
  deltaLength: number;
};

export type PlatformCalibrationOutcome = 'validated' | 'rejected' | 'inconclusive';

export type PlatformCalibrationNextAction = 'expand_full_queue' | 'retry_same' | 'revise_prompt' | 'skip_platform';

export type PlatformCalibrationEvidence = {
  id: string;
  createdAt: string;
  platform: string;
  capabilityProfileId: string;
  shotId: number;
  outcome: PlatformCalibrationOutcome;
  resultNote: string;
  failureReasons: string[];
  reusableSettings: string;
  materialLink: string;
  nextAction: PlatformCalibrationNextAction;
};

export type ShotGenerationAttemptStatus = Exclude<ShotExecutionStatus, 'pending'>;

export type ShotGenerationAttempt = {
  id: string;
  createdAt: string;
  shotId: number;
  source: 'manual';
  provider: string;
  model: string;
  status: ShotGenerationAttemptStatus;
  assetRef: string;
  note: string;
  costUsd: number | null;
  durationSeconds: number | null;
};

export type ShotGenerationAttemptInput = Omit<ShotGenerationAttempt, 'id' | 'createdAt' | 'source'>;

export type ShotApprovalReceipt = {
  id: string;
  approvedAt: string;
  shotId: number;
  attemptId: string;
  provider: string;
  model: string;
  assetRef: string;
  decisionNote: string;
  evidenceKind: 'human_approval';
};

export type LocalProjectWorkspace = {
  schemaVersion: typeof LOCAL_PROJECT_WORKSPACE_SCHEMA_VERSION;
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  creativeInput: string;
  targetDuration: DirectorKitTargetDuration;
  targetType: DirectorKitTargetType;
  v2State: ProjectWorkspaceStage;
  directorKit: DirectorKit | null;
  selectedVersionIndex: number | null;
  selectedShotId: number | null;
  shotExecutionStatus: Record<number, ShotExecutionStatus>;
  shotResultNotes: Record<number, string>;
  shotAttempts?: Record<number, ShotGenerationAttempt[]>;
  selectedShotAttemptIds?: Record<number, string>;
  shotApprovalReceipts?: Record<number, ShotApprovalReceipt>;
  iterations?: ProjectWorkspaceIteration[];
  platformCalibrations?: PlatformCalibrationEvidence[];
};

export type LocalProjectWorkspaceSummary = {
  id: string;
  title: string;
  updatedAt: string;
  targetDuration: DirectorKitTargetDuration;
  targetType: DirectorKitTargetType;
  stage: ProjectWorkspaceStage;
  shotCount: number;
  completedShotCount: number;
  iterationCount: number;
  latestIterationFocus: string | null;
  calibrationCount: number;
  latestCalibrationOutcome: PlatformCalibrationOutcome | null;
  latestCalibrationPlatform: string | null;
  selectedAttemptCount: number;
  latestSelectedAttemptProvider: string | null;
  latestSelectedAttemptModel: string | null;
  latestSelectedAttemptStatus: ShotGenerationAttemptStatus | null;
  handoffReady: boolean;
  handoffBlockingIssueCount: number;
  handoffBlockingReasons: string[];
};

export type LocalProjectWorkspaceInput = Pick<
  LocalProjectWorkspace,
  | 'creativeInput'
  | 'targetDuration'
  | 'targetType'
  | 'v2State'
  | 'directorKit'
  | 'selectedVersionIndex'
  | 'selectedShotId'
  | 'shotExecutionStatus'
  | 'shotResultNotes'
> & Pick<LocalProjectWorkspace, 'shotAttempts' | 'selectedShotAttemptIds' | 'shotApprovalReceipts'>;

type WorkspaceStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

const WORKSPACE_STAGES: ProjectWorkspaceStage[] = ['input', 'diagnosis', 'reconstruct', 'result'];
const SHOT_STATUS_VALUES: ShotExecutionStatus[] = ['pending', 'generated', 'failed', 'usable'];
const ITERATION_SOURCE_VALUES: ProjectWorkspaceIterationSource[] = ['feedback_next_action', 'manual'];
const CALIBRATION_OUTCOME_VALUES: PlatformCalibrationOutcome[] = ['validated', 'rejected', 'inconclusive'];
const CALIBRATION_NEXT_ACTION_VALUES: PlatformCalibrationNextAction[] = [
  'expand_full_queue',
  'retry_same',
  'revise_prompt',
  'skip_platform',
];
const PROJECT_ITERATION_LIMIT = 8;
const PLATFORM_CALIBRATION_LIMIT = 12;
const SHOT_ATTEMPT_LIMIT = 8;

function getBrowserStorage() {
  if (typeof window === 'undefined') return null;
  return window.localStorage;
}

function createWorkspaceId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `local-${Date.now().toString(36)}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isTargetDuration(value: unknown): value is DirectorKitTargetDuration {
  return typeof value === 'string' && DIRECTOR_KIT_TARGET_DURATIONS.includes(value as DirectorKitTargetDuration);
}

function isTargetType(value: unknown): value is DirectorKitTargetType {
  return typeof value === 'string' && DIRECTOR_KIT_TARGET_TYPES.some((type) => type.id === value);
}

function isStage(value: unknown): value is ProjectWorkspaceStage {
  return typeof value === 'string' && WORKSPACE_STAGES.includes(value as ProjectWorkspaceStage);
}

function isNullableNumber(value: unknown): value is number | null {
  return value === null || typeof value === 'number';
}

function isShotExecutionStatusRecord(value: unknown): value is Record<number, ShotExecutionStatus> {
  if (!isRecord(value)) return false;
  return Object.values(value).every((status) => SHOT_STATUS_VALUES.includes(status as ShotExecutionStatus));
}

function isShotResultNotesRecord(value: unknown): value is Record<number, string> {
  if (!isRecord(value)) return false;
  return Object.values(value).every((note) => typeof note === 'string');
}

function isProjectWorkspaceIteration(value: unknown): value is ProjectWorkspaceIteration {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === 'string' &&
    typeof value.title === 'string' &&
    typeof value.createdAt === 'string' &&
    ITERATION_SOURCE_VALUES.includes(value.source as ProjectWorkspaceIterationSource) &&
    typeof value.focus === 'string' &&
    typeof value.sourcePrompt === 'string' &&
    typeof value.promptDraft === 'string' &&
    typeof value.evidence === 'string'
  );
}

function normalizeIterations(value: unknown): ProjectWorkspaceIteration[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isProjectWorkspaceIteration).slice(0, PROJECT_ITERATION_LIMIT);
}

function isPlatformCalibrationEvidence(value: unknown): value is PlatformCalibrationEvidence {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === 'string' &&
    typeof value.createdAt === 'string' &&
    typeof value.platform === 'string' &&
    typeof value.capabilityProfileId === 'string' &&
    typeof value.shotId === 'number' &&
    CALIBRATION_OUTCOME_VALUES.includes(value.outcome as PlatformCalibrationOutcome) &&
    typeof value.resultNote === 'string' &&
    Array.isArray(value.failureReasons) &&
    value.failureReasons.every((reason) => typeof reason === 'string') &&
    typeof value.reusableSettings === 'string' &&
    typeof value.materialLink === 'string' &&
    CALIBRATION_NEXT_ACTION_VALUES.includes(value.nextAction as PlatformCalibrationNextAction)
  );
}

function normalizePlatformCalibrations(value: unknown): PlatformCalibrationEvidence[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isPlatformCalibrationEvidence).slice(0, PLATFORM_CALIBRATION_LIMIT);
}

function isNullableNonNegativeNumber(value: unknown): value is number | null {
  return value === null || (typeof value === 'number' && Number.isFinite(value) && value >= 0);
}

function isShotGenerationAttempt(value: unknown): value is ShotGenerationAttempt {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === 'string' &&
    typeof value.createdAt === 'string' &&
    typeof value.shotId === 'number' &&
    value.source === 'manual' &&
    typeof value.provider === 'string' &&
    typeof value.model === 'string' &&
    ['generated', 'failed', 'usable'].includes(value.status as ShotGenerationAttemptStatus) &&
    typeof value.assetRef === 'string' &&
    typeof value.note === 'string' &&
    isNullableNonNegativeNumber(value.costUsd) &&
    isNullableNonNegativeNumber(value.durationSeconds)
  );
}

function normalizeShotAttempts(value: unknown): Record<number, ShotGenerationAttempt[]> {
  if (!isRecord(value)) return {};
  return Object.fromEntries(
    Object.entries(value).flatMap(([shotId, attempts]) => {
      const parsedShotId = Number(shotId);
      if (!Number.isInteger(parsedShotId) || parsedShotId < 1 || !Array.isArray(attempts)) return [];
      const valid = attempts
        .filter((attempt) => isShotGenerationAttempt(attempt) && attempt.shotId === parsedShotId)
        .slice(0, SHOT_ATTEMPT_LIMIT);
      return valid.length > 0 ? [[parsedShotId, valid]] : [];
    }),
  );
}

function isShotAttemptsRecord(value: unknown) {
  if (!isRecord(value)) return false;
  return Object.entries(value).every(
    ([shotId, attempts]) => {
      const parsedShotId = Number(shotId);
      return Number.isInteger(parsedShotId) &&
        parsedShotId > 0 &&
        Array.isArray(attempts) &&
        attempts.length <= SHOT_ATTEMPT_LIMIT &&
        attempts.every((attempt) => isShotGenerationAttempt(attempt) && attempt.shotId === parsedShotId);
    },
  );
}

function isStringRecord(value: unknown): value is Record<number, string> {
  if (!isRecord(value)) return false;
  return Object.values(value).every((entry) => typeof entry === 'string');
}

function isShotApprovalReceipt(value: unknown): value is ShotApprovalReceipt {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === 'string' &&
    typeof value.approvedAt === 'string' &&
    !Number.isNaN(Date.parse(value.approvedAt)) &&
    Number.isInteger(value.shotId) &&
    (value.shotId as number) > 0 &&
    typeof value.attemptId === 'string' &&
    typeof value.provider === 'string' && value.provider.trim().length > 0 &&
    typeof value.model === 'string' && value.model.trim().length > 0 &&
    typeof value.assetRef === 'string' && value.assetRef.trim().length > 0 &&
    typeof value.decisionNote === 'string' && value.decisionNote.trim().length > 0 &&
    value.evidenceKind === 'human_approval'
  );
}

function normalizeShotApprovalReceipts(value: unknown): Record<number, ShotApprovalReceipt> {
  if (!isRecord(value)) return {};
  return Object.fromEntries(
    Object.entries(value).flatMap(([shotId, receipt]) => {
      const parsedShotId = Number(shotId);
      return Number.isInteger(parsedShotId) &&
        parsedShotId > 0 &&
        isShotApprovalReceipt(receipt) &&
        receipt.shotId === parsedShotId
        ? [[parsedShotId, receipt]]
        : [];
    }),
  );
}

function isShotApprovalReceiptRecord(value: unknown) {
  if (!isRecord(value)) return false;
  return Object.entries(value).every(([shotId, receipt]) => {
    const parsedShotId = Number(shotId);
    return Number.isInteger(parsedShotId) &&
      parsedShotId > 0 &&
      isShotApprovalReceipt(receipt) &&
      receipt.shotId === parsedShotId;
  });
}

function isDirectorKit(value: unknown): value is DirectorKit {
  if (value === null) return false;
  if (!isRecord(value)) return false;
  return Array.isArray(value.shotCards) && typeof value.masterPrompt === 'string';
}

function sortByUpdatedAtDesc(projects: LocalProjectWorkspace[]) {
  return [...projects].sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
}

function readWorkspaceLibrary(storage: WorkspaceStorage) {
  const raw = storage.getItem(LOCAL_PROJECT_WORKSPACE_LIBRARY_KEY);
  if (!raw) return [];

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed) || parsed.schemaVersion !== LOCAL_PROJECT_WORKSPACE_SCHEMA_VERSION) {
      return [];
    }
    const projects = Array.isArray(parsed.projects) ? parsed.projects : [];
    return sortByUpdatedAtDesc(projects.filter(isLocalProjectWorkspace));
  } catch {
    return [];
  }
}

function writeWorkspaceLibrary(projects: LocalProjectWorkspace[], storage: WorkspaceStorage) {
  storage.setItem(
    LOCAL_PROJECT_WORKSPACE_LIBRARY_KEY,
    JSON.stringify({
      schemaVersion: LOCAL_PROJECT_WORKSPACE_SCHEMA_VERSION,
      projects: sortByUpdatedAtDesc(projects).slice(0, LOCAL_PROJECT_WORKSPACE_LIBRARY_LIMIT),
    }),
  );
}

function summarizeWorkspace(project: LocalProjectWorkspace): LocalProjectWorkspaceSummary {
  const shotCards = project.directorKit?.shotCards ?? [];
  const completedShotCount = shotCards.reduce((count, card) => {
    const status = project.shotExecutionStatus[card.shotId] ?? 'pending';
    return status === 'pending' ? count : count + 1;
  }, 0);
  const handoff = deriveShotHandoffReadiness({
    shotIds: shotCards.map((card) => card.shotId),
    shotExecutionStatus: project.shotExecutionStatus,
    shotResultNotes: project.shotResultNotes,
    selectedShotAttemptIds: project.selectedShotAttemptIds,
    shotApprovalReceipts: project.shotApprovalReceipts,
  });
  const handoffBlockingReasons = [
    ...handoff.pendingShotIds.map((shotId) => `镜头 ${shotId} 未执行`),
    ...handoff.missingEvidenceShotIds.map((shotId) => `镜头 ${shotId} 缺素材链接或结果备注`),
    ...handoff.failedWithoutReasonShotIds.map((shotId) => `镜头 ${shotId} 缺失败原因`),
    ...handoff.unapprovedUsableShotIds.map((shotId) => `镜头 ${shotId} 缺交付审批`),
  ];
  const selectedAttempts = Object.entries(project.selectedShotAttemptIds ?? {}).flatMap(([shotId, selectedId]) => {
    const selected = project.shotAttempts?.[Number(shotId)]?.find((attempt) => attempt.id === selectedId);
    return selected ? [selected] : [];
  });
  const latestSelectedAttempt = selectedAttempts.reduce<ShotGenerationAttempt | null>((latest, attempt) => {
    if (!latest) return attempt;
    return Date.parse(attempt.createdAt) > Date.parse(latest.createdAt) ? attempt : latest;
  }, null);

  return {
    id: project.id,
    title: project.title,
    updatedAt: project.updatedAt,
    targetDuration: project.targetDuration,
    targetType: project.targetType,
    stage: project.v2State,
    shotCount: shotCards.length,
    completedShotCount,
    iterationCount: project.iterations?.length ?? 0,
    latestIterationFocus: project.iterations?.[0]?.focus ?? null,
    calibrationCount: project.platformCalibrations?.length ?? 0,
    latestCalibrationOutcome: project.platformCalibrations?.[0]?.outcome ?? null,
    latestCalibrationPlatform: project.platformCalibrations?.[0]?.platform ?? null,
    selectedAttemptCount: selectedAttempts.length,
    latestSelectedAttemptProvider: latestSelectedAttempt?.provider ?? null,
    latestSelectedAttemptModel: latestSelectedAttempt?.model ?? null,
    latestSelectedAttemptStatus: latestSelectedAttempt?.status ?? null,
    handoffReady: handoff.ready,
    handoffBlockingIssueCount: handoff.blockingIssueCount,
    handoffBlockingReasons,
  };
}

export function deriveProjectTitle(input: string) {
  const compact = input.trim().replace(/\s+/g, ' ');
  return compact ? compact.slice(0, 28) : '未命名项目';
}

export function createProjectWorkspaceIteration(
  input: Omit<ProjectWorkspaceIteration, 'id' | 'createdAt' | 'title'> & { title?: string },
  now = new Date().toISOString(),
): ProjectWorkspaceIteration {
  return {
    id: createWorkspaceId(),
    title: input.title?.trim() || `${input.focus} 改写`,
    createdAt: now,
    source: input.source,
    focus: input.focus,
    sourcePrompt: input.sourcePrompt,
    promptDraft: input.promptDraft,
    evidence: input.evidence,
  };
}

export function deriveProjectWorkspaceIterationDigest(
  iteration: ProjectWorkspaceIteration,
): ProjectWorkspaceIterationDigest {
  const sourceLabels: Record<ProjectWorkspaceIterationSource, string> = {
    feedback_next_action: '反馈改写',
    manual: '手动迭代',
  };
  const sourceLength = iteration.sourcePrompt.trim().length;
  const draftLength = iteration.promptDraft.trim().length;

  return {
    sourceLabel: sourceLabels[iteration.source],
    sourceLength,
    draftLength,
    deltaLength: draftLength - sourceLength,
  };
}

export function appendProjectWorkspaceIteration(
  workspace: LocalProjectWorkspace,
  iteration: ProjectWorkspaceIteration,
): LocalProjectWorkspace {
  return {
    ...workspace,
    creativeInput: iteration.promptDraft,
    title: deriveProjectTitle(iteration.promptDraft),
    updatedAt: iteration.createdAt,
    v2State: 'input',
    iterations: [iteration, ...(workspace.iterations ?? [])].slice(0, PROJECT_ITERATION_LIMIT),
  };
}

export function createPlatformCalibrationEvidence(
  input: Omit<PlatformCalibrationEvidence, 'id' | 'createdAt'>,
  now = new Date().toISOString(),
): PlatformCalibrationEvidence {
  return {
    id: createWorkspaceId(),
    createdAt: now,
    platform: input.platform,
    capabilityProfileId: input.capabilityProfileId,
    shotId: input.shotId,
    outcome: input.outcome,
    resultNote: input.resultNote,
    failureReasons: input.failureReasons,
    reusableSettings: input.reusableSettings,
    materialLink: input.materialLink,
    nextAction: input.nextAction,
  };
}

export function appendPlatformCalibrationEvidence(
  workspace: LocalProjectWorkspace,
  calibration: PlatformCalibrationEvidence,
): LocalProjectWorkspace {
  return {
    ...workspace,
    updatedAt: calibration.createdAt,
    platformCalibrations: [calibration, ...(workspace.platformCalibrations ?? [])].slice(0, PLATFORM_CALIBRATION_LIMIT),
  };
}

export function createShotGenerationAttempt(
  input: ShotGenerationAttemptInput,
  now = new Date().toISOString(),
): ShotGenerationAttempt {
  const provider = input.provider.trim();
  const model = input.model.trim();
  const assetRef = input.assetRef.trim();
  const note = input.note.trim();
  if (!Number.isInteger(input.shotId) || input.shotId < 1) throw new Error('镜头编号无效');
  if (!provider) throw new Error('请填写生成平台');
  if (!model) throw new Error('请填写模型或版本');
  if (input.status === 'failed' && !note) throw new Error('失败尝试需要填写失败原因');
  if (input.status !== 'failed' && !assetRef) throw new Error('成功尝试需要填写素材链接或文件名');
  if (!isNullableNonNegativeNumber(input.costUsd)) throw new Error('成本不能小于 0');
  if (!isNullableNonNegativeNumber(input.durationSeconds)) throw new Error('生成耗时不能小于 0');

  return {
    ...input,
    id: createWorkspaceId(),
    createdAt: now,
    source: 'manual',
    provider,
    model,
    assetRef,
    note,
  };
}

export function selectShotGenerationAttempt(
  workspace: LocalProjectWorkspace,
  shotId: number,
  attemptId: string,
  now = new Date().toISOString(),
): LocalProjectWorkspace {
  const attempt = workspace.shotAttempts?.[shotId]?.find((candidate) => candidate.id === attemptId);
  if (!attempt) return workspace;
  const resultNote = [attempt.assetRef, attempt.note].filter(Boolean).join(' · ');
  const shotApprovalReceipts = { ...workspace.shotApprovalReceipts };
  if (shotApprovalReceipts[shotId]?.attemptId !== attempt.id) {
    delete shotApprovalReceipts[shotId];
  }
  return {
    ...workspace,
    updatedAt: now,
    selectedShotAttemptIds: { ...workspace.selectedShotAttemptIds, [shotId]: attempt.id },
    shotApprovalReceipts,
    shotExecutionStatus: { ...workspace.shotExecutionStatus, [shotId]: attempt.status },
    shotResultNotes: { ...workspace.shotResultNotes, [shotId]: resultNote },
  };
}

export function approveSelectedShotAttempt(
  workspace: LocalProjectWorkspace,
  shotId: number,
  decisionNote: string,
  now = new Date().toISOString(),
): LocalProjectWorkspace {
  const selectedAttemptId = workspace.selectedShotAttemptIds?.[shotId];
  const attempt = workspace.shotAttempts?.[shotId]?.find((candidate) => candidate.id === selectedAttemptId);
  const normalizedDecisionNote = decisionNote.trim();

  if (!attempt) throw new Error('请先选择一个生成版本');
  if (attempt.status !== 'usable') throw new Error('只有标记为可用的版本才能批准交付');
  if (!attempt.assetRef.trim()) throw new Error('可交付版本需要素材引用');
  if (!normalizedDecisionNote) throw new Error('请填写交付审批说明');

  const receipt: ShotApprovalReceipt = {
    id: createWorkspaceId(),
    approvedAt: now,
    shotId,
    attemptId: attempt.id,
    provider: attempt.provider,
    model: attempt.model,
    assetRef: attempt.assetRef,
    decisionNote: normalizedDecisionNote,
    evidenceKind: 'human_approval',
  };

  return {
    ...workspace,
    updatedAt: now,
    shotApprovalReceipts: { ...workspace.shotApprovalReceipts, [shotId]: receipt },
  };
}

export function appendShotGenerationAttempt(
  workspace: LocalProjectWorkspace,
  attempt: ShotGenerationAttempt,
): LocalProjectWorkspace {
  const attempts = [attempt, ...(workspace.shotAttempts?.[attempt.shotId] ?? [])].slice(0, SHOT_ATTEMPT_LIMIT);
  return selectShotGenerationAttempt(
    {
      ...workspace,
      updatedAt: attempt.createdAt,
      shotAttempts: { ...workspace.shotAttempts, [attempt.shotId]: attempts },
    },
    attempt.shotId,
    attempt.id,
    attempt.createdAt,
  );
}

export function createLocalProjectWorkspace(
  input: LocalProjectWorkspaceInput,
  existing?: LocalProjectWorkspace | null,
  now = new Date().toISOString(),
): LocalProjectWorkspace {
  return {
    schemaVersion: LOCAL_PROJECT_WORKSPACE_SCHEMA_VERSION,
    id: existing?.id ?? createWorkspaceId(),
    title: deriveProjectTitle(input.creativeInput),
    ...input,
    shotAttempts: normalizeShotAttempts(input.shotAttempts ?? existing?.shotAttempts),
    selectedShotAttemptIds: isStringRecord(input.selectedShotAttemptIds)
      ? input.selectedShotAttemptIds
      : existing?.selectedShotAttemptIds ?? {},
    shotApprovalReceipts: normalizeShotApprovalReceipts(
      input.shotApprovalReceipts ?? existing?.shotApprovalReceipts,
    ),
    iterations: normalizeIterations(existing?.iterations),
    platformCalibrations: normalizePlatformCalibrations(existing?.platformCalibrations),
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
}

export function isLocalProjectWorkspace(value: unknown): value is LocalProjectWorkspace {
  if (!isRecord(value)) return false;
  return (
    value.schemaVersion === LOCAL_PROJECT_WORKSPACE_SCHEMA_VERSION &&
    typeof value.id === 'string' &&
    typeof value.title === 'string' &&
    typeof value.createdAt === 'string' &&
    typeof value.updatedAt === 'string' &&
    typeof value.creativeInput === 'string' &&
    isTargetDuration(value.targetDuration) &&
    isTargetType(value.targetType) &&
    isStage(value.v2State) &&
    (value.directorKit === null || isDirectorKit(value.directorKit)) &&
    isNullableNumber(value.selectedVersionIndex) &&
    isNullableNumber(value.selectedShotId) &&
    isShotExecutionStatusRecord(value.shotExecutionStatus) &&
    isShotResultNotesRecord(value.shotResultNotes) &&
    (value.shotAttempts === undefined || isShotAttemptsRecord(value.shotAttempts)) &&
    (value.selectedShotAttemptIds === undefined || isStringRecord(value.selectedShotAttemptIds)) &&
    (value.shotApprovalReceipts === undefined || isShotApprovalReceiptRecord(value.shotApprovalReceipts)) &&
    (value.iterations === undefined ||
      (Array.isArray(value.iterations) && value.iterations.every(isProjectWorkspaceIteration))) &&
    (value.platformCalibrations === undefined ||
      (Array.isArray(value.platformCalibrations) && value.platformCalibrations.every(isPlatformCalibrationEvidence)))
  );
}

export function saveLocalProjectWorkspace(
  workspace: LocalProjectWorkspace,
  storage: WorkspaceStorage | null = getBrowserStorage(),
) {
  if (!storage) return false;
  storage.setItem(LOCAL_PROJECT_WORKSPACE_KEY, JSON.stringify(workspace));
  const nextLibrary = [
    workspace,
    ...readWorkspaceLibrary(storage).filter((project) => project.id !== workspace.id),
  ];
  writeWorkspaceLibrary(nextLibrary, storage);
  return true;
}

export function loadLocalProjectWorkspace(storage: WorkspaceStorage | null = getBrowserStorage()) {
  if (!storage) return null;
  const raw = storage.getItem(LOCAL_PROJECT_WORKSPACE_KEY);
  if (!raw) return null;

  try {
    const parsed: unknown = JSON.parse(raw);
    return isLocalProjectWorkspace(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function clearLocalProjectWorkspace(storage: WorkspaceStorage | null = getBrowserStorage()) {
  if (!storage) return false;
  storage.removeItem(LOCAL_PROJECT_WORKSPACE_KEY);
  return true;
}

export function loadLocalProjectWorkspaceLibrary(storage: WorkspaceStorage | null = getBrowserStorage()) {
  if (!storage) return [];
  return readWorkspaceLibrary(storage);
}

export function loadLocalProjectWorkspaceSummaries(storage: WorkspaceStorage | null = getBrowserStorage()) {
  return loadLocalProjectWorkspaceLibrary(storage).map(summarizeWorkspace);
}

export function loadLocalProjectWorkspaceById(
  id: string,
  storage: WorkspaceStorage | null = getBrowserStorage(),
) {
  if (!storage) return null;
  return readWorkspaceLibrary(storage).find((project) => project.id === id) ?? null;
}

export function deleteLocalProjectWorkspace(
  id: string,
  storage: WorkspaceStorage | null = getBrowserStorage(),
) {
  if (!storage) return false;
  const nextLibrary = readWorkspaceLibrary(storage).filter((project) => project.id !== id);
  writeWorkspaceLibrary(nextLibrary, storage);

  const current = loadLocalProjectWorkspace(storage);
  if (current?.id === id) {
    storage.removeItem(LOCAL_PROJECT_WORKSPACE_KEY);
  }

  return true;
}
