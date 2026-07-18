# Agent Run: Preview B2 Evidence Executor

## Goal

Close the gap between a deployable memory-only preview and a server-bound B2 evidence path without loading credentials, writing B2, deploying, or invoking Runway.

## Loop Board

Loop: 32
Current gate: Architecture / Engineering / Security / Code Review / Test / Claims
Decision: SHIP OFFLINE B2 CAPABILITY; KEEP NETWORK AND DEPLOYMENT BLOCKED

| ID | From | To | Level | Request | Close Evidence | Status |
| --- | --- | --- | --- | --- | --- | --- |
| PB1 | Architecture Agent | Hermes Orchestrator | BLOCKER | Do not automate release around a memory-only production path | Work reprioritized to B2 executor | CLOSED |
| PB2 | Security Agent | Engineering Agent | BLOCKER | Prevent browser control of source key, digest, provider, or model | Server-only source configuration and lineage rejection | CLOSED |
| PB3 | Code Review Agent | Engineering Agent | BLOCKER | Bound source reads before pipeline writes | Explicit 1-100,000,000 byte configuration and pre-write check | CLOSED |
| PB4 | Architecture Agent | Engineering Agent | BLOCKER | Preserve reviewed provider lineage inside the Genblaze manifest | Manifest-internal `runway` / `gen4.5` assertion | CLOSED |
| PB5 | Security Agent | Engineering Agent | BLOCKER | Never delete the reviewed source or unrelated keys on failure | Random run namespace, owned-key compensation tests | CLOSED |
| PB6 | Claims Review Agent | Test Agent | BLOCKER | Do not promote injected-backend evidence to live B2 | Readiness says B2-capable, network-unverified, not deployed | CLOSED |

## Result

- Runtime refuses an absent or ambiguous storage mode.
- Local smoke explicitly chooses MEMORY; the deployment manifest explicitly requires B2.
- B2 mode validates all source and credential configuration before public startup, but creates no backend connection until an authorized request.
- Success retains read-back-verified B2-shaped asset and manifest records; failure cleans only request-owned writes.
- Preview UI lineage is truthful to the reviewed recovered Runway source rather than the local adapter.

## Next Owner

DevOps and Test Agents prepare the deployment-scoped source object and key only after a separate human infrastructure authorization. Claims remain limited to offline B2 capability until a deployed network smoke passes.
