import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('project dashboard source contract', () => {
  const source = readFileSync('app/components/ProjectDashboardPanel.tsx', 'utf8');

  it('surfaces feedback iteration evidence in the project dashboard', () => {
    expect(source).toContain('project.latestIterationFocus');
    expect(source).toContain('最近改写：');
    expect(source).toContain('Revisions');
    expect(source).toContain('project.iterationCount');
  });

  it('surfaces platform calibration evidence in the project dashboard', () => {
    expect(source).toContain('Calibrations');
    expect(source).toContain('totalCalibrations');
    expect(source).toContain('project.latestCalibrationPlatform');
    expect(source).toContain('最近校准：');
    expect(source).toContain('project.calibrationCount');
  });

  it('surfaces handoff readiness in the project dashboard', () => {
    expect(source).toContain('Handoff');
    expect(source).toContain('handoffReadyProjects');
    expect(source).toContain('getHandoffLabel');
    expect(source).toContain('交接状态：');
    expect(source).toContain('需补：');
    expect(source).toContain('getHandoffReasonLabel');
    expect(source).toContain('project.handoffBlockingReasons');
    expect(source).toContain('project.handoffReady');
  });

  it('filters projects by handoff readiness', () => {
    expect(source).toContain("type HandoffFilter = 'all' | 'ready' | 'blocked'");
    expect(source).toContain('HANDOFF_FILTER_OPTIONS');
    expect(source).toContain('handoffFilter');
    expect(source).toContain('handoffBlockedProjects');
    expect(source).toContain('缺证据');
    expect(source).toContain('project.handoffBlockingIssueCount > 0');
  });
});
