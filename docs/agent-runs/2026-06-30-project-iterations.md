# Agent Run: Project Iterations

Date: 2026-06-30
Owner: Product Agent + Engineering Agent
Scope: persist feedback-applied prompt revisions as named project iterations.

## Capability Register

| Agent | Tool / Skill / MCP | Level | Available | Evidence it can provide | Limits | Reviewer |
| --- | --- | --- | --- | --- | --- | --- |
| Product Agent | task ledger, feedback loop acceptance criteria | C1 | yes | E2 scope and non-goals | no live user interviews | Hermes |
| UEAgent | current project snapshot panel | C2 | yes | E3 source/state evidence | no browser screenshot yet | Product Agent |
| Architecture Agent | workspace persistence model | C2 | yes | E3 data-boundary decision | no backend schema migration | Code Review Agent |
| Engineering Agent | TypeScript, React, Vitest | C2 | yes | E3 implementation and tests | frontend/local-first only | Test Agent |
| Test Agent | Vitest, TypeScript, ESLint, Next build | C2 | yes | E3 validation commands | no browser screenshot yet | Hermes |

## Loop Board

Loop: 7
Goal: make applied feedback revisions durable inside the project workspace.
Current gate: Test
Decision: SHIP

| ID | From | To | Blocking Level | Request | Evidence Required | Status |
| --- | --- | --- | --- | --- | --- | --- |
| L1 | Product Agent | Engineering Agent | REWORK | Save feedback-applied revisions as named project iterations | workspace model and tests | CLOSED |
| L2 | Architecture Agent | Engineering Agent | BLOCKER | Do not break existing workspace payloads | optional `iterations` field and compatibility tests | CLOSED |
| L3 | UEAgent | Engineering Agent | IMPROVEMENT | Show recent iterations without adding a new panel | compact Snapshot list | CLOSED |

## Product Agent

Status: PASS
Output: Feedback-applied drafts are now part of the project record, not just temporary text in the input box.
Assignments raised: Later iteration detail view can compare source prompt and draft if users need review depth.

## UEAgent

Status: PASS
Output: Recent iterations appear in the existing Snapshot area with title and evidence. No extra navigation was introduced.
Assignments raised: Add browser evidence if this grows into a larger project history surface.

## Architecture Agent

Status: PASS
Output: Added an optional `iterations` array to the existing local workspace model. Existing saved workspaces without the field remain valid.
Assignments raised: Backend Projects API can continue storing the workspace payload as JSON; no D1 migration is required for this slice.

## Engineering Agent

Status: PASS
Output:
- Added `ProjectWorkspaceIteration` helpers.
- Appended a feedback iteration when applying feedback prompt revisions.
- Saved and synced the updated workspace after applying a revision.
- Rendered recent iterations in the project Snapshot panel.
- Added project workspace tests for iteration append and invalid payload rejection.

## Code Review Agent

Status: PASS
Output: Scope is controlled. The slice does not alter DirectorKit generation, feedback upload, history records, or backend routes.
Assignments raised: None.

## Test Agent

Status: PASS
Output:
- `npx vitest run __tests__/project-workspace.test.ts __tests__/feedback-insight-panel-source.test.ts __tests__/feedback-next-action.test.ts`: PASS, 3 files / 14 tests.
- `npx tsc --noEmit`: PASS.
- `npm test`: PASS, 11 files / 65 tests.
- `npm run lint`: PASS with existing `baseline-browser-mapping` warning.
- `npm run build`: PASS.

## Hermes Decision

Decision: SHIP
Next owner: Hermes Orchestrator
Next smallest action: add iteration compare/detail or resume production Projects API release verification.
Residual risk: no browser click screenshot yet for the recently added Snapshot iteration list.
