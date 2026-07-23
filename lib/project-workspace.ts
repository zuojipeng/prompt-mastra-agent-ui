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
import type { ProvenanceTransportMode } from './provenance-http-client';
import type { ProvenanceRun } from './provenance-run-contract';

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

export type ProjectProvenanceReceipt = {
  shotId: number;
  mode: ProvenanceTransportMode;
  provider: string;
  model: string;
  attempt: number;
  parentJobId: string | null;
  assetSha256: string;
  manifestHash: string;
  verifiedAt: string;
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
  iterations?: ProjectWorkspaceIteration[];
  platformCalibrations?: PlatformCalibrationEvidence[];
  provenanceReceipts?: Record<number, ProjectProvenanceReceipt>;
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
  | 'provenanceReceipts'
>;

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
const PROVENANCE_MODES: ProvenanceTransportMode[] = ['fixture', 'local', 'preview'];
const PROVENANCE_RECEIPT_KEYS = [
  'shotId',
  'mode',
  'provider',
  'model',
  'attempt',
  'parentJobId',
  'assetSha256',
  'manifestHash',
  'verifiedAt',
] as const;

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

function isProjectProvenanceReceipt(value: unknown): value is ProjectProvenanceReceipt {
  if (!isRecord(value)) return false;
  const keys = Object.keys(value).sort();
  const expectedKeys = [...PROVENANCE_RECEIPT_KEYS].sort();
  return (
    keys.length === expectedKeys.length
    && keys.every((key, index) => key === expectedKeys[index])
    && typeof value.shotId === 'number'
    && Number.isInteger(value.shotId)
    && value.shotId > 0
    && PROVENANCE_MODES.includes(value.mode as ProvenanceTransportMode)
    && typeof value.provider === 'string'
    && value.provider.length > 0
    && typeof value.model === 'string'
    && value.model.length > 0
    && typeof value.attempt === 'number'
    && Number.isInteger(value.attempt)
    && value.attempt > 0
    && (value.parentJobId === null || (typeof value.parentJobId === 'string' && value.parentJobId.length > 0))
    && typeof value.assetSha256 === 'string'
    && /^[a-f0-9]{64}$/.test(value.assetSha256)
    && typeof value.manifestHash === 'string'
    && /^[a-f0-9]{64}$/.test(value.manifestHash)
    && typeof value.verifiedAt === 'string'
    && !Number.isNaN(Date.parse(value.verifiedAt))
  );
}

function isProjectProvenanceReceiptRecord(
  value: unknown,
): value is Record<number, ProjectProvenanceReceipt> {
  if (!isRecord(value)) return false;
  return Object.entries(value).every(([shotId, receipt]) => (
    /^\d+$/.test(shotId)
    && isProjectProvenanceReceipt(receipt)
    && receipt.shotId === Number(shotId)
  ));
}

function normalizeProvenanceReceipts(value: unknown): Record<number, ProjectProvenanceReceipt> {
  return isProjectProvenanceReceiptRecord(value) ? value : {};
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
  const handoffBlockingReasons = shotCards.flatMap((card) => {
    const status = project.shotExecutionStatus[card.shotId] ?? 'pending';
    const resultNote = project.shotResultNotes[card.shotId]?.trim();
    if (status === 'pending') return [`镜头 ${card.shotId} 未执行`];
    if ((status === 'generated' || status === 'usable') && !resultNote) {
      return [`镜头 ${card.shotId} 缺素材链接或结果备注`];
    }
    if (status === 'failed' && !resultNote) return [`镜头 ${card.shotId} 缺失败原因`];
    return [];
  });
  const handoffBlockingIssueCount = handoffBlockingReasons.length;

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
    handoffReady: shotCards.length > 0 && handoffBlockingIssueCount === 0,
    handoffBlockingIssueCount,
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

export function createProjectProvenanceReceipt(
  mode: ProvenanceTransportMode,
  run: ProvenanceRun,
): ProjectProvenanceReceipt | null {
  if (run.status !== 'succeeded' || !run.result) return null;
  return {
    shotId: run.shot_id,
    mode,
    provider: run.provider,
    model: run.model,
    attempt: run.attempt,
    parentJobId: run.parent_job_id,
    assetSha256: run.result.asset.sha256,
    manifestHash: run.result.manifest.canonical_hash,
    verifiedAt: run.updated_at,
  };
}

export function appendProjectProvenanceReceipt(
  workspace: LocalProjectWorkspace,
  receipt: ProjectProvenanceReceipt,
): LocalProjectWorkspace {
  return {
    ...workspace,
    updatedAt: receipt.verifiedAt,
    provenanceReceipts: {
      ...(workspace.provenanceReceipts ?? {}),
      [receipt.shotId]: receipt,
    },
  };
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
    iterations: normalizeIterations(existing?.iterations),
    platformCalibrations: normalizePlatformCalibrations(existing?.platformCalibrations),
    provenanceReceipts: normalizeProvenanceReceipts(
      input.provenanceReceipts ?? existing?.provenanceReceipts,
    ),
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
    (value.iterations === undefined ||
      (Array.isArray(value.iterations) && value.iterations.every(isProjectWorkspaceIteration))) &&
    (value.platformCalibrations === undefined ||
      (Array.isArray(value.platformCalibrations) && value.platformCalibrations.every(isPlatformCalibrationEvidence))) &&
    (value.provenanceReceipts === undefined || isProjectProvenanceReceiptRecord(value.provenanceReceipts))
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
