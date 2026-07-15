# Code Review: Durable Approval and Recovery

Reviewer: Architecture Agent + Security Agent + Code Review Agent + Test Agent + Claims Review Agent
Decision: PASS FOR LOCAL CONTRACT ONLY

## Closed Findings

1. P0: shared append-log corruption and recovery complexity; replaced by immutable per-approval marker publication.
2. P0: sequential, process, and same-ID document replay; marker identity is campaign plus approval ID and only one process publishes.
3. P0: consumed failures and recoveries could cite fabricated predecessors; writers now require the configured journal or actual immutable failure file.
4. P1: ancestor symlinks redirected private roots; every path component is opened with retained `dir_fd` and `O_NOFOLLOW`.
5. P1: FIFO inputs blocked before type checking; private reads now open nonblocking and require a regular owner-only one-link file.
6. P1: phase/code, provider task, and cancellation states could contradict; exact state mappings and task-ID rules now fail closed.
7. P1: delete assertions could claim cleanup completion without absence; every owned key now requires positive absence evidence.
8. P1: recovery could precede failure or cite an orphan hash; writer rechecks chronology and the actual source bytes.
9. P1: secret-shaped IDs could bypass field allowlists; immutable payloads receive a final sensitive-material scan before publication.
10. P1: complete storage cleanup hid ambiguous provider create; provider uncertainty independently keeps recovery required and incomplete.

## Residual Risk

Local durable publication cannot make a remote Runway request exactly once. A post-acceptance crash before task-ID retention is permanently consumed and `attempted_unknown`. Live composition, provider reconciliation, real B2 cleanup, and authenticated human authorization remain outside this contract.
