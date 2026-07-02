# Agent Run: Snapshot Calibration Evidence

Date: 2026-07-02
Owner: Product Agent + Engineering Agent
Scope: expose platform calibration evidence in copied project snapshots.

## Loop Board

Loop: 19
Goal: make post-generation platform calibration usable in handoff packages, not only stored in local project data.
Current gate: Test
Decision: SHIP

| ID | From | To | Blocking Level | Request | Evidence Required | Status |
| --- | --- | --- | --- | --- | --- | --- |
| L1 | Product Agent | Engineering Agent | IMPROVEMENT | Include platform calibration records in the project snapshot handoff | snapshot export test | CLOSED |
| L2 | UEAgent | Engineering Agent | REWORK | Avoid empty snapshot sections when no calibration evidence exists | negative-path test | CLOSED |
| L3 | Code Review Agent | Test Agent | BLOCKER | Prove the optional context does not break old snapshot callers | typecheck and targeted test | CLOSED |

## Product Agent

Status: PASS
Output: Project snapshots now include platform, shot id, outcome, capability profile, conclusion, failure reasons, reusable settings, material link, and next action when calibration evidence exists.

## UEAgent

Status: PASS
Output: The snapshot only shows the `平台校准证据` section when evidence exists, keeping copied handoff documents clean for early projects.

## Architecture Agent

Status: PASS
Output: Extended the existing `DirectorKitExportContext` boundary with optional `platformCalibrations`; no storage migration, backend route, or new UI state was introduced.

## Engineering Agent

Status: PASS
Output:
- Added calibration outcome and next-action labels for human-readable snapshots.
- Added a `平台校准证据` section to `buildProjectSnapshot`.
- Passed current workspace calibration evidence from `ChatBox` into snapshot export.

## Code Review Agent

Status: PASS
Output: Additive export-only change. It does not mutate workspace state, alter generation, or claim production persistence.

## Test Agent

Status: PASS
Output:
- `npx vitest run __tests__/director-kit-export.test.ts`: PASS, 1 file / 6 tests.
- `npx tsc --noEmit`: PASS.
- `npx vitest run --pool=threads`: PASS, 13 files / 79 tests.
- `npm run lint`: PASS with existing `baseline-browser-mapping` update warning.
- `npm run build`: PASS.
- `git diff --check`: PASS.

## Hermes Decision

Decision: SHIP
Next owner: Hermes Orchestrator
Next smallest action: add a first-class calibration capture path in the workbench UI.
Residual risk: Calibration evidence can be exported from snapshots, but there is still no first-class UI form for operators to enter calibration results.
