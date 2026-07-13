# Code Review: Provenance HTTP Client

Reviewer: Code Review Agent + Test Agent
Producer reviewed: Engineering Agent
Decision: PASS FOR OPT-IN LOCAL CLIENT

## Strongest Rejection Reason

A client could accept a structurally valid run for another shot or project, or hide a configured adapter failure by falling back to a polished fixture result.

## Findings

1. P1, closed: normalized responses now also require project, shot, parent, and attempt identity equality with the request.
2. P1, closed: an invalid configured URL initially rejected outside the recoverable transport path. It now emits a failed run without making a request.
3. P1, closed: timeout behavior was implemented but initially lacked direct evidence. AbortSignal coverage now proves a recoverable timeout run.
4. P2, accepted: only HTTP loopback is allowed. HTTPS loopback and IPv6 are unnecessary for the current local proof.
5. P2, accepted: local adapter mode does not expose the fixture failure drill; real HTTP failures exercise the same recovery UI.

## Residual Risk

Mocked fetch tests do not prove the browser-to-Python cross-origin path. That is the next test slice. Real B2, provider, auth, deploy, and production remain blocked or unproven.
