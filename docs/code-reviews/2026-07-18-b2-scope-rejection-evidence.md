# Code Review: B2 Scope Rejection Evidence

Status: PASS OFFLINE; NEW NETWORK REQUEST UNAUTHORIZED

Producer: Security Agent + Engineering Agent

Reviewer: Architecture Agent + Code Review Agent + Test Agent

## Strongest Rejection Reason

The first rotated-key inspection discarded the exact non-secret capability list when policy rejected it. Repeating the request without repairing evidence order would waste authorization and encourage policy changes by guesswork.

## Findings Closed

1. **BLOCKER - rejected scope disappeared.** Inspection evidence is now built and publishable independently of passing-attestation validation.
2. **BLOCKER - rejection evidence could grant authority.** Secret/token recording and execution authorization are fixed false and integrity checked.
3. **BLOCKER - capability drift could be hidden.** Capability names must be sorted, unique strings and are retained verbatim.
4. **BLOCKER - policy reason could be free-form or secret-bearing.** Only three stable error codes are accepted.
5. **BLOCKER - evidence could be overwritten.** Owner-only immutable publication rejects a second write.
6. **REWORK - multiple policy errors were not canonicalized.** Builder sorts the error list before validation/publication.

## Residual Risk

No rejected-scope report exists for the already completed request because its response was intentionally not retained. Exact extra capabilities still require a new separately authorized read-only request. The contract cannot authorize that request or widen the allowlist.

## Verdict

PASS offline repair. Stop at the new one-request human gate.
