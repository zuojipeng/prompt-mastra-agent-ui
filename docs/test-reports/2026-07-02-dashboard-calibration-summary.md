# Test Report: Dashboard Calibration Summary

Date: 2026-07-02
Owner: Test Agent
Scope: project dashboard calibration summary visibility.

## Commands

```bash
npx vitest run __tests__/project-dashboard-source.test.ts __tests__/chatbox-v2-source.test.ts __tests__/project-workspace.test.ts __tests__/project-api-client.test.ts
PLAYWRIGHT_PORT=3200 npx playwright test tests/e2e/v2-director-kit.spec.ts --project=chromium --project=mobile-chrome
npx tsc --noEmit
npx vitest run --pool=threads
npm run lint
npm run build
git diff --check
```

## Results

- Targeted tests: PASS, 4 files / 29 tests.
- Browser E2E: PASS, 6 tests across desktop Chromium and mobile Chrome emulation.
- TypeScript: PASS.
- Full unit suite: PASS, 13 files / 82 tests with `--pool=threads`.
- Lint: PASS with existing `baseline-browser-mapping` update warning.
- Build: PASS.
- Diff whitespace check: PASS.

## Coverage

Validated:
- dashboard source includes calibration count and latest platform/outcome display
- local summaries win when remote summaries have equal timestamps
- browser flow saves calibration evidence and then shows Dashboard `Calibrations` plus `最近校准：Seedance · 通过`

Not validated:
- production Projects API summary parity

## Decision

PASS.
