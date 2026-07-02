# Test Report: Calibration UI Browser Evidence

Date: 2026-07-02
Owner: Test Agent
Scope: desktop/mobile browser validation for platform calibration capture UI.

## Commands

```bash
npx vitest run __tests__/chatbox-v2-source.test.ts
PLAYWRIGHT_PORT=3200 npx playwright test tests/e2e/v2-director-kit.spec.ts --project=chromium --project=mobile-chrome
node /private/tmp/capture-calibration-ui.mjs
npx tsc --noEmit
npx vitest run --pool=threads
npm run lint
npm run build
git diff --check
```

## Results

- Source regression test: PASS, 1 file / 7 tests.
- Browser E2E: PASS, 6 tests across desktop Chromium and mobile Chrome emulation.
- Browser screenshots: PASS, desktop and mobile screenshots captured.
- TypeScript: PASS.
- Full unit suite: PASS, 13 files / 80 tests with `--pool=threads`.
- Lint: PASS with existing `baseline-browser-mapping` update warning.
- Build: PASS.
- Diff whitespace check: PASS.

## Evidence

- `output/playwright/calibration-capture-desktop.png`
- `output/playwright/calibration-capture-mobile.png`

## Notes

- First Playwright attempt on port 3100 hit an unrelated existing Daily Discovery app. Re-run used `PLAYWRIGHT_PORT=3200`.
- Headless screenshot capture failed with the existing macOS Chromium `ThermalStateObserverMac` / `SIGTRAP`; headed Chromium fallback succeeded.

## Coverage

Validated:
- calibration button is visible in platform advice cards
- clicking `通过` persists `platformCalibrations` with `validated` outcome
- mobile Work view does not show the fixed action bar over content
- existing DirectorKit happy path, project restore, and retry flows still pass in desktop and mobile browser projects

Not validated:
- production Projects API persistence

## Decision

PASS.
