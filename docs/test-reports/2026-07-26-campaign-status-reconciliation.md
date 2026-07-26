# Test Report: Campaign Status Reconciliation

Date: 2026-07-26

Status: PASS LOCAL / CLOUD SMOKE BLOCKED

## Results

| Check | Result |
| --- | --- |
| Focused campaign status tests | PASS, 5 files / 16 tests |
| Full Vitest regression | PASS, 30 files / 201 tests |
| ESLint | PASS |
| TypeScript | PASS |
| Production build | PASS |
| Preview deployment result validator | PASS |
| Historical deployment packet validator | PASS |
| Deployment readiness validator | PASS, 5 explicit blockers |
| Operator handoff validator | PASS, current stage `preview_deployment` |
| Generated public status validator | PASS |
| Claims approval validator | PASS, all expanded authorities false |

## Negative Coverage

- A blocker-free `deployed-blocked` state is rejected.
- A promoted or retried preview result is rejected.
- Missing cleanup and removed preview blockers are rejected.
- A changed historical packet blocker snapshot is rejected.
- Unknown current deployment blockers cannot be hidden in the public summary.
- Deployment cannot advance the handoff until strict preview readiness passes.

No external service was called.
