# Test Report: Dashboard Handoff Reasons

Date: 2026-07-11
Task: JC-T001
Gate: Engineering / Test

## Acceptance Matrix

| Acceptance criterion | Evidence | Result |
| --- | --- | --- |
| Pending shots name the missing action | workspace unit test and browser dashboard assertion | PASS |
| Generated/usable shots without notes name missing result evidence | workspace unit test | PASS |
| Failed shots without notes name missing failure evidence | workspace unit test | PASS |
| Old cloud summaries remain compatible | API client normalization tests | PASS |
| Dashboard displays and searches blocking reasons | source contract and browser flow | PASS |
| Desktop and mobile preserve blocked and ready filter behavior | Playwright Chromium and mobile Chrome | PASS |

## Commands

- `PATH=...node/v22.21.1/bin:$PATH npx vitest run __tests__/project-workspace.test.ts __tests__/project-api-client.test.ts __tests__/project-dashboard-source.test.ts --pool=threads`: 3 files, 26 tests passed.
- `PATH=...node/v22.21.1/bin:$PATH npx vitest run --pool=threads`: 13 files, 92 tests passed.
- `PATH=...node/v22.21.1/bin:$PATH npx tsc --noEmit`: PASS.
- `PATH=...node/v22.21.1/bin:$PATH npx eslint app lib __tests__ tests --ignore-pattern 'playwright-report/**' --ignore-pattern 'test-results/**'`: PASS with existing baseline-browser-mapping age warning.
- `PATH=...node/v22.21.1/bin:$PATH npm run build`: PASS.
- `PLAYWRIGHT_PORT=3200 npx playwright test tests/e2e/v2-director-kit.spec.ts --project=chromium --project=mobile-chrome`: 6 passed.
- `git diff --check`: PASS.

## Failed Evidence Retained

1. The first default-shell Vitest command used an old Node runtime and failed because `node:util.styleText` was unavailable. Re-running with the project Node 22 path passed.
2. Browser attempt 1 opened the dashboard before the project had been saved, correctly showing zero projects.
3. Browser attempt 2 revealed mobile Save was unavailable from the Execute tab and the retained `blocked` filter correctly hid the later ready project.
4. The final browser flow saves from Work, validates the blocked reason, resets the handoff filter, and passes the later ready-state assertions.

Residual risk: backend Projects API parity remains the next slice; this report does not claim production cloud summaries already contain reasons.
