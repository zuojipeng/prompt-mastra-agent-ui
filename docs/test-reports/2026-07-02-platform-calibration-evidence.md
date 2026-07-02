# Test Report: Platform Calibration Evidence

Date: 2026-07-02
Owner: Test Agent
Scope: structured platform calibration evidence in project workspace.

## Commands

```bash
npx vitest run __tests__/project-workspace.test.ts __tests__/project-api-client.test.ts
npx tsc --noEmit
npx vitest run --pool=threads
npm run lint
npm run build
git diff --check
```

## Results

- Targeted tests: PASS, 2 files / 19 tests.
- TypeScript: PASS.
- Full unit suite: PASS, 13 files / 78 tests with `--pool=threads`.
- Lint: PASS with existing `baseline-browser-mapping` update warning.
- Build: PASS.
- Diff whitespace check: PASS.

## Coverage

Validated:
- create platform calibration evidence
- append calibration evidence without changing project identity
- summarize calibration count, latest outcome, and latest platform
- reject invalid calibration payloads
- normalize cloud summaries with missing calibration fields

Not validated:
- UI entry flow
- production Projects API persistence

## Decision

PASS.
