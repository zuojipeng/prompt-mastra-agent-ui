# Test Report: Approval Contract Parity

Date: 2026-08-16
Gate: Engineering / Code Review / Test

## Results

- Targeted Vitest: PASS, 35/35.
- Full Vitest: PASS, 111/111.
- `npx tsc --noEmit`: PASS.
- Scoped ESLint: PASS; only the existing stale browser-mapping data notice was emitted.
- `npm run build`: PASS.
- Playwright desktop/mobile DirectorKit E2E: PASS, 6/6.
- Backend local Worker approval smoke: PASS, 18/18 in commit `c434ddc`.
- Backend production health: PASS.
- Backend production approval smoke: PASS, 18/18 against Worker version `283c2a6e-73f2-4d5e-8375-dcb89d5496a1`.

## Failed Evidence Retained

- The first targeted Vitest run used the shell's older Node runtime and stopped before test collection because `node:util.styleText` was unavailable. The project-standard Node 22 run executed normally.
- The first Playwright run could not bind `127.0.0.1:3100` inside the sandbox (`EPERM`). Approved local execution passed all six tests.
- Strict validation exposed a stale fixture whose receipt asset did not match the selected attempt asset. The fixture was corrected; this is evidence that the new rejection path is active.

## Release Status

Frontend evidence level: E3 tested build and browser behavior. Backend evidence level: E5 production behavior with successful cleanup.
