export type HandoffShotStatus = 'pending' | 'generated' | 'failed' | 'usable';

export type ShotHandoffReadinessInput = {
  shotIds: number[];
  shotExecutionStatus: Record<number, HandoffShotStatus>;
  shotResultNotes: Record<number, string>;
  selectedShotAttemptIds?: Record<number, string>;
  shotApprovalReceipts?: Record<number, { attemptId: string }>;
};

export type ShotHandoffReadiness = {
  ready: boolean;
  blockingIssueCount: number;
  pendingShotIds: number[];
  missingEvidenceShotIds: number[];
  failedWithoutReasonShotIds: number[];
  unapprovedUsableShotIds: number[];
};

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

    if (status === 'usable') {
      const selectedAttemptId = input.selectedShotAttemptIds?.[shotId];
      const approvalReceipt = input.shotApprovalReceipts?.[shotId];
      if (!selectedAttemptId || approvalReceipt?.attemptId !== selectedAttemptId) {
        unapprovedUsableShotIds.push(shotId);
      }
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
