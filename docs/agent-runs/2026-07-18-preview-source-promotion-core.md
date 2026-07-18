# Agent Run: Preview Source Promotion Core

## Goal

Prepare the persistent reviewed-source upload logic without credentials, network access, a live CLI, or mutation authority.

## Loop Board

Loop: 33
Decision: SHIP OFFLINE CORE; REQUIRE A NEW APPROVAL CONTRACT BEFORE LIVE COMPOSITION

| ID | From | To | Level | Request | Close Evidence | Status |
| --- | --- | --- | --- | --- | --- | --- |
| SP1 | Security Agent | Architecture Agent | BLOCKER | Do not reuse paid-generation approval scopes for persistent storage | Live composition deferred to a dedicated approval schema | CLOSED |
| SP2 | Code Review Agent | Engineering Agent | BLOCKER | Refuse overwrite before put | Existing-key preservation test | CLOSED |
| SP3 | Test Agent | Engineering Agent | BLOCKER | Verify exact bytes and digest after put | Read-back success and corruption cleanup tests | CLOSED |
| SP4 | Claims Review Agent | Hermes Orchestrator | BLOCKER | Keep offline core distinct from B2 evidence | Plan declares no network and no live entrypoint | CLOSED |

## Result

The promotion primitive is ready for a later approval-bound composition root. No environment access, source-file read, B2 backend construction, or result publication is reachable from the CLI today.
