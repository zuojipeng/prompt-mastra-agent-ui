# Agent Run: Local Provenance HTTP Adapter

## Goal

Move the campaign from browser-only fixture orchestration to a real local process boundary without external credentials or network services.

## Loop Board

Loop: 3
Current gate: Test
Decision: SHIP LOCAL ADAPTER, CONTINUE TO OPT-IN FRONTEND CLIENT

| ID | From | To | Level | Request | Close Evidence | Status |
| --- | --- | --- | --- | --- | --- | --- |
| PH1 | Architecture Agent | Engineering Agent | BLOCKER | Use the smallest loopback-only HTTP boundary | Architecture note and implementation | CLOSED |
| PH2 | Code Review Agent | Engineering Agent | BLOCKER | Require JSON and redact unexpected pipeline failures | Negative tests | CLOSED |
| PH3 | Code Review Agent | Engineering Agent | BLOCKER | Reject negative Content-Length | Handler implementation and compile | CLOSED |
| PH4 | Test Agent | Engineering Agent | BLOCKER | Prove real GET/POST over an ephemeral socket | HTTP smoke | CLOSED |

## Result

- Mirrored the TypeScript request contract in Python with retry lineage invariants.
- Reused the official Genblaze pipeline and in-memory object storage adapter.
- Added a pure dispatcher plus loopback `ThreadingHTTPServer` shell.
- Added bounded local CORS, JSON media checks, body limits, and redacted errors.
- Added unit and real-socket smoke evidence.

## Next Owner

Engineering Agent adds an environment-gated frontend client. Missing configuration continues to use the explicit fixture; configured local transport must fail visibly and must never silently downgrade to fixture evidence.
