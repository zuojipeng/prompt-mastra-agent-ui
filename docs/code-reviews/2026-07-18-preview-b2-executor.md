# Code Review: Preview B2 Evidence Executor

Status: PASS OFFLINE; B2 NETWORK AND DEPLOYMENT BLOCKED
Producer: Architecture Agent + Engineering Agent
Reviewer: Security Agent + Code Review Agent + Claims Review Agent

## Findings Closed

1. **BLOCKER - packaged runtime was memory-only.** A public deployment would have returned `memory://` evidence regardless of B2 variables. Runtime storage mode is now mandatory and the tracked deployment mode is B2.
2. **BLOCKER - request-controlled lineage could forge the provider claim.** B2 mode accepts only the server-bound source provider/model and the preview UI sends the reviewed Runway `gen4.5` lineage.
3. **BLOCKER - provider label could diverge from the manifest.** The deterministic source adapter now receives an explicit provider name; tests inspect the persisted manifest's step, not only the HTTP response.
4. **BLOCKER - source object size was initially unbounded.** Configuration now requires a positive maximum no larger than 100 MB, checked before hashing or writing.
5. **BLOCKER - partial writes could leave residue or delete unrelated data.** The wrapper records ownership before every mutation, writes only below a random fixed run prefix, reverses owned writes on failure, and never owns the fixed source key.
6. **REWORK - operator handoff hash drifted after readiness changed.** Rebuilt the deterministic handoff and reran the full suite.
7. **BLOCKER - backend close failure could leave evidence after returning an error.** Success is now committed only after close completes; a close failure enters the same owned-key compensation path and preserves the source.

## Residual Risks

- The source object does not currently exist in a deployment bucket; the previously verified recovery objects were deleted.
- B2 latency, permissions, object retention, concurrent request behavior, and cleanup have not been network-tested in this service.
- Successful evidence objects are intentionally retained and need a post-judging retention/deletion decision.
- The Python endpoint is synchronous and bounded by gateway/runtime concurrency; judge-period load must remain small and rate-limited.

## Verdict

The code now represents the intended preview product instead of a memory-only approximation. It is ready for separately authorized B2 network verification, not deployment claims.
