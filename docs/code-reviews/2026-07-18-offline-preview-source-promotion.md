# Code Review: Offline Preview Source Promotion Composition

Status: PASS OFFLINE; LIVE ENTRYPOINT ABSENT

Producer: Architecture Agent + Engineering Agent

Reviewer: Security Agent + Code Review Agent + Claims Review Agent

## Findings Closed

1. **BLOCKER - injected backend could secretly perform network I/O.** The offline root accepts only the exact built-in memory fake, not subclasses or protocol-compatible objects.
2. **BLOCKER - memory success could masquerade as B2 proof.** Offline records use `fixture_non_attestable` and `memory_fixture`; live-private records remain a different mode.
3. **BLOCKER - wrong campaign could burn approval before rejection.** Campaign journal identity is checked before parsing or consumption.
4. **BLOCKER - existing key could burn approval and create ambiguous ownership.** Exact-key absence is checked before consumption and tested to leave no marker.
5. **BLOCKER - invalid local state could consume one-shot authority.** Source cleanliness, output absence/safety, bytes, digest, and approval binding all precede journal consumption.
6. **BLOCKER - terminal write interruption could leave only a marker.** Conservative recovery binds the real marker and marks retained state as recovery-required rather than inferring success.
7. **REWORK - writer accepted a structurally valid reversed timestamp.** It now independently enforces recorded time at or after marker consumption.

## Residual Risks

- Real B2 ambiguous writes and process crashes require a network-specific recovery runbook and exact-key inspection.
- The live adapter must not accept arbitrary backend factories or infer cleanup from exception text.
- Physical failure of both primary and recovery evidence storage cannot be solved inside one local filesystem process; the immutable marker remains the recovery anchor.

## Verdict

The slice proves orchestration semantics without manufacturing authority or production evidence. A live adapter remains a separate reviewed change.
