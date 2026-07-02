# Agent Run: Dashboard Calibration Summary

Date: 2026-07-02
Owner: Product Agent + UEAgent + Engineering Agent
Scope: surface saved platform calibration evidence in project dashboard rows.

## Loop Board

Loop: 22
Goal: make saved platform calibration evidence visible when users scan project history.
Current gate: Test
Decision: SHIP

| ID | From | To | Blocking Level | Request | Evidence Required | Status |
| --- | --- | --- | --- | --- | --- | --- |
| L1 | Product Agent | UEAgent | IMPROVEMENT | Add calibration visibility next to revision and progress signals | dashboard source test | CLOSED |
| L2 | Test Agent | Engineering Agent | BLOCKER | Browser test showed remote summary with equal timestamp could hide local calibration fields | Playwright pass after merge repair | CLOSED |
| L3 | Code Review Agent | Engineering Agent | REWORK | Keep the change additive and avoid creating a new dashboard detail view | diff review | CLOSED |

## Product Agent

Status: PASS
Output: Project dashboard now shows total calibration count and the latest platform calibration outcome, making platform learning visible from the project list.

## UEAgent

Status: PASS
Output: Added a `Calibrations` summary card, a table column, and a compact row note `最近校准：平台 · 结果` alongside existing revision evidence.

## Architecture Agent

Status: PASS
Output: Reused existing `LocalProjectWorkspaceSummary` fields. Adjusted summary merge to prefer local data on equal timestamps so local-only additive fields are not overwritten by older remote summary shapes.

## Engineering Agent

Status: PASS
Output:
- Added dashboard rendering for calibration count, latest platform, and latest outcome.
- Added search support for latest calibration platform.
- Added browser coverage for Dashboard calibration visibility.
- Changed project summary merge from `>` to `>=` to let local summaries win on equal timestamps.

## Code Review Agent

Status: PASS
Output: Additive dashboard display and merge repair. No workspace schema, backend route, or generation behavior changed.

## Test Agent

Status: PASS
Output:
- `npx vitest run __tests__/project-dashboard-source.test.ts __tests__/chatbox-v2-source.test.ts __tests__/project-workspace.test.ts __tests__/project-api-client.test.ts`: PASS, 4 files / 29 tests.
- `PLAYWRIGHT_PORT=3200 npx playwright test tests/e2e/v2-director-kit.spec.ts --project=chromium --project=mobile-chrome`: PASS, 6 browser tests.
- `npx tsc --noEmit`: PASS.
- `npx vitest run --pool=threads`: PASS, 13 files / 82 tests.
- `npm run lint`: PASS with existing `baseline-browser-mapping` update warning.
- `npm run build`: PASS.
- `git diff --check`: PASS.

## Hermes Decision

Decision: SHIP
Next owner: Hermes Orchestrator
Next smallest action: export dashboard calibration state into operator handoff notes.
Residual risk: Browser validation uses mocked Projects API summaries; production Projects API remains under JC-T002.
