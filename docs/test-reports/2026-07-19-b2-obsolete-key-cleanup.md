# Test Report: B2 Obsolete Key Cleanup

Status: PASS

Date: 2026-07-19

| Check | Result |
| --- | --- |
| Administrator authorization | PASS |
| Complete key-list query | PASS - one page |
| Rejected Key ID SHA-256 match | PASS - unique |
| `jingci-preview/` prefix match | PASS |
| Dangerous capability subset match | PASS |
| Active minimal-key exclusion | PASS |
| v4 incompatibility handling | PASS - stopped, no deletion |
| v3 traditional-key deletion | PASS |
| Active project Key ID hash unchanged | PASS |
| Local `.env.b2-admin.local` removal | PASS |
| Private cleanup evidence mode | PASS - owner-only 0600 |
| Python full regression | PASS - 172 tests |
| Repository secret scan | PASS - 0 findings |
| Secret/token recording | PASS - false |
| Object operation/deployment | PASS - none |

The cleanup report is ignored by Git and contains no application key or authorization token.
