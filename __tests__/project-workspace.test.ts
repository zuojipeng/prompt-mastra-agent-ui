import { describe, expect, it } from 'vitest';
import {
  appendProjectProvenanceReceipt,
  appendPlatformCalibrationEvidence,
  appendProjectWorkspaceIteration,
  clearLocalProjectWorkspace,
  createLocalProjectWorkspace,
  createPlatformCalibrationEvidence,
  createProjectProvenanceReceipt,
  createProjectWorkspaceIteration,
  deleteLocalProjectWorkspace,
  deriveProjectTitle,
  deriveProjectWorkspaceIterationDigest,
  loadLocalProjectWorkspaceById,
  loadLocalProjectWorkspaceLibrary,
  loadLocalProjectWorkspaceSummaries,
  loadLocalProjectWorkspace,
  saveLocalProjectWorkspace,
  type LocalProjectWorkspace,
} from '@/lib/project-workspace';
import type { DirectorKit } from '@/lib/director-kit-contract';
import type { ProvenanceRun } from '@/lib/provenance-run-contract';

function createStorage() {
  const values = new Map<string, string>();

  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
    removeItem: (key: string) => {
      values.delete(key);
    },
  };
}

const kit: DirectorKit = {
  diagnosis: {
    feasibilityScore: 82,
    keyRisks: ['主体一致性'],
    riskLevel: 'medium',
    suggestedAdjustments: ['减少复杂动作'],
    recommendedDirection: '改成更稳定的废土守护短片。',
  },
  versions: [
    {
      versionType: 'safest',
      label: '稳妥版',
      summary: '减少复杂动作。',
      rewrittenIdea: '旧清洁机器人守护红裙人偶。',
      whyThisWorks: '主体单一。',
      reducedRisks: ['多人调度'],
      bestFor: '文生视频',
    },
    {
      versionType: 'stylish',
      label: '风格版',
      summary: '强化红裙人偶。',
      rewrittenIdea: '红裙人偶成为唯一视觉符号。',
      whyThisWorks: '视觉符号清晰。',
      reducedRisks: ['主体漂移'],
      bestFor: '参考图',
    },
    {
      versionType: 'cinematic',
      label: '电影版',
      summary: '三段镜头建立孤独、守护和悬念。',
      rewrittenIdea: '机器人穿过废土小镇，停在红裙人偶前。',
      whyThisWorks: '镜头目的明确。',
      reducedRisks: ['叙事跳跃'],
      bestFor: '短片剪辑',
    },
  ],
  selectedVersion: null,
  storySetting: {
    logline: '一个旧清洁机器人在废土小镇守护红裙人偶。',
    directorIntent: '用低调动作表达孤独和守护。',
    protagonist: '旧清洁机器人',
    worldSetting: '风沙弥漫的废土小镇',
    visualMotif: '红裙人偶',
  },
  shotCards: [
    {
      shotId: 1,
      duration: '5s',
      purpose: '建立世界',
      framing: '全景',
      description: '风沙中的废土小镇，旧清洁机器人缓慢出现。',
      action: '机器人沿街清扫。',
      mood: '孤独',
      motion: '缓慢推近',
      generationMode: 'text-to-video',
      consistencyNeed: 'medium',
      riskLevel: 'low',
      riskTags: ['主体一致性'],
      stabilityChecklist: ['固定机器人轮廓'],
      fixSuggestion: '保持机器人轮廓稳定。',
    },
  ],
  masterPrompt: '废土小镇里，一个旧清洁机器人守护红裙人偶。',
  negativePrompt: '畸形，闪烁，文字水印',
  platformAdvice: [],
  postProductionAdvice: {
    editingRhythm: '慢节奏',
    soundEffects: ['风声'],
    music: '低沉环境音乐',
    subtitles: '少量旁白字幕',
  },
  riskRemediation: {
    topRisks: ['机器人外观漂移'],
    alternativeShots: ['使用背影或剪影镜头'],
    backupStrategies: ['先生成主角参考图'],
  },
};

