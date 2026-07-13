# Agent Run: Preview Deployment Threat Model

## Goal

Define a judge-accessible preview boundary without deploying the campaign branch, using credentials, or weakening the loopback-only provenance adapter.

## Loop Board

Loop: 9
Current gate: Architecture / DevOps / Claims Review / Test
Decision: SHIP DEPLOYMENT DESIGN, KEEP PUBLIC RELEASE BLOCKED

| ID | From | To | Level | Request | Close Evidence | Status |
| --- | --- | --- | --- | --- | --- | --- |
| DP1 | Architecture Agent | DevOps Agent | BLOCKER | Do not expose the current loopback adapter directly | Threat model and explicit runtime decision blocker | CLOSED |
| DP2 | Claims Review Agent | Engineering Agent | BLOCKER | Prevent a design document from being reported as deployed | Machine-readable status and strict gate | CLOSED |
| DP3 | Test Agent | Engineering Agent | BLOCKER | Reject missing controls, URLs, commit, or blockers ledger | Three focused validator tests | CLOSED |
| DP4 | DevOps Agent | Architecture Agent | BLOCKER | Define authentication, abuse controls, logging, rollback, and cleanup | Required-control matrix and judge runbook | CLOSED |
| DP5 | Code Review Agent | Engineering Agent | REWORK | Missing blockers array was interpreted as zero blockers | Required array validation and regression test | CLOSED |

## Result

- Classified the existing Python service as loopback-only and unsafe for direct public exposure.
- Defined a reviewer-account access model and a bounded under-three-minute judge path.
- Added 13 mandatory public controls and eight explicit release blockers.
- Added draft and strict deployment checks; strict remains red until public evidence exists.
- Preserved human gates for credentials, account access, deployment, publication, and submission.

## Next Owner

Architecture Agent and Engineering Agent harden a public service boundary behind tests without deploying it. DevOps Agent then selects an approved runtime and access layer only after human authorization.
