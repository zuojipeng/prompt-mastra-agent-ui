# Code Review: Preview Source Promotion Approval Contract

Status: PASS OFFLINE; LIVE MUTATION BLOCKED

Producer: Architecture Agent + Engineering Agent

Reviewer: Security Agent + Code Review Agent + Operator Agent

## Findings Closed

1. **BLOCKER - authority confusion.** Paid Runway approval cannot authorize persistent B2 retention; the new schema has a distinct scope and confirmation.
2. **BLOCKER - approval replay.** The source approval conforms only to the generic immutable journal interface and its full canonical document hash is consumed at most once.
3. **BLOCKER - source substitution.** Commit, run, key, digest, byte count, actor, active UTC window, and one attempt are all exact-match fields.
4. **BLOCKER - false success after partial cleanup.** Results separate verified retained success, confirmed compensation, and recovery-required uncertainty.
5. **BLOCKER - evidence widens authority.** The writer rejects any result that enables deployment, publication, submission, or paid API usage.
6. **REWORK - test private path initially traversed macOS `/var` symlink.** Tests now use real `/private/tmp`, preserving the production `O_NOFOLLOW` rule.
7. **REWORK - approval size bound initially allowed a value wider than execution.** Parser now enforces the same 1-100,000,000 byte range as the promotion core.
8. **BLOCKER - caller-mutated result could bypass builder checks.** The private writer independently validates exact shape and state before immutable publication.
9. **BLOCKER - fabricated marker dictionaries could forge result lineage.** The writer now requires the real campaign journal, rereads its immutable marker, and verifies marker hash, approval document hash, run, commit, and consumption time.

## Residual Risks

- Local at-most-once does not make B2 create exactly-once; a network interruption can still require exact-key operator recovery.
- There is no live composition root, human approval document, source file loader, credential loader, or B2 request in this slice.
- A future result must be generated on every path after durable consumption, including process interruption recovery.

## Verdict

The contract is narrower than the operation and does not create execution authority. It is ready to constrain a separately reviewed composition root.
