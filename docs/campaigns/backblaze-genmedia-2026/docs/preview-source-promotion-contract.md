# Preview Source Promotion Contract

Status: guarded library adapter implemented and offline-tested; live execution absent

Producer: Architecture Agent + Engineering Agent

Reviewer: Security Agent + Code Review Agent + Test Agent + Operator Agent

## Decision

Retaining the reviewed Runway source in private B2 is a persistent mutation and cannot reuse the earlier paid-generation approval schema. It receives a dedicated canonical schema with the exact scope `b2_private_preview_source_promotion` and confirmation `PROMOTE ONE REVIEWED SOURCE TO PRIVATE B2`.

The existing POSIX durable journal is reused only as the atomic at-most-once mechanism. Its marker binds the canonical approval document hash, so changing the source, scope, commit, actor, run, or expiry creates a different document and cannot reuse the consumed marker.

## Approval Boundary

One approval binds all of:

- campaign operation and exact confirmation;
- one approval ID and one run ID;
- one clean 40-character Git commit;
- one human actor and active UTC window;
- exactly one attempt;
- one key below `jingci-preview/source/`;
- the source's exact SHA-256 and byte count, bounded to 100 MB.
- one exact target bucket and Backblaze region.

It does not authorize Runway spend, another source, overwrite, deployment, publication, submission, or credential disclosure. No checked-in tool creates this human approval.

## Private Result Boundary

The immutable mode-0600 result is bound to the approval document and consumption marker. It permits exactly three outcomes:

1. `passed`: exact bytes and digest were read back and the private source was retained.
2. `failed_compensated`: the attempt failed and removal of the newly owned key was confirmed.
3. `recovery_required`: cleanup could not be confirmed; an operator must inspect the exact approved key before any new attempt.

Every result keeps deployment, publication, submission, and paid API authorization false. The writer rejects widened authority, malformed state, secret carriers, symlinks, unsafe directories, and overwrite of an existing result.

## Rejected Alternatives

- Reusing the Runway approval: rejected because spend and persistent object retention are different authorities.
- Storing approval state in process memory: rejected because restart and concurrency could allow reuse.
- Adding a live CLI now: rejected because no human approval document exists and the composition root has not received security review.
- Claiming remote exactly-once: rejected because B2 object creation is not a distributed compare-and-set transaction.

## Remaining Gate

The machine-checked live plan, crash-recovery runbook, and guarded library adapter now implement clean-source checks, safe local media loading, bucket/region-bound approval, delayed configuration loading, result creation on post-consumption failures, conservative crash recovery, and no-overwrite behavior. Network execution remains blocked until an exact mode-0600 human approval exists for a clean pinned commit and separately reviewed bucket/prefix-scoped credentials are available.

The credential review is represented by a separate canonical mode-0600 `jingci.b2-credential-scope-attestation.v1` document. It binds a short-lived review to the exact bucket, region, `jingci-preview/` prefix, Key ID SHA-256, and a deny-by-default capability set. Its authority is evidence-only and `execution_authorized` must remain false. The adapter validates it before backend creation and approval consumption, and the terminal result records its review ID and document hash. This attestation cannot replace the later one-shot mutation approval.