const succeededProvenanceRun: ProvenanceRun = {
  schema_version: 'jingci.provenance-run.v1',
  job_id: 'fixture-shot-1-attempt-1',
  project_id: 'project-1',
  shot_id: 1,
  parent_job_id: null,
  attempt: 1,
  status: 'succeeded',
  provider: 'fixture-provider',
  model: 'fixture-model',
  modality: 'video',
  created_at: '2026-07-24T00:00:00.000Z',
  updated_at: '2026-07-24T00:00:01.000Z',
  result: {
    asset: {
      url: 's3://private-bucket/jingci-preview/source/private.mp4',
      media_type: 'video/mp4',
      sha256: 'a'.repeat(64),
      size_bytes: 1_044_064,
    },
    manifest: {
      uri: 's3://private-bucket/jingci-preview/manifests/private.json',
      canonical_hash: 'b'.repeat(64),
      verified: true,
    },
  },
  error: null,
};

describe('project workspace persistence', () => {
  it('derives a compact project title from creative input', () => {
    expect(deriveProjectTitle('  废土小镇里，\n一个旧清洁机器人守护红裙人偶  ')).toBe(
      '废土小镇里， 一个旧清洁机器人守护红裙人偶',
    );
    expect(deriveProjectTitle('   ')).toBe('未命名项目');
  });

  it('creates a workspace snapshot while preserving an existing id', () => {
    const first = createLocalProjectWorkspace(
      {
        creativeInput: '废土小镇里，一个旧清洁机器人守护红裙人偶',
        targetDuration: '60s',
        targetType: 'cyberpunk',
        v2State: 'result',
        directorKit: kit,
        selectedVersionIndex: 2,
        selectedShotId: 1,
        shotExecutionStatus: { 1: 'usable' },
        shotResultNotes: { 1: 'Seedance 链接：shot-1' },
      },
      null,
      '2026-06-16T00:00:00.000Z',
    );
    const second = createLocalProjectWorkspace(first, first, '2026-06-16T01:00:00.000Z');

    expect(second.id).toBe(first.id);
    expect(second.createdAt).toBe('2026-06-16T00:00:00.000Z');
    expect(second.updatedAt).toBe('2026-06-16T01:00:00.000Z');
    expect(second.shotExecutionStatus[1]).toBe('usable');
  });

  it('appends named project iterations without changing the workspace identity', () => {
    const workspace = createLocalProjectWorkspace(
      {
        creativeInput: '废土小镇里，一个旧清洁机器人守护红裙人偶',
        targetDuration: '30s',
        targetType: 'wasteland',
        v2State: 'result',
        directorKit: kit,
        selectedVersionIndex: 2,
        selectedShotId: 1,
        shotExecutionStatus: { 1: 'usable' },
        shotResultNotes: { 1: 'Seedance 链接：shot-1' },
      },
      null,
      '2026-06-16T00:00:00.000Z',
    );
    const iteration = createProjectWorkspaceIteration(
      {
        source: 'feedback_next_action',
        focus: '主体一致性',
        sourcePrompt: workspace.creativeInput,
        promptDraft: `${workspace.creativeInput}\n\n下一轮改写要求：固定机器人轮廓。`,
        evidence: '4/5 条反馈提到该问题',
      },
      '2026-06-16T01:00:00.000Z',
    );
    const updated = appendProjectWorkspaceIteration(workspace, iteration);

    expect(updated.id).toBe(workspace.id);
    expect(updated.v2State).toBe('input');
    expect(updated.updatedAt).toBe('2026-06-16T01:00:00.000Z');
    expect(updated.creativeInput).toContain('下一轮改写要求');
    expect(updated.iterations?.[0]).toMatchObject({
      title: '主体一致性 改写',
      focus: '主体一致性',
      source: 'feedback_next_action',
    });
  });

  it('derives an iteration digest for comparison display', () => {
    const iteration = createProjectWorkspaceIteration(
      {
        source: 'feedback_next_action',
        focus: '主体一致性',
        sourcePrompt: '旧创意',
        promptDraft: '旧创意\n\n下一轮改写要求：固定主体轮廓。',
        evidence: '4/5 条反馈提到该问题',
      },
      '2026-06-16T01:00:00.000Z',
    );

    expect(deriveProjectWorkspaceIterationDigest(iteration)).toEqual({
      sourceLabel: '反馈改写',
      sourceLength: 3,
      draftLength: 20,
      deltaLength: 17,
    });
  });

  it('saves, loads, and clears a valid local workspace', () => {
    const storage = createStorage();
    const workspace = createLocalProjectWorkspace(
      {
        creativeInput: '废土小镇里，一个旧清洁机器人守护红裙人偶',
        targetDuration: '30s',
        targetType: 'wasteland',
        v2State: 'diagnosis',
        directorKit: kit,
        selectedVersionIndex: null,
        selectedShotId: 1,
        shotExecutionStatus: { 1: 'generated' },
        shotResultNotes: { 1: '初版可用' },
      },
      null,
      '2026-06-16T00:00:00.000Z',
    );

    expect(saveLocalProjectWorkspace(workspace, storage)).toBe(true);
    expect(loadLocalProjectWorkspace(storage)).toMatchObject<Partial<LocalProjectWorkspace>>({
      creativeInput: '废土小镇里，一个旧清洁机器人守护红裙人偶',
      targetDuration: '30s',
      v2State: 'diagnosis',
      selectedShotId: 1,
    });
    expect(clearLocalProjectWorkspace(storage)).toBe(true);
    expect(loadLocalProjectWorkspace(storage)).toBeNull();
  });

  it('maintains a sorted local project library when workspaces are saved', () => {
    const storage = createStorage();
    const first = createLocalProjectWorkspace(
      {
        creativeInput: '第一个废土项目',
        targetDuration: '30s',
        targetType: 'wasteland',
        v2State: 'result',
        directorKit: kit,
        selectedVersionIndex: 0,
        selectedShotId: 1,
        shotExecutionStatus: { 1: 'usable' },
        shotResultNotes: { 1: 'first' },
      },
      null,
      '2026-06-16T00:00:00.000Z',
    );
    const second = createLocalProjectWorkspace(
      {
        creativeInput: '第二个赛博项目',
        targetDuration: '60s',
        targetType: 'cyberpunk',
        v2State: 'diagnosis',
        directorKit: kit,
        selectedVersionIndex: null,
        selectedShotId: 1,
        shotExecutionStatus: { 1: 'generated' },
        shotResultNotes: { 1: 'second' },
      },
      null,
      '2026-06-16T01:00:00.000Z',
    );

    saveLocalProjectWorkspace(first, storage);
    saveLocalProjectWorkspace(second, storage);

    const library = loadLocalProjectWorkspaceLibrary(storage);
    expect(library.map((project) => project.id)).toEqual([second.id, first.id]);
    expect(loadLocalProjectWorkspaceById(first.id, storage)?.shotResultNotes[1]).toBe('first');
  });

  it('summarizes and deletes local project library entries', () => {
    const storage = createStorage();
    const workspace = createLocalProjectWorkspace(
      {
        creativeInput: '废土小镇里，一个旧清洁机器人守护红裙人偶',
        targetDuration: '90s',
        targetType: 'scifi',
        v2State: 'result',
        directorKit: kit,
        selectedVersionIndex: 1,
        selectedShotId: 1,
        shotExecutionStatus: { 1: 'usable' },
        shotResultNotes: { 1: '可用素材' },
      },
      null,
      '2026-06-16T02:00:00.000Z',
    );

    saveLocalProjectWorkspace(workspace, storage);

    expect(loadLocalProjectWorkspaceSummaries(storage)).toEqual([
      expect.objectContaining({
        id: workspace.id,
        title: '废土小镇里，一个旧清洁机器人守护红裙人偶',
        targetDuration: '90s',
        targetType: 'scifi',
        stage: 'result',
        shotCount: 1,
        completedShotCount: 1,
        iterationCount: 0,
        latestIterationFocus: null,
        calibrationCount: 0,
        latestCalibrationOutcome: null,
        latestCalibrationPlatform: null,
        handoffReady: true,
        handoffBlockingIssueCount: 0,
        handoffBlockingReasons: [],
      }),
    ]);

    expect(deleteLocalProjectWorkspace(workspace.id, storage)).toBe(true);
    expect(loadLocalProjectWorkspace(storage)).toBeNull();
    expect(loadLocalProjectWorkspaceLibrary(storage)).toEqual([]);
  });

  it('includes feedback iteration evidence in project summaries', () => {
    const storage = createStorage();
    const workspace = createLocalProjectWorkspace(
      {
        creativeInput: '废土小镇里，一个旧清洁机器人守护红裙人偶',
        targetDuration: '30s',
        targetType: 'wasteland',
        v2State: 'input',
        directorKit: kit,
        selectedVersionIndex: 1,
        selectedShotId: 1,
        shotExecutionStatus: { 1: 'generated' },
        shotResultNotes: { 1: '初版可用' },
      },
      null,
      '2026-06-16T00:00:00.000Z',
    );
    const iteration = createProjectWorkspaceIteration(
      {
        source: 'feedback_next_action',
        focus: '主体一致性',
        sourcePrompt: workspace.creativeInput,
        promptDraft: `${workspace.creativeInput}\n\n下一轮改写要求：固定主体轮廓。`,
        evidence: '4/5 条反馈提到该问题',
      },
      '2026-06-16T01:00:00.000Z',
    );

    saveLocalProjectWorkspace(appendProjectWorkspaceIteration(workspace, iteration), storage);

    expect(loadLocalProjectWorkspaceSummaries(storage)).toEqual([
      expect.objectContaining({
        iterationCount: 1,
        latestIterationFocus: '主体一致性',
      }),
    ]);
  });

  it('appends platform calibration evidence without changing workspace identity', () => {
    const workspace = createLocalProjectWorkspace(
      {
        creativeInput: '废土小镇里，一个旧清洁机器人守护红裙人偶',
        targetDuration: '30s',
        targetType: 'wasteland',
        v2State: 'result',
        directorKit: kit,
        selectedVersionIndex: 1,
        selectedShotId: 1,
        shotExecutionStatus: { 1: 'generated' },
        shotResultNotes: { 1: '初版可用' },
      },
      null,
      '2026-06-16T00:00:00.000Z',
    );
    const calibration = createPlatformCalibrationEvidence(
      {
        platform: 'Seedance',
        capabilityProfileId: 'seedance',
        shotId: 1,
        outcome: 'validated',
        resultNote: '主体稳定，动作轻微可用。',
        failureReasons: [],
        reusableSettings: '5s, cinematic, low motion',
        materialLink: 'https://example.com/shot-1',
        nextAction: 'expand_full_queue',
      },
      '2026-06-16T03:00:00.000Z',
    );
    const updated = appendPlatformCalibrationEvidence(workspace, calibration);

    expect(updated.id).toBe(workspace.id);
    expect(updated.updatedAt).toBe('2026-06-16T03:00:00.000Z');
    expect(updated.platformCalibrations?.[0]).toMatchObject({
      platform: 'Seedance',
      outcome: 'validated',
      nextAction: 'expand_full_queue',
    });
  });

  it('persists only a sanitized provenance receipt and restores it with the project', () => {
    const storage = createStorage();
    const workspace = createLocalProjectWorkspace(
      {
        creativeInput: '废土小镇里，一个旧清洁机器人守护红裙人偶',
        targetDuration: '30s',
        targetType: 'wasteland',
        v2State: 'result',
        directorKit: kit,
        selectedVersionIndex: 1,
        selectedShotId: 1,
        shotExecutionStatus: { 1: 'generated' },
        shotResultNotes: { 1: '初版可用' },
      },
      null,
      '2026-07-24T00:00:00.000Z',
    );
    const receipt = createProjectProvenanceReceipt('preview', succeededProvenanceRun);

    expect(receipt).not.toBeNull();
    const updated = appendProjectProvenanceReceipt(workspace, receipt!);
    expect(saveLocalProjectWorkspace(updated, storage)).toBe(true);

    const serialized = JSON.stringify(updated);
    expect(serialized).not.toContain('private-bucket');
    expect(serialized).not.toContain('private.mp4');
    expect(serialized).not.toContain('private.json');
    expect(loadLocalProjectWorkspace(storage)?.provenanceReceipts?.[1]).toEqual({
      shotId: 1,
      mode: 'preview',
      provider: 'fixture-provider',
      model: 'fixture-model',
      attempt: 1,
      parentJobId: null,
      assetSha256: 'a'.repeat(64),
      manifestHash: 'b'.repeat(64),
      verifiedAt: '2026-07-24T00:00:01.000Z',
    });
  });

  it('does not create a receipt for failed evidence or erase a prior verified receipt', () => {
    const workspace = createLocalProjectWorkspace(
      {
        creativeInput: '废土小镇里，一个旧清洁机器人守护红裙人偶',
        targetDuration: '30s',
        targetType: 'wasteland',
        v2State: 'result',
        directorKit: kit,
        selectedVersionIndex: 1,
        selectedShotId: 1,
        shotExecutionStatus: {},
        shotResultNotes: {},
      },
      null,
      '2026-07-24T00:00:00.000Z',
    );
    const receipt = createProjectProvenanceReceipt('fixture', succeededProvenanceRun)!;
    const latestWorkspace = {
      ...workspace,
      shotResultNotes: { 1: '用户在存证期间保存的最新备注' },
    };
    const withReceipt = appendProjectProvenanceReceipt(latestWorkspace, receipt);
    const failedRun: ProvenanceRun = {
      ...succeededProvenanceRun,
      job_id: 'fixture-shot-1-attempt-2',
      parent_job_id: succeededProvenanceRun.job_id,
      attempt: 2,
      status: 'failed',
      updated_at: '2026-07-24T00:00:02.000Z',
      result: null,
      error: 'Fixture provider timeout',
    };

    expect(createProjectProvenanceReceipt('fixture', failedRun)).toBeNull();
    expect(withReceipt.provenanceReceipts?.[1]).toEqual(receipt);
    expect(withReceipt.shotResultNotes[1]).toBe('用户在存证期间保存的最新备注');
  });

  it('rejects unsafe provenance identity text before it reaches project exports', () => {
    for (const provider of [
      'fixture-provider\n## forged verified claim',
      '[proof](https://signed.example)',
      '<script>alert(1)</script>',
      'https://signed.example',
      'token=secret',
      'x'.repeat(81),
    ]) {
      expect(createProjectProvenanceReceipt('fixture', {
        ...succeededProvenanceRun,
        provider,
      })).toBeNull();
    }
    expect(createProjectProvenanceReceipt('fixture', {
      ...succeededProvenanceRun,
      parent_job_id: 'x'.repeat(201),
    })).toBeNull();
  });

  it('summarizes platform calibration evidence for project dashboards', () => {
    const storage = createStorage();
    const workspace = createLocalProjectWorkspace(
      {
        creativeInput: '废土小镇里，一个旧清洁机器人守护红裙人偶',
        targetDuration: '30s',
        targetType: 'wasteland',
        v2State: 'result',
        directorKit: kit,
        selectedVersionIndex: 1,
        selectedShotId: 1,
        shotExecutionStatus: { 1: 'generated' },
        shotResultNotes: { 1: '初版可用' },
      },
      null,
      '2026-06-16T00:00:00.000Z',
    );
    const calibration = createPlatformCalibrationEvidence(
      {
        platform: 'Seedance',
        capabilityProfileId: 'seedance',
        shotId: 1,
        outcome: 'rejected',
        resultNote: '主体漂移明显。',
        failureReasons: ['主体漂移'],
        reusableSettings: '',
        materialLink: '',
        nextAction: 'revise_prompt',
      },
      '2026-06-16T03:00:00.000Z',
    );

    saveLocalProjectWorkspace(appendPlatformCalibrationEvidence(workspace, calibration), storage);

    expect(loadLocalProjectWorkspaceSummaries(storage)).toEqual([
      expect.objectContaining({
        calibrationCount: 1,
        latestCalibrationOutcome: 'rejected',
        latestCalibrationPlatform: 'Seedance',
      }),
    ]);
  });

  it('summarizes handoff blockers for project dashboards', () => {
    const storage = createStorage();
    const workspace = createLocalProjectWorkspace(
      {
        creativeInput: '废土小镇里，一个旧清洁机器人守护红裙人偶',
        targetDuration: '30s',
        targetType: 'wasteland',
        v2State: 'result',
        directorKit: kit,
        selectedVersionIndex: 1,
        selectedShotId: 1,
        shotExecutionStatus: { 1: 'generated' },
        shotResultNotes: {},
      },
      null,
      '2026-06-16T00:00:00.000Z',
    );

    saveLocalProjectWorkspace(workspace, storage);

    expect(loadLocalProjectWorkspaceSummaries(storage)).toEqual([
      expect.objectContaining({
        handoffReady: false,
        handoffBlockingIssueCount: 1,
        handoffBlockingReasons: ['镜头 1 缺素材链接或结果备注'],
      }),
    ]);
  });

  it('explains pending and failed handoff blockers separately', () => {
    const storage = createStorage();
    const workspace = createLocalProjectWorkspace(
      {
        creativeInput: '废土小镇里，一个旧清洁机器人守护红裙人偶',
        targetDuration: '30s',
        targetType: 'wasteland',
        v2State: 'result',
        directorKit: {
          ...kit,
          shotCards: [
            kit.shotCards[0],
            { ...kit.shotCards[0], shotId: 2 },
          ],
        },
        selectedVersionIndex: 1,
        selectedShotId: 1,
        shotExecutionStatus: { 2: 'failed' },
        shotResultNotes: {},
      },
      null,
      '2026-06-16T00:00:00.000Z',
    );

    saveLocalProjectWorkspace(workspace, storage);

    expect(loadLocalProjectWorkspaceSummaries(storage)[0]).toMatchObject({
      handoffReady: false,
      handoffBlockingIssueCount: 2,
      handoffBlockingReasons: ['镜头 1 未执行', '镜头 2 缺失败原因'],
    });
  });

  it('ignores invalid or corrupted workspace payloads', () => {
    const storage = createStorage();
    storage.setItem('jingci-current-project', '{broken');
    expect(loadLocalProjectWorkspace(storage)).toBeNull();

    storage.setItem(
      'jingci-current-project',
      JSON.stringify({
        schemaVersion: 99,
        creativeInput: 'invalid',
      }),
    );
    expect(loadLocalProjectWorkspace(storage)).toBeNull();
  });

  it('rejects workspaces with invalid iteration payloads', () => {
    const storage = createStorage();
    const workspace = createLocalProjectWorkspace(
      {
        creativeInput: '废土小镇里，一个旧清洁机器人守护红裙人偶',
        targetDuration: '30s',
        targetType: 'wasteland',
        v2State: 'input',
        directorKit: null,
        selectedVersionIndex: null,
        selectedShotId: null,
        shotExecutionStatus: {},
        shotResultNotes: {},
      },
      null,
      '2026-06-16T00:00:00.000Z',
    );
    storage.setItem(
      'jingci-current-project',
      JSON.stringify({
        ...workspace,
        iterations: [{ id: 'bad', source: 'unknown' }],
      }),
    );

    expect(loadLocalProjectWorkspace(storage)).toBeNull();
  });

  it('rejects workspaces with invalid platform calibration payloads', () => {
    const storage = createStorage();
    const workspace = createLocalProjectWorkspace(
      {
        creativeInput: '废土小镇里，一个旧清洁机器人守护红裙人偶',
        targetDuration: '30s',
        targetType: 'wasteland',
        v2State: 'input',
        directorKit: null,
        selectedVersionIndex: null,
        selectedShotId: null,
        shotExecutionStatus: {},
        shotResultNotes: {},
      },
      null,
      '2026-06-16T00:00:00.000Z',
    );
    storage.setItem(
      'jingci-current-project',
      JSON.stringify({
        ...workspace,
        platformCalibrations: [{ id: 'bad', outcome: 'unknown' }],
      }),
    );

    expect(loadLocalProjectWorkspace(storage)).toBeNull();
  });

  it('rejects provenance receipts containing private transport fields', () => {
    const storage = createStorage();
    const workspace = createLocalProjectWorkspace(
      {
        creativeInput: '废土小镇里，一个旧清洁机器人守护红裙人偶',
        targetDuration: '30s',
        targetType: 'wasteland',
        v2State: 'result',
        directorKit: kit,
        selectedVersionIndex: 1,
        selectedShotId: 1,
        shotExecutionStatus: {},
        shotResultNotes: {},
      },
      null,
      '2026-07-24T00:00:00.000Z',
    );
    const receipt = createProjectProvenanceReceipt('preview', succeededProvenanceRun)!;
    storage.setItem(
      'jingci-current-project',
      JSON.stringify({
        ...workspace,
        provenanceReceipts: {
          1: {
            ...receipt,
            assetUrl: succeededProvenanceRun.result?.asset.url,
          },
        },
      }),
    );

    expect(loadLocalProjectWorkspace(storage)).toBeNull();
  });
});
