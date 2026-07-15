# Durable Approval and Recovery Contract

Status: local contract proven; live composition still absent

## Guarantee

This layer provides local at-most-once provider submission for one campaign approval on a supported POSIX filesystem. It does not provide exactly-once Runway execution: a crash after Runway accepts a request but before a task ID is retained remains `attempted_unknown` and must never auto-retry.

The human actor string inside approval JSON is not identity proof. Registration, terms, account control, spend, claims promotion, and submission remain separate authenticated human gates.

## Approval Marker

The one-shot identity is `SHA-256(campaign_id + NUL + approval_id)`. The document digest is evidence bound inside that identity, not a reusable identity by itself.

Publication order:

1. Open every absolute path component through retained directory descriptors with `O_DIRECTORY`, `O_NOFOLLOW`, and `O_CLOEXEC`.
2. Require the final directory to be owner-owned mode `0700`.
3. Write canonical ASCII JSON to a random mode-`0600` temporary file.
4. Run `F_FULLFSYNC` on macOS when available, then `fsync`.
5. Atomically hard-link the temporary file to the final marker without overwrite.
6. Remove the temporary name and `fsync` the directory before provider create.

An existing final marker always means consumed, including truncated, corrupt, unknown, symlink, or otherwise unreadable state. It is never deleted, repaired, reclaimed by PID/time, or treated as unused. Expiry or clock regression after durable publication burns the approval without permitting provider create.

Supported roots are canonical local paths on APFS/ext4/XFS-like filesystems with hard links and durable directory sync. NFS, SMB, FUSE, synchronized folders, symlinked ancestors, and unsupported link/sync behavior fail closed.

## Failure State

Every persisted post-consumption failure must bind the actual private approval marker by campaign, approval ID, document digest, run, commit, timestamp, and marker hash.

Phase and code are an exact pair. Provider recovery state is bounded to:

- `not_attempted`
- `attempted_unknown`
- `task_id_observed`
- `completed`

Cancellation state is separately bounded. Confirmed cancellation requires an observed task ID. Raw exceptions, HTTP content, URLs, credentials, environment values, and arbitrary object keys are forbidden.

A consumed marker without terminal evidence becomes an immutable `execution_interrupted` failure with provider outcome `attempted_unknown`; it never becomes a fresh authorization.

## Recovery State

Recovery records bind the actual immutable failure file by SHA-256, run, commit, storage prefix, and complete owned-key inventory. Recovery may only reduce cleanup obligations.

`recovered` requires:

- every owned key classified as deleted;
- positive absence confirmation for every owned key;
- no residual keys;
- backend close confirmed;
- local media removal confirmed; and
- recovery time at or after failure time.

Recovery never changes execution status to passed, authorizes provider create, or supports live claims. Failure and recovery schemas use `evidence_mode: non_attestable` and are unconditionally rejected by the C-022 live attester.

## Secret Boundary

All immutable payloads are scanned before publication for URL/signed-query, AWS access-key, `key_`, bearer-token, and common API-key forms. Files are opened nonblocking before type checks so FIFO/socket attacks fail instead of hanging. Private source files must be owner-owned regular mode-`0600` files with exactly one hard link.

## Remaining Live Gates

The combined live composition root remains absent. This contract does not authorize credentials, network access, Runway spend, B2 mutation, deployment, publication, claims promotion, or submission.
