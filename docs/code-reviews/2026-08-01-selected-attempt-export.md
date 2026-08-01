# Review: Selected Attempt Export

Reviewer: Code Review Agent + Test Agent
Producer reviewed: Product Agent + UEAgent + Architecture Agent + Engineering Agent
Scope: export context, selected-attempt resolution, formatting, workbench wiring, and regression tests.

Strongest rejection reason: an export that silently chooses the newest attempt can present a failed or superseded generation as the approved result when selection state is stale.

## Findings

- No P0/P1 findings.
- Explicit selected ID matching is enforced; a missing or stale ID omits metadata.
- Attempt metadata is derived from the same persisted record shown by the workbench.
- Optional context fields preserve callers that only provide status and notes.
- Money formatting is deterministic to two decimal places; absent cost or duration is omitted rather than invented.

## Boundary Review

- No provider call, credential, upload, billing, deployment, or public claim was added.
- No workspace schema or Projects API contract changed.
- No UI component or interaction changed.
- Platform feed packs intentionally remain pre-generation execution artifacts.

Decision: PASS

Residual risk: cloud project summaries still do not expose selected-attempt metadata, so dashboard-level cross-device evidence waits for Projects API parity.
