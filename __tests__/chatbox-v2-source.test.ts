import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(join(process.cwd(), 'app/components/ChatBox.tsx'), 'utf8');

describe('ChatBox V2 source states', () => {
  it('keeps failed generation recoverable', () => {
    expect(source).toContain('role="alert"');
    expect(source).toContain('重试生成');
    expect(source).toContain('handleRetryDirectorKit');
    expect(source).toContain('handleReturnToEdit');
  });

  it('shows a visible loading state and prevents target drift while loading', () => {
    expect(source).toContain('正在生成导演执行包');
    expect(source).toContain('aria-live="polite"');
    expect(source).toContain('disabled={v2Loading}');
  });

  it('keeps reconstruct selection keyboard accessible', () => {
    expect(source).toContain('role="radiogroup"');
    expect(source).toContain('role="radio"');
    expect(source).toContain("event.key === 'ArrowRight'");
    expect(source).toContain("event.key === 'ArrowLeft'");
  });

  it('guards incomplete result sections', () => {
    expect(source).toContain('执行包内容不完整');
    expect(source).toContain('directorKit.shotCards ?? []');
    expect(source).toContain('directorKit.platformAdvice ?? []');
  });

  it('keeps project iteration detail recoverable from Snapshot', () => {
    expect(source).toContain('selectedIterationId');
    expect(source).toContain('deriveProjectWorkspaceIterationDigest');
    expect(source).toContain('恢复到输入区');
    expect(source).toContain('handleRestoreIteration');
  });

  it('captures platform calibration evidence from the workbench', () => {
    expect(source).toContain('handleCapturePlatformCalibration');
    expect(source).toContain('createPlatformCalibrationEvidence');
    expect(source).toContain('appendPlatformCalibrationEvidence');
    expect(source).toContain('校准当前镜头');
    expect(source).toContain('校准证据已保存到项目快照');
  });

  it('keeps local project summaries authoritative on equal timestamps', () => {
    expect(source).toContain('Date.parse(summary.updatedAt) >= Date.parse(current.updatedAt)');
  });

  it('exposes operator handoff notes from the execution panel', () => {
    expect(source).toContain('buildDirectorKitOperatorHandoffNotes');
    expect(source).toContain('summarizeOperatorHandoffAcceptance');
    expect(source).toContain('handleCopyOperatorHandoffNotes');
    expect(source).toContain('copiedHandoff');
  });

  it('keeps the mobile fixed action bar out of the Work view', () => {
    expect(source).toContain("mobileTab === 'execute'");
    expect(source).not.toContain("mobileTab === 'work' &&");
  });
});
