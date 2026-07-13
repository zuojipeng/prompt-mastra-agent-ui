# Agent Run: Provenance HTTP Client

## Goal

Connect the selected-shot workflow to the local Python adapter only when an explicit loopback environment variable is present, while preserving fixture as the honest default.

## Loop Board

Loop: 4
Current gate: Test
Decision: SHIP CLIENT, CONTINUE TO LOCAL CROSS-PROCESS BROWSER E2E

| ID | From | To | Level | Request | Close Evidence | Status |
| --- | --- | --- | --- | --- | --- | --- |
| PC1 | Architecture Agent | Engineering Agent | BLOCKER | Allow loopback HTTP only | URL validation and tests | CLOSED |
| PC2 | Code Review Agent | Engineering Agent | BLOCKER | Reject response identity drift | Failed-run regression | CLOSED |
| PC3 | Code Review Agent | Engineering Agent | BLOCKER | Make invalid configured URL recoverable | Visible failed run | CLOSED |
| PC4 | Test Agent | Engineering Agent | BLOCKER | Prove timeout behavior | AbortSignal test | CLOSED |
| PC5 | Product Agent | Engineering Agent | BLOCKER | Never silently downgrade configured local failure to fixture success | Transport branch and error tests | CLOSED |

## Result

- Added loopback-only HTTP transport with a 10-second abort timeout.
- Added queued/running client states and strict server response normalization.
- Required project, shot, parent, and attempt identity to match the request.
- Converted HTTP, invalid response, timeout, and configuration failures to recoverable failed runs.
- Kept Fixture mode as the default and labeled local memory mode separately.

## Next Owner

Test Agent and Engineering Agent start both local processes and prove the browser receives the Python service's `memory://` asset and manifest evidence. No real B2 or provider credentials are authorized.
