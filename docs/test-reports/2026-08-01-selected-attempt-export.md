# Test Report: Selected Attempt Export

Date: 2026-08-01
Task: JC-T006
Gate: Engineering / Code Review / Test

## Acceptance Matrix

| Acceptance criterion | Evidence | Result |
| --- | --- | --- |
| Checklist includes selected provider, model, status, asset, cost, and duration | export unit test | PASS |
| Project snapshot includes the same selected-result evidence | export unit test | PASS |
| Operator handoff includes the same selected-result evidence | export unit test | PASS |
| Missing or stale selected IDs do not fall back to another attempt | negative export unit test | PASS |
| Workbench passes current attempts and selection into export context | source contract test | PASS |
| Existing exports remain compatible | full unit/source suite and production build | PASS |

## Commands

- `npm test -- --run __tests__/director-kit-export.test.ts __tests__/chatbox-v2-source.test.ts --pool=threads`: 2 files, 22 tests passed.
- `npm test -- --pool=threads`: 14 files, 99 tests passed.
- `npm run lint`: PASS with the existing `baseline-browser-mapping` data-age warning.
- `npx tsc --noEmit`: PASS.
- `npm run build`: PASS.
- `git diff --check`: PASS.

## Browser Scope

Playwright was not repeated because this slice adds no UI, interaction, layout, routing, or clipboard trigger. The existing copy actions are unchanged; source wiring and pure export assertions cover the changed boundary.

## Failed Evidence Retained

The first targeted commands inherited an older system Node that lacks `node:util.styleText`. Re-running with the repository validation runtime, Node 22.21.1, passed. This was an environment selection failure, not a product failure.

Residual risk: clipboard content is asserted through its pure builder and source wiring rather than a browser clipboard read.
