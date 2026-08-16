# Review: Approval Contract Parity

Date: 2026-08-16
Reviewer: Architecture Agent + Code Review Agent + Test Agent
Producer reviewed: Frontend Engineering Agent

Strongest rejection reason: the frontend could accept a receipt by attempt ID alone while the backend rejected mismatched provider, model, asset, timestamp, or decision evidence.

## Findings

- Repaired: frontend now validates the current selected attempt as a real, usable attempt with a valid timestamp and non-empty production fields.
- Repaired: receipt must match shot, attempt, provider, model, and asset reference and include a valid approval time, human-approval kind, and non-empty decision note.
- Repaired: project summaries and operator export acceptance now pass shot attempts into the shared derivation.
- Repaired: an existing test fixture with a mismatched asset reference no longer passes accidentally.
- No new state store, schema version, component branch, or backend coupling was introduced.

Decision: PASS FOR RELEASE CANDIDATE

Residual risk: backend production still serves the preceding summary contract until deployment and E5 smoke are explicitly approved.
