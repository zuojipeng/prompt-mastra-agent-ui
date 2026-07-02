# Agent Run: Calibration Capture UI

Date: 2026-07-02
Owner: Product Agent + UEAgent + Engineering Agent
Scope: add a first-class workbench path for capturing platform calibration evidence.

## Loop Board

Loop: 20
Goal: let operators save platform calibration evidence directly from the workbench after a shot is generated.
Current gate: Test
Decision: SHIP

| ID | From | To | Blocking Level | Request | Evidence Required | Status |
| --- | --- | --- | --- | --- | --- | --- |
| L1 | Product Agent | UEAgent | IMPROVEMENT | Put the calibration action near platform feed usage and current shot context | visible source state | CLOSED |
| L2 | UEAgent | Engineering Agent | REWORK | Keep the control lightweight: three outcomes, no large form before the workflow proves itself | source check and typecheck | CLOSED |
| L3 | Code Review Agent | Test Agent | BLOCKER | Verify the UI captures structured evidence through existing workspace persistence | targeted tests and typecheck | CLOSED |

## Product Agent

Status: PASS
Output: Operators can now mark the current selected shot against each platform advice as `通过`, `未通过`, or `不确定`, turning generation results into project evidence.

## UEAgent

Status: PASS
Output: The capture control lives inside the platform advice card and binds to the current shot. It shows whether a material note exists and confirms when evidence is saved.

## Architecture Agent

Status: PASS
Output: Reused `createPlatformCalibrationEvidence`, `appendPlatformCalibrationEvidence`, and the existing project workspace persistence path. No new storage schema version or backend route was introduced.

## Engineering Agent

Status: PASS
Output:
- Added optional calibration rendering to `DirectorKitPlatformAdvicePanel`.
- Added `handleCapturePlatformCalibration` to create and persist structured calibration evidence.
- Refactored workspace persistence into `persistProjectWorkspace` so manual save, feedback iteration, and calibration capture share the same sync path.

## Code Review Agent

Status: PASS
Output: Additive UI and persistence change. It does not alter generation behavior or feedback analytics ingestion.

## Test Agent

Status: PASS
Output:
- `npx vitest run __tests__/chatbox-v2-source.test.ts __tests__/project-workspace.test.ts`: PASS, 2 files / 20 tests.
- `npx tsc --noEmit`: PASS.
- `npx vitest run --pool=threads`: PASS, 13 files / 80 tests.
- `npm run lint`: PASS with existing `baseline-browser-mapping` update warning.
- `npm run build`: PASS.
- `git diff --check`: PASS.

## Hermes Decision

Decision: SHIP
Next owner: Hermes Orchestrator
Next smallest action: capture browser evidence for calibration UI and harden mobile flow.
Residual risk: The capture UI is intentionally lightweight; richer failure reason editing and platform-specific settings can be added after the workflow gets real usage.
