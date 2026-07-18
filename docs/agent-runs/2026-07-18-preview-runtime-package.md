# Agent Run: Preview Runtime Package

## Goal

Turn the guarded Python adapter into a reproducible Railway runtime and verify it locally without creating cloud resources, uploading secrets, writing B2, or invoking Runway.

## Loop Board

Loop: 31
Current gate: Architecture / Engineering / Security / Code Review / Test / Release Preparation
Decision: SHIP RUNTIME PACKAGE AND EVIDENCE; KEEP DEPLOYMENT BLOCKED

| ID | From | To | Level | Request | Close Evidence | Status |
| --- | --- | --- | --- | --- | --- | --- |
| PR1 | Architecture Agent | Engineering Agent | BLOCKER | Keep Railway lifecycle concerns outside the HTTP business module | Dedicated `runtime_service.py` composition root | CLOSED |
| PR2 | Security Agent | Engineering Agent | BLOCKER | Fail before public bind when any preview control is invalid | Runtime config tests and generic error event | CLOSED |
| PR3 | DevOps Agent | Engineering Agent | BLOCKER | Consume platform `PORT` and terminate cleanly on SIGTERM | Range validation, public bind, signal lifecycle test | CLOSED |
| PR4 | Code Review Agent | DevOps Agent | BLOCKER | Do not run the image as root or float runtime dependencies | Non-root user, pinned base image, exact dependency lock | CLOSED |
| PR5 | Test Agent | DevOps Agent | REWORK | Convert manual Docker checks into one repeatable smoke | `npm run hackathon:runtime:smoke` | CLOSED |
| PR6 | Claims Review Agent | Hermes Orchestrator | BLOCKER | Do not promote local container evidence to deployment evidence | Readiness remains `design`; seven external blockers remain | CLOSED |

## Result

- Railway configuration, image build, health path, restart policy, and drain behavior are tracked under the spike service root.
- Runtime startup logs contain no origin, token, header, body, account, provider, or storage identifiers.
- Local smoke uses only a fixed fake token and deterministic in-memory Genblaze evidence.
- The Python runtime packaging blocker is closed; cloud configuration, credentials, deployment, post-deploy smoke, and human release approval remain open.

## Next Owner

Human owner separately decides whether cloud deployment is authorized. DevOps and Test Agents may then configure the external controls and collect pinned post-deploy evidence; no such action is implied by this run.
