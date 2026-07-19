# Test Report: Preview Runtime Source Binding

Status: PASS

Date: 2026-07-19

| Check | Result |
| --- | --- |
| Focused runtime-plan tests | PASS - 5/5 |
| Exact source substitution rejection | PASS - key, hash, size, provider, model, visibility, commit, deployment state |
| Extra reviewed-source field rejection | PASS |
| Runtime plan validator | PASS - one exact source, 16 variables, no deployment authority |
| Deployment readiness validator | PASS - design state, 7 blockers |
| Operator handoff validator | PASS - `preview_deployment`, execution false |
| Node full regression | PASS - 27 files, 183 tests |
| Python full regression | PASS - 172 tests |
| Release-evidence secret scan | PASS - zero findings |

The first focused Vitest invocation used the terminal's old Node runtime and failed before test collection because `node:util.styleText` was unavailable. The supported Node 22.21.1 rerun passed. The first full Node run then correctly found stale operator-handoff source binding; regenerating that derived artifact closed the failure, and the complete rerun passed without relaxing validation.
