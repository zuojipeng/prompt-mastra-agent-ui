# Agent Run: Dashboard Handoff Readiness

Date: 2026-07-08
Task: JC-T001 Projectized creation workbench v4
Owner: Product Agent + UEAgent + Engineering Agent
Reviewer: Code Review Agent + Test Agent
Decision: SHIP

## Goal

Make handoff readiness visible at the project dashboard level so an operator can scan saved projects and immediately know which DirectorKit workspaces are ready to pass to the next production step.

## Product Gate

- User job: after generating shot results and operator handoff notes, the creator needs the project library to show whether a project is actually ready to hand off.
- Scope: derive handoff readiness from existing shot execution evidence and show it in project summaries.
- Non-goals: no backend migration, no new release/deploy work, no platform upload automation.
- Acceptance:
  - project summaries expose `handoffReady` and `handoffBlockingIssueCount`;
  - cloud summaries remain backward-compatible when the worker has not returned these fields;
  - the dashboard shows a Handoff total and row-level handoff state;
  - dashboard search can find handoff-ready projects.

## UE Gate

- Added a compact `Handoff` summary tile next to existing project, ready, shot progress, revision, and calibration tiles.
- Added row-level copy: `交接状态：可交接` or `缺 N 项`.
- Kept the dashboard visual density consistent with the current operational dashboard style.
- Added `aria-label="项目仪表盘"` to make the dashboard an addressable region for assistive tech and stable E2E tests.

## Architecture Gate

- Kept the readiness derivation in `lib/project-workspace.ts`, where local summaries are already derived.
- Kept cloud normalization additive and tolerant in `lib/project-api-client.ts`.
- Reused existing `LocalProjectWorkspaceSummary` instead of introducing a new dashboard-specific model.

## Engineering Gate

Changed files:
- `lib/project-workspace.ts`
- `lib/project-api-client.ts`
- `app/components/ProjectDashboardPanel.tsx`
- `__tests__/project-workspace.test.ts`
- `__tests__/project-api-client.test.ts`
- `__tests__/project-dashboard-source.test.ts`
- `tests/e2e/v2-director-kit.spec.ts`

Implementation notes:
- `handoffBlockingIssueCount` counts pending shots and completed/failed shots without result notes.
- `handoffReady` is true only when a project has at least one shot and no blocking handoff issues.
- Dashboard search now includes the derived handoff label.
- E2E mock cloud summaries now mirror the local summary handoff fields.

## Loop Board

| ID | From | To | Blocking Level | Request | Evidence Required | Status |
| --- | --- | --- | --- | --- | --- | --- |
| L1 | Test Agent | Engineering Agent | REWORK | Avoid ambiguous project title locator between dashboard row and sidebar recent project list | Passing desktop/mobile Playwright run | CLOSED |

## Evidence

- E3 `npx vitest run __tests__/project-workspace.test.ts __tests__/project-api-client.test.ts __tests__/project-dashboard-source.test.ts`: 3 files / 23 tests passed.
- E3 `npx tsc --noEmit`: passed.
- E3 `npx vitest run --pool=threads`: 13 files / 89 tests passed.
- E3 `npx eslint app lib __tests__ tests --ignore-pattern 'playwright-report/**' --ignore-pattern 'test-results/**'`: passed with existing `baseline-browser-mapping` age warning.
- E3 `PLAYWRIGHT_PORT=3200 npx playwright test tests/e2e/v2-director-kit.spec.ts --project=chromium --project=mobile-chrome`: 6 passed.
- E3 `npm run build`: passed.
- E3 `git diff --check`: passed.

## Residual Risk

- The backend production `/api/projects` summary can omit handoff fields; frontend normalization intentionally falls back to `false` and `0`.
- Full `npm run lint` can scan generated Playwright report assets in this repo state; source-only lint was used for this slice.

## Next Slice

Add a dashboard filter or sort for handoff blockers so operators can jump directly to projects missing production evidence.
