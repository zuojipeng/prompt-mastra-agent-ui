# Test Report: Backblaze Deadline Sprint

Date: 2026-07-31

Status: PASS LOCAL STRUCTURE / RELEASE BLOCKED

## Results

| Check | Result |
| --- | --- |
| Official deadline review | PASS: 2026-08-03 17:00 EDT / 2026-08-04 05:00 GMT+8 |
| Submission strict check | EXPECTED BLOCKED: 4 blockers |
| Deployment strict check | EXPECTED BLOCKED: 5 blockers |
| Demo strict check | EXPECTED BLOCKED: 3 blockers |
| Release evidence strict collector | EXPECTED BLOCKED; clean source and zero tracked-secret findings |
| Operator handoff strict check | EXPECTED BLOCKED at `preview_deployment` |
| Campaign status validator | PASS |
| Existing media duration inspection | PASS: all measured artifacts under three minutes; none is the final narrated video |
| TypeScript | PASS |
| ESLint | PASS |
| Full Vitest regression | PASS: 31 files / 209 tests on Node 22.21.1 |
| Production build | PASS: Next.js 15.5.20 on Node 22.21.1 |

## Interpretation

The failing strict checks are release gates, not test harness failures. They correctly prevent a ready/submitted claim while application access, final video, reviewer handoff, and human approval remain open.

The first regression invocation exposed the host default Node 18.12.1, which is below the Next.js minimum and lacks `node:util.styleText` required by the installed Vitest toolchain. The same commands passed with the project's Node 22.21.1 runtime; use that pinned runtime for the deadline freeze.

No external service was called by these validations.
