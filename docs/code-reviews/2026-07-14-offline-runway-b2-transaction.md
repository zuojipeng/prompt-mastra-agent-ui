# Code Review: Offline Runway-to-B2 Transaction

Reviewer: Architecture Agent + Code Review Agent + Test Agent + DevOps Agent + Claims Review Agent
Decision: PASS FOR OFFLINE COMPOSITION ONLY

## Findings

1. P0, closed: caller `max_retries` could override provider policy and create multiple billable tasks; both `invoke` and `ainvoke` now force zero retries.
2. P1, closed: requested storage keys are registered before delegate mutation, covering commit-then-error ambiguity.
3. P1, closed: failed probe runs reached Pipeline finalization; a narrow probe-gated sink now prevents any storage write before probe acceptance.
4. P1, closed: asset and manifest bytes, digest, canonical hash, provider/model lineage, and source-URL absence are verified from persisted read-back.
5. P1, closed: primary errors remain chained when cleanup or backend close also fails.
6. P1, closed: cleanup uses the offline backend object map as authoritative state, not a potentially false-negative `exists()` response.
7. P1, closed: observed out-of-prefix returned keys are not deleted automatically and remain explicit recovery handles.
8. P2, closed: the transaction rejects live clients and non-memory backends so its no-network claim cannot be enabled by normal configuration.

## Residual Risk

The probe callback uses fixture evidence and the backend is memory-only. Real ffprobe behavior, provider output quality, Runway authentication and billing, B2 permissions and deletion, network failure behavior, DNS pinning, and public deployment remain unproven.
