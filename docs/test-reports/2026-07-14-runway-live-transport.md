# Test Report: Guarded Runway Live Transport

Date: 2026-07-14
Status: PASS FOR OFFLINE HARNESS ONLY

## Focused Matrix

| Check | Result |
| --- | --- |
| Current REST create method/path/body and auth/version headers | PASS |
| DELETE 204 and idempotent 404 | PASS |
| Typed 400/401/429/503 mapping with body redaction | PASS |
| Manual redirect validation before request and no media auth headers | PASS |
| Private DNS rejection before fetch | PASS |
| Declared oversize, truncated, and undeclared overflow bodies | PASS |
| Connection timeout sanitization and shared redirect-chain deadline | PASS |
| Deterministic environment-free plan | PASS |
| Unauthorized live access order | PASS |
| Strict redacted live configuration | PASS |
| ffprobe stream/dimensions/duration contract | PASS |
| Minimal ffprobe environment and file-size-limited output | PASS |
| Fake live smoke one create and temporary cleanup | PASS |
| Provider active-failure cancellation and post-success preservation | PASS |
| Malformed terminal-success output preserved without DELETE | PASS |
| Slow stream deadline and deterministic response close | PASS |
| Read-time timeout typing and DNS deadline before fetch | PASS |
| Stuck DNS resolver child kill, reap, and bounded parent return | PASS |
| Real child-process ffprobe output overflow | PASS |

Focused result: 35 tests passed across transport/harness and provider contracts.

## Regression

- Full Python discovery: 70 tests passed.
- Python compileall: passed.
- Frontend Vitest: 21 files / 128 tests passed under Node 22.21.1.
- Production static build: passed.
- Submission/deployment draft gates: passed with 7 and 8 preserved live blockers.
- `--plan`: passed with `network: false`.
- Unconfirmed `--live`: expected exit 2 before configuration access.
- Staged release evidence: 398 text files scanned, 0 secret findings, live blockers preserved.

## Not Proven

Real DNS/TLS/HTTP behavior, output host stability, Runway authentication, generation quality, billing, live cancellation, actual MP4 probing, B2 persistence, production egress, or public deployment.
