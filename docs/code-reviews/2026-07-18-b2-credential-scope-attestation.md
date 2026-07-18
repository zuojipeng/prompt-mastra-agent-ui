# Code Review: B2 Credential Scope Attestation

Status: PASS OFFLINE; REAL KEY SCOPE UNVERIFIED

Producer: Security Agent + Architecture Agent + Engineering Agent

Reviewer: Code Review Agent + Test Agent + DevOps Agent + Claims Review Agent

## Strongest Rejection Reason

A canonical file could create false confidence if it merely repeated expected values or if the execution result did not identify which review was used. The implementation therefore treats the file as non-authorizing evidence, binds it to the configured Key ID hash, and carries its review ID/document hash into terminal results. Real least privilege remains unproven until an independent account inspection supplies the record.

## Findings Closed

1. **BLOCKER - presence of credentials was mistaken for least privilege.** The adapter now requires separately inspected bucket/region/prefix/capability evidence.
2. **BLOCKER - arbitrary extra capabilities could pass.** The parser uses required and allowed sets; unknown or dangerous authority fails closed.
3. **BLOCKER - scope evidence could authorize mutation.** Canonical authority is evidence-only and execution authorization must be false.
4. **BLOCKER - attestation could target another key.** It binds SHA-256 of the configured Key ID without recording the application key value.
5. **BLOCKER - result could omit the review used.** Private results retain review ID and attestation document hash; live-private shape requires scope evidence.
6. **BLOCKER - default result builder could look live.** The default evidence mode is now `fixture_non_attestable`.
7. **REWORK - capability validation could throw on non-string input.** Result integrity checks reject non-string capability entries before sorting/deduplication.
8. **BLOCKER - scope review target and result storage target could diverge.** Terminal storage now records bucket/region and integrity validation requires exact agreement with the scope review.

## Residual Risks

- The current configured key has not been inspected against Backblaze account state.
- A console-derived record still depends on human transcription; `b2_authorize_account.allowed` is preferable when safely collected.
- Backend preflight requirements must be confirmed against the exact Genblaze/S3 library behavior during the separately approved run.
- The attestation does not authorize source retention and cannot replace the one-shot approval.

## Verdict

PASS for offline gate hardening. Stop before credential inspection or B2 mutation unless the human owner authorizes that operation.
