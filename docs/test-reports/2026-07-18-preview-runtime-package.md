# Test Report: Preview Runtime Package

Status: PASS FOR LOCAL CONTAINER HANDOFF
Date: 2026-07-18
Test Agent: independent verification role

## Automated Evidence

| Check | Result |
| --- | --- |
| Python full regression | PASS - 120 tests, 0 failures |
| Frontend full Vitest regression | PASS - 27 files, 180 tests, 0 failures |
| Runtime plan validator | PASS - valid package plus 3 negative tests; 6 variable names declared and all external authorizations false |
| TypeScript `tsc --noEmit` | PASS |
| ESLint `--quiet` | PASS |
| Production dependency audit | PASS - 0 vulnerabilities |
| Pinned Docker build | PASS - Python 3.12.13 slim Bookworm, non-root runtime |
| Container health | PASS - HTTP 200, preview mode |
| Container unauthorized path | PASS - HTTP 401 |
| Container authorized fixture path | PASS - succeeded, manifest verified, `memory://` asset |
| Container SIGTERM and cleanup | PASS - stopped within 10-second budget and removed |

## Failure And Repair Evidence

- Initial Docker access failed because Docker Desktop was stopped, then because the restricted command sandbox could not access its Unix socket. Docker Desktop was started and only local Docker commands were approved at the host boundary.
- The first immediate curl raced container startup. Inspection showed the process healthy; the committed smoke now polls `/health` for at most 30 seconds.
- The first full frontend command selected an old Node runtime lacking `node:util.styleText`. The same suite passed under the project's supported Node 22.21.1 runtime.
- The first production audit could not resolve npm from the network-restricted sandbox. The approved official-registry audit passed with zero findings.

## Not Executed

- No Railway or Cloudflare resource creation, configuration, domain, secret upload, or deployment.
- No B2 credential read and no B2 write, read, or delete.
- No Runway request, paid call, or retry.
- No public URL, video publication, or Devpost submission.

## Remaining Test Gate

After separate deployment approval: verify Railway root/config detection, Access allow/deny, distributed rate limit, wrong-origin, body limits, health, timeout, feature disablement, redacted logs, deployment-scoped B2 evidence, desktop/mobile Playwright, and rollback against pinned URLs and commit.
