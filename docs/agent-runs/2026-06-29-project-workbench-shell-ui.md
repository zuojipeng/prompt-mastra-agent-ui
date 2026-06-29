# Agent Run: Project Workbench Shell UI

Date: 2026-06-29
Owner: Engineering Agent
Scope: integrate the presentational Project Workbench shell into the visible UI.

## Capability Register

| Agent | Tool / Skill / MCP | Level | Available | Evidence it can provide | Limits | Reviewer |
| --- | --- | --- | --- | --- | --- | --- |
| Engineering Agent | local code edit, TypeScript, Next build | C2 | yes | E3 implementation/build evidence | no backend behavior touched | Code Review Agent |
| Test Agent | Vitest, ESLint, Playwright headed Chromium | C2 | yes | E3 tests and screenshots | headless Chromium failed locally | Hermes |
| UEAgent | browser screenshot inspection | C2 | yes | E3 visual evidence | no Figma artifact in this slice | Product Agent |

## Evidence Index

| Evidence ID | Claim | Level | Source / Command / Tool | Result | Owner | Reviewer |
| --- | --- | --- | --- | --- | --- | --- |
| EV-JC-011 | Shell component renders project title, sync, metrics, and stages | E3 | `app/components/ProjectWorkbenchShell.tsx`, `__tests__/project-workbench-shell-source.test.ts` | Added | Engineering Agent | Code Review Agent |
| EV-JC-012 | ChatBox uses derived shell state for the top project summary | E3 | `app/components/ChatBox.tsx` | Integrated | Engineering Agent | Architecture Agent |
| EV-JC-013 | Unit/source tests pass | E3 | `npm test` | PASS, 9 files / 57 tests | Test Agent | Hermes |
| EV-JC-014 | Type/build/lint pass | E3 | `npx tsc --noEmit`, `npm run lint`, `npm run build` | PASS; lint has existing baseline-browser-mapping warning | Test Agent | Code Review Agent |
| EV-JC-015 | Desktop and mobile shell screenshots render | E3 | `output/playwright/workbench-shell-desktop.png`, `output/playwright/workbench-shell-mobile.png` | PASS | Test Agent | UEAgent |

## Loop Board

Loop: 4
Goal: make the Project Workbench shell visible while preserving generation and persistence behavior.
Current gate: Test
Decision: CONTINUE

| ID | From | To | Blocking Level | Request | Evidence Required | Status |
| --- | --- | --- | --- | --- | --- | --- |
| L1 | Engineering Agent | Code Review Agent | REWORK | Add shell component without broad `ChatBox` rewrite | Scoped diff and passing tests | CLOSED |
| L2 | Test Agent | Engineering Agent | BLOCKER | Capture browser evidence for UI change | Desktop/mobile screenshots | CLOSED |
| L3 | Test Agent | Hermes | IMPROVEMENT | Record headless Chromium local failure | Failure note and headed screenshot fallback | CLOSED |

## Product Agent

Status: PASS
Output: The UI now puts project identity, sync state, stage, health, progress, and stage navigation at the top of the workbench.
Assignments raised: Next product slice should make feedback insight drive a next-iteration action.

## UEAgent

Status: PASS
Output: Desktop and mobile screenshots show the shell rendering with no blank state or incoherent overlap. The mobile fixed action sheet remains visible and should be refined in a later visual polish slice.
Assignments raised: Mobile action sheet refinement is an improvement, not a blocker.

## Architecture Agent

Status: PASS
Output: Integration follows the architecture note. `ChatBox` still owns side effects; `ProjectWorkbenchShell` is presentational.
Assignments raised: None.

## Engineering Agent

Status: PASS
Output:
- Added `app/components/ProjectWorkbenchShell.tsx`.
- Updated `app/components/ChatBox.tsx` to use `deriveWorkbenchStages`, `deriveProjectShellSummary`, and `deriveProjectSyncDisplay`.
- Added `__tests__/project-workbench-shell-source.test.ts`.

## Code Review Agent

Status: PASS
Output: Scope is controlled. No generation, persistence, backend API, or feedback behavior changed.
Assignments raised: None.

## Test Agent

Status: PASS
Output:
- `npx vitest run __tests__/workbench-shell.test.ts __tests__/project-workbench-shell-source.test.ts`: PASS, 6 tests.
- `npx tsc --noEmit`: PASS.
- `npm test`: PASS, 9 files / 57 tests.
- `npm run lint`: PASS, existing `baseline-browser-mapping` warning only.
- `npm run build`: PASS.
- Desktop screenshot: `output/playwright/workbench-shell-desktop.png`.
- Mobile screenshot: `output/playwright/workbench-shell-mobile.png`.

Note: headless Chromium failed locally with a macOS `ThermalStateObserverMac` / `SIGTRAP` browser launch issue. Headed Chromium screenshot fallback succeeded.

## DevOps Agent

Status: NOT RUN
Output: No production deploy in this UI slice.
Assignments raised: Production Projects API release verification remains separate.

## Operator Agent

Status: PASS
Output: The demo path now starts with a clearer project shell.
Assignments raised: Update demo script after the next product-visible slice.

## Hermes Decision

Decision: CONTINUE
Next owner: Product Agent + UEAgent
Next smallest action: choose and specify the next product-visible slice, preferably feedback-informed next iteration or mobile action sheet refinement.
Task ledger update: `docs/team-os/task-ledger.md`
Residual risk: history panel still shows `Failed to fetch` in local dev when remote history is unavailable; this predates the shell integration and should be handled in a separate reliability slice.
