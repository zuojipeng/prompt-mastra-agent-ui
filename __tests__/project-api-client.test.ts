import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  deleteProjectWorkspace,
  deleteProjectWorkspaceStatus,
  fetchProjectSummaries,
  fetchProjectWorkspace,
  normalizeCloudProjectSummary,
  syncProjectWorkspace,
  syncProjectWorkspaceStatus,
} from '@/lib/project-api-client';
import type { LocalProjectWorkspace } from '@/lib/project-workspace';

const originalFetch = global.fetch;

function createWorkspace(id = 'project-1'): LocalProjectWorkspace {
  return {
    schemaVersion: 1,
    id,
    title: '废土项目',
    creativeInput: '废土小镇里，一个旧清洁机器人守护红裙人偶',
    targetDuration: '30s',
    targetType: 'wasteland',
    v2State: 'result',
    createdAt: '2026-06-17T00:00:00.000Z',
    updatedAt: '2026-06-17T01:00:00.000Z',
    directorKit: null,
    selectedVersionIndex: null,
    selectedShotId: null,
    shotExecutionStatus: {},
    shotResultNotes: {},
  };
}

describe('project-api-client', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('promptUserId', 'test-user');
    process.env.NEXT_PUBLIC_API_URL = 'https://worker.example.com/api/optimize';
  });

  afterEach(() => {
    global.fetch = originalFetch;
    delete process.env.NEXT_PUBLIC_API_URL;
    vi.restoreAllMocks();
  });

  it('normalizes backend project summaries', () => {
    expect(
      normalizeCloudProjectSummary({
        id: 'project-1',
        title: '废土项目',
        targetDuration: '60s',
        targetType: 'wasteland',
        stage: 'result',
        shotCount: 3,
        completedShotCount: 2,
        iterationCount: 2,
        latestIterationFocus: '主体一致性',
        calibrationCount: 1,
        latestCalibrationOutcome: 'validated',
        latestCalibrationPlatform: 'Seedance',
        handoffReady: true,
        handoffBlockingIssueCount: 0,
        handoffBlockingReasons: [],
        updatedAt: Date.UTC(2026, 5, 17),
      }),
    ).toEqual({
      id: 'project-1',
      title: '废土项目',
      targetDuration: '60s',
      targetType: 'wasteland',
      stage: 'result',
      shotCount: 3,
      completedShotCount: 2,
      iterationCount: 2,
      latestIterationFocus: '主体一致性',
      calibrationCount: 1,
      latestCalibrationOutcome: 'validated',
      latestCalibrationPlatform: 'Seedance',
      handoffReady: true,
      handoffBlockingIssueCount: 0,
      handoffBlockingReasons: [],
      updatedAt: '2026-06-17T00:00:00.000Z',
    });

    expect(normalizeCloudProjectSummary({ id: 'missing fields' })).toBeNull();
    expect(normalizeCloudProjectSummary(null)).toBeNull();
  });

  it('fetches and filters project summaries', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          projects: [
            {
              id: 'project-1',
              title: '废土项目',
              targetDuration: '30s',
              targetType: 'wasteland',
              stage: 'result',
              updatedAt: '2026-06-17T00:00:00.000Z',
            },
            { id: 'invalid' },
          ],
        },
      }),
    });
    global.fetch = fetchMock as typeof fetch;

    await expect(fetchProjectSummaries()).resolves.toEqual([
      expect.objectContaining({
        id: 'project-1',
        shotCount: 0,
        completedShotCount: 0,
        iterationCount: 0,
        latestIterationFocus: null,
        calibrationCount: 0,
        latestCalibrationOutcome: null,
        latestCalibrationPlatform: null,
        handoffReady: false,
        handoffBlockingIssueCount: 0,
        handoffBlockingReasons: [],
      }),
    ]);
    expect(fetchMock).toHaveBeenCalledWith('https://worker.example.com/api/projects', {
      headers: { 'X-User-Id': 'test-user' },
    });
  });

  it('normalizes handoff reasons and derives the count when older summaries omit it', () => {
    expect(
      normalizeCloudProjectSummary({
        id: 'project-1',
        title: '废土项目',
        targetDuration: '30s',
        targetType: 'wasteland',
        stage: 'result',
        handoffReady: false,
        handoffBlockingReasons: ['镜头 1 未执行', null, 2],
        updatedAt: '2026-06-17T00:00:00.000Z',
      }),
    ).toMatchObject({
      handoffBlockingIssueCount: 1,
      handoffBlockingReasons: ['镜头 1 未执行'],
    });
  });

  it('syncs a project workspace', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    global.fetch = fetchMock as typeof fetch;
    const workspace = createWorkspace();

    await expect(syncProjectWorkspace(workspace)).resolves.toBe(true);
    expect(fetchMock).toHaveBeenCalledWith('https://worker.example.com/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-User-Id': 'test-user' },
      body: JSON.stringify({ workspace }),
    });
  });

  it('classifies missing projects API routes as unavailable', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 404 }) as typeof fetch;

    await expect(syncProjectWorkspaceStatus(createWorkspace())).resolves.toBe('unavailable');
    await expect(syncProjectWorkspace(createWorkspace())).resolves.toBe(false);
    await expect(deleteProjectWorkspaceStatus('missing')).resolves.toBe('unavailable');
    await expect(deleteProjectWorkspace('missing')).resolves.toBe(false);
  });

  it('fetches and deletes one cloud project', async () => {
    const workspace = createWorkspace('project/with space');
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { payload: workspace } }),
      })
      .mockResolvedValueOnce({ ok: true });
    global.fetch = fetchMock as typeof fetch;

    await expect(fetchProjectWorkspace(workspace.id)).resolves.toEqual(workspace);
    await expect(deleteProjectWorkspace(workspace.id)).resolves.toBe(true);
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      'https://worker.example.com/api/projects/project%2Fwith%20space',
      { headers: { 'X-User-Id': 'test-user' } },
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'https://worker.example.com/api/projects/project%2Fwith%20space',
      { method: 'DELETE', headers: { 'X-User-Id': 'test-user' } },
    );
  });

  it('degrades safely on network or HTTP failures', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('network')) as typeof fetch;
    await expect(fetchProjectSummaries()).resolves.toEqual([]);
    await expect(fetchProjectWorkspace('missing')).resolves.toBeNull();
    await expect(syncProjectWorkspace(createWorkspace())).resolves.toBe(false);
    await expect(deleteProjectWorkspace('missing')).resolves.toBe(false);

    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 500 }) as typeof fetch;
    await expect(fetchProjectSummaries()).resolves.toEqual([]);
    await expect(fetchProjectWorkspace('missing')).resolves.toBeNull();
    await expect(syncProjectWorkspaceStatus(createWorkspace())).resolves.toBe('error');
    await expect(deleteProjectWorkspaceStatus('missing')).resolves.toBe('error');
  });
});
