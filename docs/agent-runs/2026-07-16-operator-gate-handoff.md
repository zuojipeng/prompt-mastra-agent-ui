# Agent Run: Operator Gate Handoff

## Goal

Replace scattered gate interpretation with one deterministic, source-bound handoff while preserving every human authorization boundary.

## Loop Board

Loop: 20
Decision: SHIP DERIVED STATUS, ESCALATE CURRENT HUMAN GATE

| ID | From | To | Level | Request | Close Evidence | Status |
| --- | --- | --- | --- | --- | --- | --- |
| OH1 | Operator Agent | Engineering Agent | REQUIRED | Bind submission, deployment, demo, live, and campaign status | SHA-256 source bindings | CLOSED |
| OH2 | Architecture Agent | Engineering Agent | BLOCKER | Prevent later gates from completing before earlier gates | Prefix-ordered completion derivation | CLOSED |
| OH3 | Claims Review Agent | Engineering Agent | BLOCKER | Prevent paid API authorization alone from implying B2 readiness | Four account/spend blockers must also disappear | CLOSED |
| OH4 | Test Agent | Engineering Agent | REQUIRED | Reject source drift, skipped stages, live commands, and execution enablement | 3 focused tests | CLOSED |
| OH5 | Hermes | Human owner | HUMAN GATE | Complete registration and terms outside the repository | Current stage remains `registration_terms` | OPEN EXTERNAL |

## Result

- `npm run hackathon:handoff` validates one current stage against five hashed source artifacts.
- `npm run hackathon:handoff:write` deterministically rebuilds the derived status after reviewed source changes.
- The artifact contains no credentials or approval payload and always keeps `execution_allowed` false.
- Strict mode remains red until every external and final-submission gate is complete.
