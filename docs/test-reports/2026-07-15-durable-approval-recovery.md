# Test Report: Durable Approval and Recovery

Date: 2026-07-15
Status: PASS FOR LOCAL CONTRACT ONLY

## Focused Matrix

| Check | Result |
| --- | --- |
| Canonical mode-0600 marker and restart replay denial | PASS |
| Same approval ID with changed document digest | PASS: denied |
| 16 independent spawn processes | PASS: one consume/provider call, 15 denied |
| Independent 32-process fork attack | PASS: one winner, 31 denied |
| Corrupt marker, final symlink, ancestor symlink, permissive root | PASS: fail closed |
| FIFO private source | PASS: immediate rejection, no hang |
| Expiry or clock regression after publication | PASS: marker burned, no reuse |
| Failure phase/code/provider/cancellation state machine | PASS |
| Actual journal-to-failure and failure-to-recovery binding | PASS |
| Exact owned-key partition and positive absence | PASS |
| Orphan hash and reversed recovery time | PASS: rejected |
| Secret-shaped identifier and URL/token payload | PASS: rejected before publication |
| Ambiguous provider create with complete storage cleanup | PASS: recovery still required |
| Failure/recovery schemas presented to C-022 | PASS: rejected as live evidence |

## Regression

- Durable/failure focused Python: 18 tests passed.
- Durable/failure plus combined transaction Python: 26 tests passed.
- Full Python discovery: 107 tests passed.
- Python compileall: passed.
- Full Node regression: 156 tests passed.
- Production build: passed.
- ESLint on changed Node test/check files: passed (dependency freshness advisory only).
- Live plan remains structurally valid and blocked on 8 gates.
- Submission/deployment/demo drafts remain structurally valid with 7/8/5 blockers; strict live exits 1 as required.
- Staged release evidence: 451 tracked files, 432 text files scanned, 19 binary exclusions, 0 secret findings, and 1 live-evidence blocker.

## Not Proven

Authenticated human identity, real Runway or B2 behavior, remote exactly-once execution, provider reconciliation after an ambiguous request, Linux filesystem behavior in this run, credentials, spend, deployment, publication, claims promotion, or submission.
