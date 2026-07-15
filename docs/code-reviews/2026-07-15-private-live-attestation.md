# Code Review: Private Live Result Attestation

Reviewer: Security Agent + Code Review Agent + Test Agent + DevOps Agent + Claims Review Agent
Decision: PASS FOR FIXTURE-ONLY EVIDENCE BOUNDARY

## Findings

1. P0, closed: a valid attestation could be mistaken for claims approval; both attestation and collector now make promotion unsupported and release ineligible.
2. P1, closed: duplicate JSON keys could hide a raw Runway token from parse-then-scan; collector compares canonical raw bytes and scans the original buffer.
3. P1, closed: approval could occur after the run and did not name its run/commit; exact bindings and ordered timestamps are required.
4. P1, closed: source cleanliness was self-asserted; the CLI now checks the tracked worktree before attestation.
5. P1, closed: private inputs or outputs could use unsafe permissions, links, or overwrite paths; owner/mode/nlink/fixed-root/exclusive-output checks fail closed.
6. P1, closed: arbitrary or traversal B2 keys could pass; the exact `jingci-smoke/<UTC>/<32hex>/assets|manifests/<digest>` layout is required.
7. P2, closed: JavaScript date normalization accepted impossible calendar dates; timestamps must round-trip to the original UTC value.
8. P1, deferred: no combined harness emits this result and no live attestation exists; C-023 owns the harness while account, spend, and terms gates remain human-controlled.

## Residual Risk

The future combined process must make result creation atomic with execution, prevent time-of-check/time-of-use changes, and bind a separately signed or otherwise authenticated human claims approval to the attestation hash. Real provider, billing, B2 lifecycle, deployment, and submission remain unproven.
