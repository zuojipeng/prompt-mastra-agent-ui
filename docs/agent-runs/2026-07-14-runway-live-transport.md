# Agent Run: Guarded Runway Live Transport

## Goal

Build a reviewable Runway REST client and one-attempt smoke harness without credentials, network execution, or spend.

## Loop Board

Loop: 14
Decision: SHIP OFFLINE HARNESS, KEEP LIVE GENERATION BLOCKED

| ID | From | To | Level | Request | Close Evidence | Status |
| --- | --- | --- | --- | --- | --- | --- |
| RT1 | Claims Review Agent | Engineering Agent | BLOCKER | Replace the conflicting legacy image-operation example with the current REST endpoint | `/v1/text_to_video` request test and official reference | CLOSED |
| RT2 | Code Review Agent | Engineering Agent | BLOCKER | Preserve auth, rate-limit, invalid-input, and server error classifications through the provider | Typed error tests and provider rethrow | CLOSED |
| RT3 | Security Agent | Engineering Agent | BLOCKER | Validate redirects before fetch and never forward API authorization to media hosts | Scripted two-host redirect test | CLOSED |
| RT4 | Test Agent | DevOps Agent | BLOCKER | Prove plan and denied live mode cannot read credentials or create transports | Bomb environment and access-order tests | CLOSED |
| RT5 | Architecture Agent | Engineering Agent | BLOCKER | Do not DELETE a succeeded task when its output download expires | Lifecycle repair and regression test | CLOSED |
| RT6 | Test Agent | Engineering Agent | REWORK | Bound body length, probe shape, temporary ownership, and repeated cancel semantics | Transport, ffprobe, cleanup, and 404 tests | CLOSED |
| RT7 | Independent Code Review Agent | Engineering Agent | BLOCKER | Isolate probe secrets, enforce stream deadline, preserve malformed success, close responses, and hard-cap probe output | Five repairs and adversarial regressions | CLOSED |
| RT8 | Independent Code Review Agent | Engineering Agent | BLOCKER | Type read timeouts and include DNS in the shared deadline | Timed resolver, fresh remaining budget, read-timeout and DNS-expiry tests | CLOSED |
| RT9 | Independent Code Review Agent | Engineering Agent | BLOCKER | Ensure a stuck system resolver cannot keep the smoke process alive after timeout | Isolated resolver subprocess, kill-and-wait timeout path, and real sleeping-child regression | CLOSED |

## Result

- Current `POST /v1/text_to_video`, task GET, and idempotent DELETE contracts are explicit.
- API requests carry server-only bearer authorization and pinned version; media requests carry neither.
- Plan mode performs no environment, network, transport, or subprocess work.
- Live mode requires an exact phrase binding model, duration, one attempt, and maximum estimated cost.
- Temporary media is probed and removed on success or failure.
- Live provider generation remains false in every submission artifact.

## Next Owner

Architecture and Engineering compose this harness with the existing offline Genblaze-to-B2 transaction. Production DNS pinning or egress enforcement remains a deployment prerequisite.
