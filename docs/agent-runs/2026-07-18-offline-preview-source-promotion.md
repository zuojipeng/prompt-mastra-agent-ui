# Agent Run: Offline Preview Source Promotion Composition

## Goal

Prove the complete retained-source approval and evidence lifecycle without giving the composition root any network-capable backend.

## Loop Board

Loop: 35
Decision: SHIP OFFLINE COMPOSITION; KEEP LIVE MUTATION BLOCKED

| ID | From | To | Level | Request | Close Evidence | Status |
| --- | --- | --- | --- | --- | --- | --- |
| OC1 | Security Agent | Engineering Agent | BLOCKER | Reject real or subclassed backends | Exact `OfflinePromotionBackend` type check | CLOSED |
| OC2 | Code Review Agent | Engineering Agent | BLOCKER | Do not consume approval for dirty source, wrong campaign, existing key, unsafe path, or invalid bytes | Marker-absence tests | CLOSED |
| OC3 | Test Agent | Engineering Agent | BLOCKER | Preserve truthful evidence for every post-consumption outcome | Success, compensation, cleanup uncertainty, and interrupted-write recovery tests | CLOSED |
| OC4 | Claims Review Agent | Architecture Agent | BLOCKER | Do not present memory lifecycle as B2 evidence | `fixture_non_attestable` plus `memory_fixture` storage label | CLOSED |
| OC5 | Security Agent | Engineering Agent | REWORK | Writer must reject result timestamps before approval consumption | Independent time-order validation | CLOSED |

## Result

The orchestration and recovery state machine is now executable offline. There is still no CLI, environment read, credential loading, B2 construction, approval generator, deployment, or publication path.
