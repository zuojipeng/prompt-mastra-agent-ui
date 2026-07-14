# Test Report: Offline Runway-to-B2 Transaction

Date: 2026-07-14
Status: PASS FOR OFFLINE COMPOSITION ONLY

## Focused Matrix

| Check | Result |
| --- | --- |
| One fake create/download and exact probe input | PASS |
| Probe rejection prevents storage writes | PASS |
| Sync and async caller retry override prevention | PASS |
| Asset and manifest read-back, digest, verification, and lineage | PASS |
| Signed source URL and token exclusion | PASS |
| Asset and manifest commit-then-error cleanup | PASS |
| Asset and manifest corruption cleanup | PASS |
| Primary plus cleanup failure preservation | PASS |
| Backend close failure after storage cleanup | PASS |
| False-negative cleanup detection | PASS |
| Out-of-prefix recovery handle without unsafe deletion | PASS |

Focused result: 11 tests passed.

## Regression

- Full Python discovery: 81 tests passed.
- Python compileall: passed.
- Independent Architecture and Test red teams: PASS.
- Submission and deployment blocker counts remain 7 and 8.
- Staged release evidence: 403 text files scanned, 19 binary exclusions, 0 secret findings.

## Not Proven

Real ffprobe, Runway request or generation, provider billing, Backblaze B2 upload/read-back/delete, production network behavior, deployment, or submission.
