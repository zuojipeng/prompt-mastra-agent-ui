# Code Review: Guarded Preview Source Adapter

Status: PASS OFFLINE; REAL MUTATION UNAUTHORIZED

Producer: Architecture Agent + Engineering Agent

Reviewer: Security Agent + Code Review Agent + Claims Review Agent

## Findings Closed

1. **BLOCKER - approval could target another bucket.** Canonical approval and parser now bind exact bucket and Backblaze region in addition to source key/digest/size.
2. **BLOCKER - credentials could load before local rejection.** Private path, source, digest, approval, target, and result checks run before the injected config loader.
3. **BLOCKER - injected fake could forge live-private evidence.** Any non-default backend factory is unconditionally labeled `fixture_non_attestable` and `memory_fixture`.
4. **BLOCKER - raw backend/config errors could leak details through a future caller.** Stable adapter errors suppress causes; post-consumption state remains recoverable from the marker.
5. **BLOCKER - failure could be overclassified as compensated.** Every live-adapter storage error is conservatively `recovery_required`; exact-key recovery is a separate read-only operator step.
6. **REWORK - expected-key preflight referenced a removed exception variable.** The path was rewritten as query, stable backend-error handling, then explicit key-exists close/rejection.
7. **BLOCKER - result write interruption could lose terminal state.** The adapter returns a stable recovery error and preserves the consumed marker; no retry is possible.

## Residual Risks

- B2 credential restriction has not been independently inspected; string shape cannot prove account policy.
- Default B2 factory behavior, timeout, ambiguous put, close, and read-back have not run through this adapter.
- No operator harness or approval document exists. Adding either requires a separate review and exact human authorization.

## Verdict

The library is ready for gated operator integration, not invocation. Offline tests cannot support a B2 retention claim.
