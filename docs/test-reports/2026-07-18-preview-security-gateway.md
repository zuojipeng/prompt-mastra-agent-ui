# Test Report: Preview Security Gateway

Status: PASS FOR CODE-ONLY HANDOFF
Date: 2026-07-18
Test Agent: independent verification role

## Automated Evidence

| Check | Result |
| --- | --- |
| Focused gateway/client/deployment/UI tests | PASS |
| Full Vitest regression | PASS — 65 suites, 177 tests, 0 failures |
| TypeScript `tsc --noEmit` | PASS |
| ESLint `--quiet` | PASS |
| Next.js preview production build | PASS — Next 15.5.20, lint and type validation enabled |
| Wrangler Pages Functions build | PASS — Wrangler 4.46.0 |
| Generated Function routes | PASS — only `/api/provenance/*` |
| Deployment draft validator | PASS with 8 explicit external blockers |
| Claims approval validator | PASS; all excluded authorizations remain false |
| Operator handoff validator | PASS; current stage remains `preview_deployment` |
| Production dependency audit | PASS — 0 vulnerabilities |
| Full dependency audit | PASS — 0 vulnerabilities after non-breaking fixes |

## Failure And Repair Evidence

- Initial gateway regression failed because a normalized upstream auth failure leaked its body. Fixed and retested.
- Initial full regression failed on one stale deployment-blocker assertion. Updated to the split controls and added a denial for the completed live-evidence blocker.
- Next.js security upgrade initially broke the ESLint package export shape. Replaced direct flat imports with `FlatCompat`; lint and build pass.

## Not Executed

- No Cloudflare or Railway deployment.
- No Cloudflare Access policy or rate-limit rule creation.
- No Runway request or paid API call.
- No B2 write, read, delete, key creation, or credential use.
- No public URL, public video, or Devpost submission.

## Remaining Test Gate

After separate deployment approval: run Access allow/deny, same-origin, rate-limit, health, timeout, disable-switch, redacted-log, desktop/mobile Playwright, B2 evidence-mode, and rollback smokes against pinned URLs and commit.
