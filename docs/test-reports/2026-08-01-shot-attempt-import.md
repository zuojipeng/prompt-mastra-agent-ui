# Test Report: Manual Shot Attempt Import

Date: 2026-08-01
Task: JC-T005
Gate: Engineering / Test

## Acceptance Matrix

| Acceptance criterion | Evidence | Result |
| --- | --- | --- |
| Import provider, model, result, asset, note, cost, and duration | source contract plus browser flow | PASS |
| New attempt becomes selected result and updates existing execution evidence | workspace unit tests | PASS |
| Operator can select an older attempt without losing history | workspace unit tests | PASS |
| Invalid successful/failed attempts are rejected | workspace unit tests | PASS |
| Old workspaces remain readable | full workspace suite | PASS |
| Desktop and mobile persist the attempt and preserve the handoff flow | Playwright Chromium and mobile Chrome | PASS |

## Commands

- `npx vitest run --pool=threads`: 14 files, 97 tests passed.
- `npx eslint app lib __tests__ tests --ignore-pattern 'playwright-report/**' --ignore-pattern 'test-results/**'`: PASS with the existing baseline data age warning.
- `npx tsc --noEmit`: PASS.
- `npm run build`: PASS.
- `PLAYWRIGHT_PORT=3200 npx playwright test tests/e2e/v2-director-kit.spec.ts --project=chromium --project=mobile-chrome`: 6 passed.
- `git diff --check`: PASS.

## Failed Evidence Retained

1. The default shell used Node 18 and could not start current Vitest; Node 22 is the project validation runtime.
2. The existing `node_modules` tree contained mismatched and then partial packages. A clean-cache `npm ci` restored the lockfile environment; no manifest or lockfile change was produced.
3. Browser run 1 reached the imported result but strict text matching saw hidden desktop/mobile duplicates.
4. Browser run 2 reached the full flow but the selected attempt card made the old non-exact `可用` role query ambiguous.
5. Visible-only evidence assertions and exact status-control naming passed on run 3.

Residual risk: this slice verifies manual import only and does not claim generation-provider integration.
