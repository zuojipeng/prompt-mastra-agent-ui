# Code Review: Local Provenance HTTP Adapter

Reviewer: Code Review Agent + Test Agent
Producer reviewed: Architecture Agent + Engineering Agent
Decision: PASS FOR LOCAL HTTP ADAPTER

## Strongest Rejection Reason

Even a localhost service could become an unbounded unauthenticated upload surface or leak pipeline details if its transport shell were treated as harmless test code.

## Findings

1. P1, closed: POST initially accepted bodies without an explicit JSON media type. It now returns 415 unless `application/json` is declared.
2. P1, closed: unexpected pipeline exceptions initially escaped the dispatcher. They now return a stable redacted 500, covered by a patched secret-bearing exception test.
3. P1, closed: a negative Content-Length could reach an unbounded stream read. It is now treated as oversized and rejected.
4. P2, accepted: there is no authentication. The server cannot bind beyond `127.0.0.1`; auth belongs to any future deployed service.
5. P2, accepted: synchronous execution is sufficient for deterministic local bytes. Queueing belongs to real provider latency, not this proof.

## Residual Risk

The adapter has no browser client yet and proves memory storage only. Process supervision, cancellation, real provider latency, B2, auth, deployment, and observability remain open.
