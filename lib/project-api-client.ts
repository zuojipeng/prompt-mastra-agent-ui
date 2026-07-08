import type {
  DirectorKitTargetDuration,
  DirectorKitTargetType,
} from './director-kit-contract';
import type {
  LocalProjectWorkspace,
  LocalProjectWorkspaceSummary,
} from './project-workspace';
import { getUserId } from './session-manager';

const getApiUrl = () =>
  process.env.NEXT_PUBLIC_API_URL ??
  'https://prompt-optimizer.hahazuo460.workers.dev/api/optimize';

const getProjectsUrl = () => getApiUrl().replace(/\/api\/optimize$/, '/api/projects');

export type ProjectCloudSyncResult = 'synced' | 'unavailable' | 'error';

export function normalizeCloudProjectSummary(value: unknown): LocalProjectWorkspaceSummary | null {
  if (!value || typeof value !== 'object') return null;
  const row = value as Record<string, unknown>;
  if (
    typeof row.id !== 'string' ||
    typeof row.title !== 'string' ||
    typeof row.targetDuration !== 'string' ||
    typeof row.targetType !== 'string' ||
    typeof row.stage !== 'string'
  ) {
    return null;
  }

  const updatedAt =
    typeof row.updatedAt === 'number'
      ? new Date(row.updatedAt).toISOString()
      : typeof row.updatedAt === 'string'
        ? row.updatedAt
        : new Date().toISOString();

  return {
    id: row.id,
    title: row.title,
    updatedAt,
    targetDuration: row.targetDuration as DirectorKitTargetDuration,
    targetType: row.targetType as DirectorKitTargetType,
    stage: row.stage as LocalProjectWorkspaceSummary['stage'],
    shotCount: typeof row.shotCount === 'number' ? row.shotCount : 0,
    completedShotCount: typeof row.completedShotCount === 'number' ? row.completedShotCount : 0,
    iterationCount: typeof row.iterationCount === 'number' ? row.iterationCount : 0,
    latestIterationFocus: typeof row.latestIterationFocus === 'string' ? row.latestIterationFocus : null,
    calibrationCount: typeof row.calibrationCount === 'number' ? row.calibrationCount : 0,
    latestCalibrationOutcome:
      row.latestCalibrationOutcome === 'validated' ||
      row.latestCalibrationOutcome === 'rejected' ||
      row.latestCalibrationOutcome === 'inconclusive'
        ? row.latestCalibrationOutcome
        : null,
    latestCalibrationPlatform: typeof row.latestCalibrationPlatform === 'string' ? row.latestCalibrationPlatform : null,
    handoffReady: typeof row.handoffReady === 'boolean' ? row.handoffReady : false,
    handoffBlockingIssueCount: typeof row.handoffBlockingIssueCount === 'number' ? row.handoffBlockingIssueCount : 0,
  };
}

export async function syncProjectWorkspaceStatus(workspace: LocalProjectWorkspace): Promise<ProjectCloudSyncResult> {
  const userId = getUserId();
  try {
    const res = await fetch(getProjectsUrl(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-User-Id': userId },
      body: JSON.stringify({ workspace }),
    });
    if (res.ok) return 'synced';
    return res.status === 404 ? 'unavailable' : 'error';
  } catch {
    return 'error';
  }
}

export async function syncProjectWorkspace(workspace: LocalProjectWorkspace): Promise<boolean> {
  return (await syncProjectWorkspaceStatus(workspace)) === 'synced';
}

export async function fetchProjectSummaries(): Promise<LocalProjectWorkspaceSummary[]> {
  const userId = getUserId();
  try {
    const res = await fetch(getProjectsUrl(), { headers: { 'X-User-Id': userId } });
    if (!res.ok) return [];
    const json = await res.json() as { data?: { projects?: unknown[] } };
    return (json.data?.projects ?? [])
      .map(normalizeCloudProjectSummary)
      .filter((project): project is LocalProjectWorkspaceSummary => project !== null);
  } catch {
    return [];
  }
}

export async function fetchProjectWorkspace(projectId: string): Promise<LocalProjectWorkspace | null> {
  const userId = getUserId();
  try {
    const res = await fetch(`${getProjectsUrl()}/${encodeURIComponent(projectId)}`, {
      headers: { 'X-User-Id': userId },
    });
    if (!res.ok) return null;
    const json = await res.json() as { data?: { payload?: unknown } };
    const payload = json.data?.payload;
    return payload && typeof payload === 'object' ? payload as LocalProjectWorkspace : null;
  } catch {
    return null;
  }
}

export async function deleteProjectWorkspace(projectId: string): Promise<boolean> {
  return (await deleteProjectWorkspaceStatus(projectId)) === 'synced';
}

export async function deleteProjectWorkspaceStatus(projectId: string): Promise<ProjectCloudSyncResult> {
  const userId = getUserId();
  try {
    const res = await fetch(`${getProjectsUrl()}/${encodeURIComponent(projectId)}`, {
      method: 'DELETE',
      headers: { 'X-User-Id': userId },
    });
    if (res.ok) return 'synced';
    return res.status === 404 ? 'unavailable' : 'error';
  } catch {
    return 'error';
  }
}
