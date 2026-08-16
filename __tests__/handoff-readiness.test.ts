import { describe, expect, it } from 'vitest';
import {
  deriveShotHandoffReadiness,
  type ShotHandoffReadinessInput,
} from '@/lib/handoff-readiness';

function createInput(overrides: Partial<ShotHandoffReadinessInput> = {}): ShotHandoffReadinessInput {
  return {
    shotIds: [1],
    shotExecutionStatus: { 1: 'usable' },
    shotResultNotes: { 1: 'b2://jingci-preview/shot-1.mp4' },
    shotAttempts: {
      1: [{
        id: 'attempt-1',
        createdAt: '2026-08-16T02:00:00.000Z',
        shotId: 1,
        provider: 'Runway',
        model: 'Gen-4.5',
        status: 'usable',
        assetRef: 'b2://jingci-preview/shot-1.mp4',
      }],
    },
    selectedShotAttemptIds: { 1: 'attempt-1' },
    shotApprovalReceipts: {
      1: {
        approvedAt: '2026-08-16T02:05:00.000Z',
        shotId: 1,
        attemptId: 'attempt-1',
        provider: 'Runway',
        model: 'Gen-4.5',
        assetRef: 'b2://jingci-preview/shot-1.mp4',
        decisionNote: '已人工复核，可交付。',
        evidenceKind: 'human_approval',
      },
    },
    ...overrides,
  };
}

describe('shot handoff approval readiness', () => {
  it('accepts a complete receipt bound to the current usable attempt', () => {
    expect(deriveShotHandoffReadiness(createInput())).toMatchObject({
      ready: true,
      blockingIssueCount: 0,
      unapprovedUsableShotIds: [],
    });
  });

  it('fails closed when legacy payloads omit attempt evidence', () => {
    expect(deriveShotHandoffReadiness(createInput({ shotAttempts: undefined }))).toMatchObject({
      ready: false,
      unapprovedUsableShotIds: [1],
    });
  });

  it('rejects stale and malformed approval evidence', () => {
    const base = createInput();
    const receipt = base.shotApprovalReceipts![1];

    [
      { ...receipt, attemptId: 'attempt-stale' },
      { ...receipt, approvedAt: 'invalid-date' },
      { ...receipt, provider: 'Other' },
      { ...receipt, model: 'Other' },
      { ...receipt, assetRef: 'b2://jingci-preview/other.mp4' },
      { ...receipt, decisionNote: '   ' },
    ].forEach((invalidReceipt) => {
      expect(deriveShotHandoffReadiness(createInput({
        shotApprovalReceipts: { 1: invalidReceipt },
      }))).toMatchObject({
        ready: false,
        unapprovedUsableShotIds: [1],
      });
    });
  });

  it('rejects a receipt when the selected attempt is not usable', () => {
    const base = createInput();
    expect(deriveShotHandoffReadiness(createInput({
      shotAttempts: {
        1: [{ ...base.shotAttempts![1][0], status: 'generated' }],
      },
    }))).toMatchObject({
      ready: false,
      unapprovedUsableShotIds: [1],
    });
  });
});
