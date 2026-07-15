# Private Live Evidence Contract

Status: **IMPLEMENTED WITH FIXTURES, NO LIVE RESULT**

This contract converts one private Runway-to-B2 result into a redacted attestation. It does not authorize external calls, prove that a live run occurred, approve claims, or make the campaign releasable.

## Trust Boundary

- Input is one canonical UTF-8 JSON file below `artifacts/hackathon/backblaze-genmedia-2026/private/`.
- The private directory must be owner-owned mode `0700`; the file must be owner-owned, regular, single-link, non-symlink, mode `0600`, and at most 256 KB.
- The JSON object and every nested object use exact key allowlists. Canonical formatting prevents duplicate or hidden keys from surviving parse-and-reserialize comparison.
- Raw bytes are scanned before attestation. NUL, malformed UTF-8, known credential signatures, URLs, signed query strings, unknown fields, and unconstrained carrier values fail closed.
- The output path is fixed, must not exist, and is created exclusively at mode `0600`.

## Required Result Evidence

Schema: `jingci.hackathon-live-result.v1`

The result binds:

- a clean 40-character source commit and one run ID;
- one approval document digest explicitly bound to the same run ID and source commit, approval ID, human actor, validity window, consumed timestamp, one attempt, and `$0.60` maximum estimated cost;
- Runway `gen4.5`, API version `2024-11-06`, one create, one task ID, five seconds, and `1280:720`;
- a bounded MP4 probe with dimensions, duration, bytes, and SHA-256;
- one owned B2 prefix, exactly one MP4 key and one manifest key, read-back, digest, manifest hash, and lineage verification;
- explicit deletion of exactly those two keys, confirmed absence, zero residual keys, closed backend, and removed local media;
- ordered start, provider completion, cleanup completion, and finish timestamps.

Any failed, ambiguous, retried, unclean, expired, corrupt, out-of-prefix, partially cleaned, or unscanned result is rejected.

## Redacted Attestation

Schema: `jingci.hackathon-live-attestation.v1`

The output retains only source commit, private-result hash and byte count, one canonical binding hash, fixed provider shape, media/storage digests, verification booleans, cleanup counts, scanner result, and timestamps. It excludes actor, approval ID, task ID, prefix, object keys, URLs, local paths, provider payloads, logs, and error text.

The attestation may corroborate only:

- `live_ai_media_provider`
- `live_b2_upload_readback`

It explicitly does not support public serving, durable retention, deployment, release readiness, judging access, or submission. In this slice `claims_promotion_approval=false` and `claims_eligible=false` are mandatory. A later, separately reviewed human-approval contract must bind the attestation hash before claims can change.

## Local Command

Do not run this command until a combined harness has produced the private canonical result through separately approved live gates.

```bash
mkdir -p artifacts/hackathon/backblaze-genmedia-2026/private
chmod 0700 artifacts/hackathon/backblaze-genmedia-2026/private
chmod 0600 artifacts/hackathon/backblaze-genmedia-2026/private/<run-id>.json
npm run hackathon:live:attest -- --in=artifacts/hackathon/backblaze-genmedia-2026/private/<run-id>.json
```

The release collector independently validates the redacted attestation. Missing evidence remains a blocker. A valid attestation remains informational until the separate claims-promotion gate exists.
