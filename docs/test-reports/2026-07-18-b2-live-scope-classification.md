# Test Report: B2 Live Scope Classification

Status: EXPECTED REJECTION

Date: 2026-07-18

| Check | Result |
| --- | --- |
| Authorized request count | PASS - exactly one |
| Authentication | PASS |
| Exact bucket/region/prefix retained | PASS |
| Key identity retained only as SHA-256 | PASS |
| Capability list retained on rejection | PASS |
| Broad bucket mutation authority rejected | PASS |
| Secret value recorded | PASS - false |
| Authorization token recorded | PASS - false |
| Execution authorized | PASS - false |
| Private report regular owner-only mode 0600 | PASS |
| Object read/write/delete | PASS - none |
| Retry/deployment/publication/submission | PASS - none |

The live key is valid but fails least-privilege acceptance. This is a security gate result, not a transport failure.
