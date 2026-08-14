# Test Report: Shot Delivery Approval

Date: 2026-08-14
Task: JC-T008
Gate: Engineering / Code Review / Test / Ops

## Acceptance Matrix

| Acceptance criterion | Evidence | Result |
| --- | --- | --- |
| Only the selected usable attempt can be approved | workspace domain tests | PASS |
| Approval requires a human decision note | workspace domain and source tests | PASS |
| Switching selected attempt invalidates old approval | workspace domain test | PASS |
| Checklist, snapshot, and handoff export only matching approval | export tests | PASS |
| UI states the non-cryptographic evidence boundary | source test and browser flow | PASS |
| Desktop and mobile approval flows persist the receipt | Playwright Chromium and mobile happy paths | PASS |
| Existing project tests and production build remain valid | full suite, typecheck, lint, build | PASS |

## Commands

- `PATH=/Users/edy/.nvm/versions/node/v22.21.1/bin:$PATH npm test`: PASS, 14 files / 104 tests.
- `PATH=/Users/edy/.nvm/versions/node/v22.21.1/bin:$PATH npx tsc --noEmit`: PASS.
- Scoped ESLint over changed source and test files: PASS with the existing baseline-browser-mapping data-age warning.
- `PATH=/Users/edy/.nvm/versions/node/v22.21.1/bin:$PATH npm run build`: PASS.
- `PLAYWRIGHT_PORT=3000 npx playwright test tests/e2e/v2-director-kit.spec.ts`: first run 4 passed / 2 failed on ambiguous hidden-workspace locators.
- `PLAYWRIGHT_PORT=3000 npx playwright test tests/e2e/v2-director-kit.spec.ts --grep 'happy path'`: PASS, desktop and mobile.
- `git diff --check`: PASS.

## Failed Evidence Retained

- Node 18 could not start the current Vitest dependency because `node:util.styleText` is unavailable; the project-configured Node 22 run passed.
- The first Playwright run proved both responsive workspaces remain in the DOM and exposed an unscoped locator. The locator was repaired to target visible controls; no product UI duplication was visible.
- Sandbox-local Playwright could not bind its configured web server. Approved localhost execution against the existing server passed.

## Release Status

The frontend slice is ready to commit and push. No production deployment was requested or performed.
