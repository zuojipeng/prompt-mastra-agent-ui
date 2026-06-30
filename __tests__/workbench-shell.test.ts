import { describe, expect, it } from 'vitest';
import {
  deriveProjectShellSummary,
  deriveProjectSyncDisplay,
  deriveWorkbenchStages,
  type WorkbenchShellInput,
} from '@/lib/workbench-shell';

function createInput(overrides: Partial<WorkbenchShellInput> = {}): WorkbenchShellInput {
  return {
    creativeInput: '废土小镇里，一个旧清洁机器人守护红裙人偶',
    persistedStage: 'input',
    targetDuration: '30s',
    targetTypeLabel: '末世废土',
    hasDirectorKit: false,
    hasSelectedVersion: false,
    trackedShotCount: 0,
    completedShotCount: 0,
    feedbackTotal: 0,
    analyticsOpen: false,
    feasibilityScore: null,
    isGenerating: false,
    inputError: '',
    ...overrides,
  };
}

describe('workbench shell state', () => {
  it('derives sync display labels and blocked state', () => {
    expect(deriveProjectSyncDisplay('idle')).toEqual({
      label: '本地优先',
      tone: 'neutral',
      blocked: false,
    });
    expect(deriveProjectSyncDisplay('syncing')).toEqual({
      label: '云端同步中',
      tone: 'loading',
      blocked: false,
    });
    expect(deriveProjectSyncDisplay('synced')).toEqual({
      label: '云端已同步',
      tone: 'success',
      blocked: false,
    });
    expect(deriveProjectSyncDisplay('localOnly')).toEqual({
      label: '本地已保存，云端待上线',
      tone: 'warning',
      blocked: false,
    });
    expect(deriveProjectSyncDisplay('error')).toEqual({
      label: '云端同步失败',
      tone: 'warning',
      blocked: true,
    });
  });

  it('maps persisted input state to an idea stage without changing storage semantics', () => {
    const stages = deriveWorkbenchStages(createInput({ creativeInput: '  ' }));

    expect(stages.find((stage) => stage.id === 'idea')).toMatchObject({
      active: true,
      done: false,
    });
    expect(stages.find((stage) => stage.id === 'diagnosis')).toMatchObject({
      blocked: true,
    });
  });

  it('promotes result work into execution when some shots have progress', () => {
    const stages = deriveWorkbenchStages(
      createInput({
        persistedStage: 'result',
        hasDirectorKit: true,
        hasSelectedVersion: true,
        trackedShotCount: 3,
        completedShotCount: 1,
      }),
    );

    expect(stages.find((stage) => stage.id === 'directorKit')).toMatchObject({
      done: true,
      active: false,
    });
    expect(stages.find((stage) => stage.id === 'execution')).toMatchObject({
      active: true,
      done: false,
      value: '1/3',
    });
  });

  it('makes feedback active when insight is open', () => {
    const stages = deriveWorkbenchStages(
      createInput({
        persistedStage: 'result',
        hasDirectorKit: true,
        trackedShotCount: 2,
        completedShotCount: 2,
        feedbackTotal: 7,
        analyticsOpen: true,
      }),
    );

    expect(stages.find((stage) => stage.id === 'feedback')).toMatchObject({
      active: true,
      done: true,
      value: '7',
    });
  });

  it('derives project shell summary and primary action state', () => {
    expect(
      deriveProjectShellSummary(createInput({ creativeInput: '   ', inputError: '请输入创意' })),
    ).toMatchObject({
      title: '未命名短片',
      stageLabel: 'Idea',
      shotProgressLabel: '0/0',
      healthLabel: '--',
      primaryActionLabel: '提交创意',
      primaryActionDisabled: true,
    });

    expect(
      deriveProjectShellSummary(
        createInput({
          persistedStage: 'result',
          hasDirectorKit: true,
          trackedShotCount: 4,
          completedShotCount: 2,
          feasibilityScore: 82,
        }),
      ),
    ).toMatchObject({
      title: '废土小镇里，一个旧清洁机器人守护红裙',
      stageLabel: 'Execution',
      shotProgressLabel: '2/4',
      healthLabel: '82',
      primaryActionLabel: '进入执行视图',
      primaryActionDisabled: false,
    });
  });
});
