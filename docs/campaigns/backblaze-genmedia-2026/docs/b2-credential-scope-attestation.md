# B2 Credential Scope Attestation

Status: live scope inspected and rejected; replacement least-privilege key required

Producer: Security Agent + Architecture Agent

Reviewer: Code Review Agent + Test Agent + DevOps Agent + Claims Review Agent

## Decision

The retained-source adapter must not infer least privilege from the presence of `B2_KEY_ID` and `B2_APP_KEY`. A separate owner-only canonical record must prove which non-secret scope was inspected. The record is evidence, not approval: it cannot authorize a B2 request, deployment, publication, submission, or credential disclosure.

The schema binds:

- campaign, review ID, reviewer, inspection method, and a maximum 24-hour review window;
- exact bucket and Backblaze region;
- exact `jingci-preview/` file prefix;
- SHA-256 of the configured Key ID, never the application key value;
- a sorted unique capability list;
- explicit `secret_value_recorded=false` and `execution_authorized=false`.

Required capabilities are `listAllBucketNames`, `listBuckets`, `listFiles`, `readFiles`, `writeFiles`, and `deleteFiles`. Read-only bucket/file metadata capabilities are tolerated. Account-key administration, bucket mutation, replication/notification/logging mutation, sharing, retention mutation, legal-hold mutation, and governance bypass are rejected.

Backblaze documents that Application Keys can be restricted to a bucket, file prefix, capabilities, and duration; its S3-compatible API requires file read/write/delete permissions and may require bucket listing permissions for a bucket-restricted key:

- https://www.backblaze.com/docs/cloud-storage-application-keys
- https://www.backblaze.com/docs/cloud-storage-application-key-capabilities
- https://www.backblaze.com/docs/cloud-storage-s3-compatible-app-keys

## Trust Boundary

The checked-in parser validates a human or independently collected review record. It does not contact Backblaze, inspect the real account, create the record, read a secret, or authorize execution. A real attestation is trustworthy only after Security/DevOps compares it with the configured key's `allowed` response or Backblaze console settings.

The guarded adapter reads the attestation from an owner-only regular mode-0600 file. It validates the Key ID hash only after loading the injected local configuration, but before backend construction and before consuming the one-shot source-promotion approval. Its terminal private result includes only the review ID, attestation hash, target, prefix, capabilities, and Key ID hash.

## Rejected Alternatives

- Treating a successful historical smoke as scope proof: rejected because runtime success does not reveal excessive authority.
- Recording the application key value: rejected because review evidence must remain secret-free.
- Allowing arbitrary extra capabilities: rejected because deny-by-default catches privilege drift.
- Making the attestation authorize execution: rejected because security review and mutation approval are separate human decisions.
- Calling `b2_list_keys` with the same scoped key: rejected because it may lack `listKeys` and adding that capability would widen authority.

## Remaining Gate

The 2026-07-18 read-only inspection authenticated and confirmed the intended bucket, region, and `jingci-preview/` prefix. It did not pass least-privilege review. The Backblaze `Read and Write` preset returned required file operations together with unrelated authority including `writeBuckets`, `writeBucketEncryption`, `writeBucketLifecycleRules`, `writeBucketLogging`, `writeBucketNotifications`, and `writeBucketReplications`. The private mode-0600 rejection report contains only the approved non-secret scope fields and cannot authorize execution.

The human owner must create a replacement key restricted to the same bucket and prefix with only the reviewed list/file capabilities. Security/DevOps must then perform one separately approved read-only inspection and produce a passing canonical attestation. Only after that may the human owner issue a separate clean-commit/source-bound one-attempt approval for B2 source retention.
