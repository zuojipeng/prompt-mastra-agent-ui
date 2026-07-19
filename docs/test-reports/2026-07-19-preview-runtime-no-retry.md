# Test Report: Preview Runtime No-Retry Transport

Status: PASS

Date: 2026-07-19

| Check | Result |
| --- | --- |
| Focused B2/config tests | PASS - 10/10 |
| Focused runtime-plan tests | PASS - 6/6 |
| Base Botocore setting preservation | PASS - connect timeout retained |
| Retry policy | PASS - `total_max_attempts=1`, standard mode |
| Live default factory | PASS - no-retry subclass |
| Retry-widening mutation test | PASS |
| Runtime validator | PASS |
| Python full regression | PASS - 173 tests |
| Node full regression | PASS - 27 files, 184 tests |
| External I/O | PASS - none |

An initial Node mutation test replaced only the first class-name occurrence and therefore expected one extra error that the mutated source did not warrant. Review strengthened the validator to require both the subclass declaration and live default factory, then changed the mutation to replace all occurrences. The corrected focused and full suites passed.
