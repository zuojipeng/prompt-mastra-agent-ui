# Review: Manual Shot Attempt Import

Reviewer: Code Review Agent + Test Agent
Producer reviewed: Product Agent + UEAgent + Architecture Agent + Engineering Agent
Scope: workspace attempt domain, manual import UI, selected-result projection, persistence, and browser flow.

Strongest rejection reason: a second execution model could drift away from the existing status/note model and make handoff evidence inconsistent.

## Findings

- Repaired P1: selecting an older attempt originally reused its creation time as the workspace update time, which could move a project backward in sorted libraries and cloud merge precedence. Selection now uses the current action time; append passes the attempt creation time explicitly.
- Repaired test ambiguity: the selected attempt card includes the word `可用`, so the existing role query also matched it. The E2E now uses an exact accessible name for the status control and visible-only evidence assertions.
- No P0/P1 findings remain after checking compatibility, retention, validation, selected-result synchronization, duplicate desktop/mobile mounts, and failure-state evidence.

## Boundary Review

- No provider API, credential, upload, billing, or deployment path was added.
- Old workspaces without attempt fields remain valid.
- Existing exports continue to consume the projected status and result note.
- Attempt records are capped at eight per shot.

Decision: PASS

Residual risk: attempt metadata is persisted locally and in the workspace envelope, but project summaries and exports do not yet expose the full selected attempt.
