# Preview Source Promotion Contract

Status: offline contract accepted; live composition absent

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

A future slice may compose this contract with the upload core only after it proves clean-source checks, safe local media loading, bucket-scoped credentials, result creation on every post-consumption path, crash recovery, and no-overwrite behavior under a separately authorized live run. Network execution remains blocked until the human owner explicitly approves that exact operation.
