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

export const LOCAL_PROJECT_WORKSPACE_KEY = 'jingci-current-project';
export const LOCAL_PROJECT_WORKSPACE_LIBRARY_KEY = 'jingci-project-library';
export const LOCAL_PROJECT_WORKSPACE_SCHEMA_VERSION = 1;
export const LOCAL_PROJECT_WORKSPACE_LIBRARY_LIMIT = 12;

export type ProjectWorkspaceStage = 'input' | 'diagnosis' | 'reconstruct' | 'result';

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
>;

type WorkspaceStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

const WORKSPACE_STAGES: ProjectWorkspaceStage[] = ['input', 'diagnosis', 'reconstruct', 'result'];
const SHOT_STATUS_VALUES: ShotExecutionStatus[] = ['pending', 'generated', 'failed', 'usable'];

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

  return {
    id: project.id,
    title: project.title,
    updatedAt: project.updatedAt,
    targetDuration: project.targetDuration,
    targetType: project.targetType,
    stage: project.v2State,
    shotCount: shotCards.length,
    completedShotCount,
  };
}

export function deriveProjectTitle(input: string) {
  const compact = input.trim().replace(/\s+/g, ' ');
  return compact ? compact.slice(0, 28) : '未命名项目';
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
    isShotResultNotesRecord(value.shotResultNotes)
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
