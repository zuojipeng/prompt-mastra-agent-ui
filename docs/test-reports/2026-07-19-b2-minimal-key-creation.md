# Test Report: B2 Minimal Key Creation

Status: PASS

Date: 2026-07-19

| Check | Result |
| --- | --- |
| Master configuration owner-only mode 0600 | PASS |
| Exact Bucket ID resolution | PASS |
| Child key creation count | PASS - one |
| Child key expiration | PASS - 30 days |
| Child bucket/prefix restriction | PASS |
| Exact seven-capability allowlist | PASS |
| Child read-only authorization self-check | PASS |
| Project Key ID hash matches private creation record | PASS |
| Project configuration atomic owner-only mode 0600 | PASS |
| Passing canonical scope inspection | PASS |
| Passing 24-hour scope attestation | PASS |
| Credential-scope/guarded-adapter focused suite | PASS - 18 tests |
| Python full regression | PASS - 172 tests |
| Repository secret scan | PASS - 0 findings |
| Secret/token fields in evidence | PASS - absent |
| Execution authority | PASS - false |
| Object operation/deployment/publication/submission | PASS - none |

The earlier broad preset remains rejected evidence and was not reclassified or used for retained-source execution.

The first focused-suite invocation used the system Python and could not import the project-only `genblaze_s3` dependency. Test Agent corrected the invocation to the project virtual environment; the focused 18-test suite and the independent 172-test full regression then passed. This was a local test-environment error, not a product or credential failure.
