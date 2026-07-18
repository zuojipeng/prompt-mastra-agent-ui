# Agent Run: Preview Source Promotion Approval Contract

## Goal

Make a future retained private B2 source mutation reviewable and at-most-once without enabling credentials, network, approval creation, or execution.

## Loop Board

Loop: 34
Decision: SHIP OFFLINE CONTRACT; KEEP LIVE COMPOSITION BLOCKED

| ID | From | To | Level | Request | Close Evidence | Status |
| --- | --- | --- | --- | --- | --- | --- |
| PC1 | Architecture Agent | Engineering Agent | BLOCKER | Separate retained-storage authority from paid-generation authority | Dedicated schema, scope, and confirmation | CLOSED |
| PC2 | Security Agent | Engineering Agent | BLOCKER | Bind approval to exact source, commit, actor, and time | Canonical parser mutation tests | CLOSED |
| PC3 | Code Review Agent | Engineering Agent | BLOCKER | Prevent restart/concurrency replay | Existing immutable journal accepts the source approval structurally and rejects reuse | CLOSED |
| PC4 | Test Agent | Engineering Agent | BLOCKER | Distinguish successful retention from cleanup uncertainty | Three-state private result tests | CLOSED |
| PC5 | Operator Agent | Hermes Orchestrator | BLOCKER | Prevent evidence from becoming deployment or submission authority | Four explicit false authorization fields and tamper rejection | CLOSED |
| PC6 | Security Agent | Engineering Agent | BLOCKER | Do not trust caller-supplied marker lineage at write time | Writer rereads and verifies the immutable campaign journal | CLOSED |

## Result

The contract is independently useful but intentionally cannot execute. A later composition root must still pass security review and receive a new exact human gate before B2 is touched.
