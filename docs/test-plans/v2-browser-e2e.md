# Test Plan · V2 Browser E2E

Owner: Test Agent
Scope: Slice 3 browser journey coverage

## Goal

Prove the V2 DirectorKit user journey works in a real browser, not only through static bundle checks or API contract tests.

## Current Capability

Status: AUTOMATION READY

The repo currently has:
- Vitest unit/source tests
- Static smoke test
- Live API E2E scripts

The repo intentionally uses Playwright for this gate rather than Cypress.

Readiness command:

```bash
npm run test:e2e:browser:check
```

Expected current result:
- PASS after Playwright installation.

Release gate command:

```bash
npm run qa:v2
```

Expected current result:
- PASS when API and browser checks both pass.

## Recommended Automation Stack

Preferred:
- Playwright with Chromium

Setup:

```bash
npm install -D @playwright/test
npx playwright install chromium
```

Proposed scripts:

```json
{
  "test:e2e:browser": "playwright test",
  "test:e2e:browser:ui": "playwright test --ui"
}
```

## Target Test Cases

### BE2E-001: V2 Happy Path

Given the app is open
When the user enters a valid creative
And submits for diagnosis
Then the loading panel appears
And the diagnosis report appears
And the user can continue to reconstruct versions
And selecting a version enables the result action
And the DirectorKit result appears

Assertions:
- `正在生成导演执行包`
- `创意体检报告`
- `选择重构版本`
- radio option can be selected
- `导演执行包`
- at least one shot card or fallback appears

### BE2E-002: Validation Error

Given the input is empty
When the user submits
Then an alert shows `请输入视频创意`
And no API request is required

### BE2E-003: Recoverable API Error

Given the V2 API returns 502 or network error
When the user submits
Then an alert appears
And the original input remains
And `重试生成` is enabled

### BE2E-004: Keyboard Selection

Given reconstruct versions are visible
When the user focuses a version card
And presses Enter, Space, or arrow keys
Then selection changes
And the confirm button becomes enabled

### BE2E-005: Mobile Layout

Given a mobile viewport
When the V2 flow is used
Then target controls wrap
And reconstruct cards stack vertically
And result text does not overflow

## Test Data

Default creative:

```text
废土小镇里，一个旧清洁机器人守护红裙人偶
```

Default target:
- Duration: `30s`
- Type: `废土`

## Manual Evidence Requirements

Until browser E2E is automated, a manual report must include:
- Environment URL
- Browser and viewport
- Steps executed
- Pass/fail for BE2E-001 through BE2E-005
- Screenshots or clear textual evidence for each major screen
- Any console errors
- Tester and timestamp

Use:

```text
docs/test-reports/templates/v2-browser-manual.md
```

## Exit Criteria

Release cannot pass the browser gate unless one of these is true:
- Playwright browser E2E passes, or
- Hermes records a manual browser report and L0 explicitly waives automation for the release.
