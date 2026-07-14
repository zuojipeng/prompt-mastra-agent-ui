# Agent Run: Runway Provider Contract

## Goal

Select one external AI video provider that matches the current DirectorKit input and freeze a guarded Genblaze adapter without credentials, network calls, or spend.

## Loop Board

Loop: 13
Current gate: Product / Architecture / Engineering / Claims Review / Test
Decision: SHIP OFFLINE CONTRACT, KEEP LIVE GENERATION BLOCKED

| ID | From | To | Level | Request | Close Evidence | Status |
| --- | --- | --- | --- | --- | --- | --- |
| RP1 | Claims Review Agent | Product Agent | BLOCKER | Do not select the cheaper Gen-4 Turbo for a prompt-only slice because its documented contract requires an image | Official model review and Gen-4.5 decision | CLOSED |
| RP2 | Architecture Agent | Engineering Agent | BLOCKER | Prevent Genblaze from automatically resubmitting a paid generation | `RetryPolicy(max_attempts=1)` and pipeline failure test | CLOSED |
| RP3 | Architecture Agent | Engineering Agent | BLOCKER | Bound paid execution and timeout cleanup | Shared create/poll/download deadline plus separate cancellation budget capped at five seconds | CLOSED |
| RP4 | Code Review Agent | Engineering Agent | BLOCKER | Do not turn an upstream task ID into a path traversal primitive | Restricted task-ID grammar and adversarial test | CLOSED |
| RP5 | Security Review | Engineering Agent | BLOCKER | Reject arbitrary output and redirect URLs before fetch | Exact HTTPS validator passed into the transport for every redirect, plus final URL revalidation | CLOSED |
| RP6 | Test Agent | Engineering Agent | REWORK | Do not trust only MIME or fixed requested dimensions as proof of valid video | MP4 signature check; full probe explicitly deferred to live transport | CLOSED FOR C-018 |
| RP7 | Independent Code Review Agent | Engineering Agent | BLOCKER | Reject wrong modality before paid creation and redact local I/O failures | Modality and output-write adversarial tests | CLOSED |

## Result

- Selected Runway `gen4.5`, fixed to text-to-video, `1280:720`, and five seconds.
- Recorded the current $0.60 estimated per-attempt cost and a separate human spend gate.
- Added a Genblaze `SyncProvider` with stable failure codes, one paid-execution deadline, a five-second cancellation budget, exact output-host allowlisting, a pre-fetch redirect validation contract, size/type/container checks, and no automatic paid retry.
- Added a deterministic scripted client with no SDK, socket, credential, or environment dependency.
- Kept all live provider and B2 claims false.

## Next Owner

Engineering Agent and DevOps Agent build the guarded HTTP transport and plan-mode smoke. Full media probing, temporary-file cleanup around the sink, official error mapping, and live output-host capture remain C-019 acceptance requirements.
