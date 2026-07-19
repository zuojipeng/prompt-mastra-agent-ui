# Test Report: B2 Retained Source Promotion

Status: PASS

Date: 2026-07-19

| Check | Result |
| --- | --- |
| Approved Git commit | PASS - exact clean commit |
| Private source mode and link count | PASS - owner-only 0600, one link |
| Source size | PASS - 1,044,064 bytes |
| Source SHA-256 | PASS - `ca8ea95388d2e2f943f628ec6ca8bf9386baad8862b54ce26764675fa2b438f6` |
| Credential scope review | PASS - `scope-review-20260719-minimal-key` |
| Target overwrite refusal | PASS - target absent before upload |
| Transport retry bound | PASS - `total_max_attempts=1` |
| Exact-key upload | PASS |
| Full-object read-back | PASS |
| Read-back SHA-256 | PASS - identical |
| Retained private state | PASS - `retained=true` |
| Private result evidence | PASS - owner-only 0600, `live_private` |
| Other-object operation | PASS - none |
| Deployment/publication/submission | PASS - none |
| Python full regression | PASS - 172 tests |
| Repository release-evidence secret scan | PASS - 529 text files, 19 binary exclusions, 0 findings |
| Release blockers preserved | PASS - 4 submission blockers, 7 deployment blockers |

The private approval, marker, scope record, and terminal result are ignored by Git. This report contains no B2 application key, authorization token, or private object contents.

The first attempted scan command, `npm run hackathon:secret-scan`, does not exist and returned exit 1 without scanning. The repository's actual collector, `npm run hackathon:evidence`, was then run successfully and produced the results above.
