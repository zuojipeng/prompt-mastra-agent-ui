# Agent Run: Feedback Prompt Revision

Date: 2026-06-30
Owner: Product Agent + Engineering Agent
Scope: turn the feedback next-action recommendation into a one-click next-round prompt revision.

## Capability Register

| Agent | Tool / Skill / MCP | Level | Available | Evidence it can provide | Limits | Reviewer |
| --- | --- | --- | --- | --- | --- | --- |
| Product Agent | feedback analytics taxonomy, task ledger | C1 | yes | E2 acceptance criteria | no live user interviews | Hermes |
| UEAgent | current feedback insight panel | C2 | yes | E3 source and browser evidence | screenshots still pending for this slice | Product Agent |
| Engineering Agent | TypeScript, React, Vitest | C2 | yes | E3 implementation and tests | no backend mutation | Code Review Agent |
| Test Agent | Vitest, TypeScript, full test suite | C2 | yes | E3 validation commands | no production analytics data | Hermes |

## Loop Board

Loop: 6
Goal: close the feedback-to-next-generation loop without adding a new backend dependency.
Current gate: Test
Decision: CONTINUE

| ID | From | To | Blocking Level | Request | Evidence Required | Status |
| --- | --- | --- | --- | --- | --- | --- |
| L1 | Product Agent | Engineering Agent | REWORK | Convert feedback recommendation into an editable next-round draft | Pure function and UI callback | CLOSED |
| L2 | UEAgent | Engineering Agent | REWORK | Keep the action compact inside the existing feedback panel | Source contract and responsive-safe button styling | CLOSED |
| L3 | Test Agent | Engineering Agent | BLOCKER | Prove the revision keeps original intent and adds feedback constraints | Targeted unit test | CLOSED |

## Product Agent

Status: PASS
Output: The feedback insight now creates a concrete next-round draft, so users can move from analytics to another DirectorKit generation without manually copying advice.
Assignments raised: Next product slice should decide whether this draft should also create a saved iteration inside a project workspace.

## UEAgent

Status: PASS
Output: The action is a single compact button inside the existing recommendation panel. It does not add new instructional copy outside the workflow.
Assignments raised: Capture browser screenshots if this slice is expanded beyond source-level validation.

## Architecture Agent

Status: PASS
Output: The draft builder is a pure function in `lib/feedback-next-action.ts`. No new global state, API route, or persistence abstraction was introduced.
Assignments raised: None.

## Engineering Agent

Status: PASS
Output:
- Added `buildFeedbackPromptRevision`.
- Added `currentPrompt` and `onApplyPromptRevision` to `FeedbackInsightPanel`.
- Wired `ChatBox` so applying the action writes the draft into the main creative input and returns to the work tab.
- Extended targeted tests.

## Code Review Agent

Status: PASS
Output: Scope is controlled. The action mutates only local input state and does not change generation, feedback upload, history, or project sync contracts.
Assignments raised: None.

## Test Agent

Status: PASS
Output:
- `npx vitest run __tests__/feedback-next-action.test.ts __tests__/feedback-insight-panel-source.test.ts`: PASS, 2 files / 6 tests.
- `npx tsc --noEmit`: PASS.
- `npm test`: PASS, 11 files / 63 tests.
- `npm run lint`: PASS with existing `baseline-browser-mapping` warning.
- `npm run build`: PASS.
- `git diff --check`: PASS.

## DevOps Agent

Status: NOT RUN
Output: No deployment work in this slice.

## Hermes Decision

Decision: SHIP
Next owner: Hermes Orchestrator
Next smallest action: persist applied feedback revisions as named project iterations.
Residual risk: source-level UI coverage does not prove the button click in a real browser yet.
