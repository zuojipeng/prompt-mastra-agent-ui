export type HandoffShotStatus = 'pending' | 'generated' | 'failed' | 'usable';

export type HandoffShotAttempt = {
  id: string;
  createdAt: string;
  shotId: number;
  provider: string;
  model: string;
  status: Exclude<HandoffShotStatus, 'pending'>;
  assetRef: string;
};

export type HandoffApprovalReceipt = {
  approvedAt: string;
  shotId: number;
  attemptId: string;
  provider: string;
  model: string;
  assetRef: string;
  decisionNote: string;
  evidenceKind: 'human_approval';
};

export type ShotHandoffReadinessInput = {
  shotIds: number[];
  shotExecutionStatus: Record<number, HandoffShotStatus>;
  shotResultNotes: Record<number, string>;
  shotAttempts?: Record<number, HandoffShotAttempt[]>;
  selectedShotAttemptIds?: Record<number, string>;
  shotApprovalReceipts?: Record<number, HandoffApprovalReceipt>;
};

export type ShotHandoffReadiness = {
  ready: boolean;
  blockingIssueCount: number;
  pendingShotIds: number[];
  missingEvidenceShotIds: number[];
  failedWithoutReasonShotIds: number[];
  unapprovedUsableShotIds: number[];
};

function hasMatchingApproval(input: ShotHandoffReadinessInput, shotId: number) {
  const selectedAttemptId = input.selectedShotAttemptIds?.[shotId];
  const selectedAttempt = input.shotAttempts?.[shotId]?.find((attempt) =>
    attempt.id === selectedAttemptId &&
    attempt.shotId === shotId &&
    Number.isFinite(Date.parse(attempt.createdAt)) &&
    attempt.provider.trim().length > 0 &&
    attempt.model.trim().length > 0 &&
    attempt.assetRef.trim().length > 0 &&
    attempt.status === 'usable');
  const receipt = input.shotApprovalReceipts?.[shotId];

  return Boolean(
    selectedAttempt &&
    receipt?.evidenceKind === 'human_approval' &&
    receipt.attemptId === selectedAttempt.id &&
    receipt.shotId === shotId &&
    Number.isFinite(Date.parse(receipt.approvedAt)) &&
    receipt.decisionNote.trim().length > 0 &&
    receipt.provider === selectedAttempt.provider &&
    receipt.model === selectedAttempt.model &&
    receipt.assetRef === selectedAttempt.assetRef,
  );
}

export function deriveShotHandoffReadiness(input: ShotHandoffReadinessInput): ShotHandoffReadiness {
  const pendingShotIds: number[] = [];
  const missingEvidenceShotIds: number[] = [];
  const failedWithoutReasonShotIds: number[] = [];
  const unapprovedUsableShotIds: number[] = [];

  input.shotIds.forEach((shotId) => {
    const status = input.shotExecutionStatus[shotId] ?? 'pending';
    const resultNote = input.shotResultNotes[shotId]?.trim();

    if (status === 'pending') pendingShotIds.push(shotId);
    if ((status === 'generated' || status === 'usable') && !resultNote) {
      missingEvidenceShotIds.push(shotId);
    }
    if (status === 'failed' && !resultNote) failedWithoutReasonShotIds.push(shotId);

    if (status === 'usable' && !hasMatchingApproval(input, shotId)) {
      unapprovedUsableShotIds.push(shotId);
    }
  });

  const blockingIssueCount =
    pendingShotIds.length +
    missingEvidenceShotIds.length +
    failedWithoutReasonShotIds.length +
    unapprovedUsableShotIds.length;

  return {
    ready: input.shotIds.length > 0 && blockingIssueCount === 0,
    blockingIssueCount,
    pendingShotIds,
    missingEvidenceShotIds,
    failedWithoutReasonShotIds,
    unapprovedUsableShotIds,
  };
}
