# Test Report: Combined Transaction Plan

Date: 2026-07-15
Status: PASS FOR PLAN/FAKE TRANSACTION ONLY

## Focused Matrix

| Check | Result |
| --- | --- |
| Canonical approval shape, scope, run/commit, expiry, attempt, and cost | PASS |
| Atomic in-memory approval consumption and sequential reuse denial | PASS |
| Fake-only dependency enforcement before create | PASS |
| One provider create, probe, two writes/read-backs, lineage, and cleanup | PASS |
| Probe/storage/cleanup failures return no fixture success | PASS |
| Storage exception canaries do not escape through Genblaze logs, stdout/stderr, or the final exception | PASS |
| Exclusive owner-only fixture output | PASS |
| Plan CLI exposes no live mode, network, credential, or spend behavior | PASS |
| Fixture schema is rejected by the C-022 live validator | PASS |

## Regression

- Combined plus offline focused Python: 19 tests passed.
- Full Python discovery: 89 tests passed.
- Python compileall: passed.
- Node live contract/readiness: 31 tests passed.
- Full Node regression: 155 tests passed.
- Production build: passed.
- ESLint on changed Node test/check files: passed (dependency freshness advisory only).
- Combined plan command: passed without credentials or network.
- Live plan gate: structurally valid with 8 blockers.
- Staged release evidence: 442 tracked files, 423 text files scanned, 19 binary exclusions, 0 secret findings, and 1 live-evidence blocker.
- The isolated `.venv` was recreated with `genblaze==0.4.1`; the first install failed on the local CA chain, then succeeded using macOS `/etc/ssl/cert.pem` while retaining TLS verification.

## Not Proven

Durable or concurrent cross-process approval consumption, failure/recovery records, real ffprobe, Runway request or billing, B2 preflight/upload/read-back/delete, live evidence, deployment, publication, or submission.
