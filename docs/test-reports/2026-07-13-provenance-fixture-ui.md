# Test Report: Provenance Fixture UI

Date: 2026-07-13
Gate: UE / Engineering / Code Review / Test
Status: PASS FOR FIXTURE UI

## Matrix

| Check | Command | Result |
| --- | --- | --- |
| Provenance request, response, and fixture units | `npx vitest run __tests__/provenance-run-contract.test.ts __tests__/provenance-fixture-transport.test.ts __tests__/shot-provenance-source.test.ts --pool=threads` | PASS, 3 files / 16 tests |
| Frontend regression | `npm test -- --pool=threads` | PASS, 16 files / 108 tests |
| TypeScript | `npx tsc --noEmit` | PASS |
| Scoped lint | `npx eslint ...provenance files... tests/e2e/v2-director-kit.spec.ts` | PASS; dependency freshness warning only |
| Genblaze regression | `PYTHONPATH=. /private/tmp/jingci-genblaze-venv/bin/python -m unittest discover -s tests -v` | PASS, 9 tests |
| Browser regression | `PLAYWRIGHT_PORT=3200 npx playwright test tests/e2e/v2-director-kit.spec.ts --project=chromium --project=mobile-chrome` | PASS, 6 tests |
| Final provenance visual path | same Playwright command with `--grep "happy path"` | PASS, desktop and mobile |
| Production build | `npm run build` | PASS, static export complete |
| Patch hygiene | `git diff --check` | PASS before report update |

## Browser Evidence

- `output/playwright/provenance-desktop.png`
- `output/playwright/provenance-mobile.png`

The screenshots prove fixture disclosure, verified state, attempt 3, failed-attempt parent lineage, evidence locations, hash wrapping, and visible recovery/retry actions at both widths.

## Failed Evidence Retained

1. The first browser run failed to start with `listen EPERM 127.0.0.1:3200` inside the sandbox. The approved local-server execution path passed; no product repair was involved.
2. Two attempts to import TSX directly in Vitest failed because this repository preserves JSX and has no TSX transform/jest-dom setup for unit tests. The suite was changed to the repository's existing source-contract pattern, while behavior moved to Playwright. Global test configuration was not broadened for one component.

## Residual Risk

Fixture transport proves UI behavior only. It does not prove provider, B2, remote bytes, authentication, persistence, local HTTP timeout, deployment, or production behavior.
