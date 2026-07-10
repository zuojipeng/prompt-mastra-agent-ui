# Agent Run: Dashboard Handoff Filter

Date: 2026-07-10
Task: JC-T001 Projectized creation workbench v4
Owner: Product Agent + UEAgent + Engineering Agent
Reviewer: Code Review Agent + Test Agent
Decision: SHIP

## Goal

Let operators quickly narrow the Project Dashboard to handoff-ready projects or projects still missing handoff evidence.

## Product Gate

- User job: after handoff readiness is visible, the operator needs a fast way to focus on projects that need evidence repair.
- Scope: dashboard-only handoff filter.
- Non-goals: no backend change, no project schema migration, no automated repair workflow.
- Acceptance:
  - dashboard includes `全部交接 / 可交接 / 缺证据` modes;
  - `缺证据` shows projects with handoff blockers;
  - summary tile shows ready and blocked counts;
  - desktop/mobile DirectorKit E2E still passes.

## UE Gate

- Used a compact segmented control next to the existing stage filter.
- Kept the operational dashboard density intact.
- Used `Handoff` as ready/blocked count: `可交接数/缺证据数`.

## Architecture Gate

- Kept filtering local to `ProjectDashboardPanel`; no new shared abstraction was added.
- Reused `handoffReady` and `handoffBlockingIssueCount` from `LocalProjectWorkspaceSummary`.

## Engineering Gate

Changed files:
- `app/components/ProjectDashboardPanel.tsx`
- `__tests__/project-dashboard-source.test.ts`
- `tests/e2e/v2-director-kit.spec.ts`

## Evidence

- E3 `npx vitest run __tests__/project-dashboard-source.test.ts`: 1 file / 4 tests passed.
- E3 `PLAYWRIGHT_PORT=3200 npx playwright test tests/e2e/v2-director-kit.spec.ts --project=chromium --project=mobile-chrome`: 6 passed.
- E3 `npx tsc --noEmit`: passed.
- E3 `npx vitest run --pool=threads`: 13 files / 90 tests passed.
- E3 `npx eslint app lib __tests__ tests --ignore-pattern 'playwright-report/**' --ignore-pattern 'test-results/**'`: passed with existing `baseline-browser-mapping` age warning.
- E3 `npm run build`: passed.
- E3 `git diff --check`: passed.

## Residual Risk

- `缺证据` currently points to blocked projects but does not yet explain which shot or note is missing. That should be the next slice.

## Next Slice

Add row-level missing evidence reason copy so the dashboard can tell the operator exactly what to fix before handoff.
