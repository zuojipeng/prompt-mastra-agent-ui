# Agent Run: Preview Service Hardening

## Goal

Implement and locally prove the minimum public-facing provenance boundary without deploying, selecting infrastructure, or using credentials.

## Loop Board

Loop: 10
Current gate: Architecture / Engineering / Code Review / Test
Decision: SHIP LOCAL HARDENING, KEEP PUBLIC RELEASE BLOCKED

| ID | From | To | Level | Request | Close Evidence | Status |
| --- | --- | --- | --- | --- | --- | --- |
| PH1 | Architecture Agent | Engineering Agent | BLOCKER | Preserve loopback default and require explicit public opt-in | Bind-policy tests | CLOSED |
| PH2 | DevOps Agent | Engineering Agent | BLOCKER | Add exact origin, upstream auth, disablement, concurrency, timeout, and health | Unit and real HTTP smoke | CLOSED |
| PH3 | Code Review Agent | Engineering Agent | BLOCKER | Do not leak query strings or validation values in public output | Sanitized logs and generic public errors | CLOSED |
| PH4 | Test Agent | Engineering Agent | REWORK | Initial random-port unit failed under the sandbox | Construction test separated from explicit HTTP smoke | CLOSED |
| PH5 | Code Review Agent | Engineering Agent | BLOCKER | Keep health outside the generation concurrency gate and reject access before reading bodies | Handler ordering and regression | CLOSED |
| PH6 | Claims Review Agent | Hermes Orchestrator | BLOCKER | Do not call a service token reviewer identity or deployment proof | Local-only evidence labels and eight blockers | CLOSED |
| PH7 | Test Agent | Claims Review Agent | REWORK | Deployment test retained the pre-hardening blocker name | Updated assertion and passing focused gate | CLOSED |

## Result

- Default local server remains loopback-only and frontend-compatible.
- Non-loopback bind fails unless preview mode, exact HTTPS origin, token, and concurrency are configured.
- Preview run requests fail closed on disablement, origin, auth, size, timeout, overload, and contract errors.
- Request logs contain metadata only and strip query strings.
- Real local and preview HTTP smokes pass without external credentials or network services.

## Next Owner

DevOps Agent and Claims Review Agent build a deterministic release-evidence collector with secret scanning and artifact hashes. Runtime, identity, rate-limit, credentials, deployment, and submission remain human-gated.
