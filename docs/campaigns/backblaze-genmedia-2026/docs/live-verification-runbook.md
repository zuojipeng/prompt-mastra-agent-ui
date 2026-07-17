# Human-Operated Runway-to-B2 Live Verification

Status: **IMPLEMENTED, AWAITING ONE-ATTEMPT SPEND AUTHORIZATION**

This runbook does not authorize paid generation, deployment, publication, claims promotion, or submission. The combined live executable now exists, but remains fail-closed until a canonical one-shot approval is bound to its clean reviewed commit and active run ID.

## Required Order

Every stage is fail-closed. A failed, missing, expired, or ambiguous stage stops all later stages.

1. Review the combined `live_runway_b2_transaction` live command; its fixture result remains explicitly non-attestable.
2. Pin a clean reviewed commit and reproduce all offline tests and plan commands.
3. A human accepts registration and terms through the event account.
4. A human authorizes the B2 account and bucket-scoped credentials for explicit keys below one unique `jingci-smoke/` run prefix.
5. Run the deterministic B2 scoped smoke and confirm read-back plus explicit-key cleanup before any paid provider call.
6. Recheck the official Runway endpoint, model, API version, and current price.
7. A human creates a one-shot approval bound to approval ID, actor, run ID, commit, timestamps, one attempt, and maximum estimated cost of `$0.60`.
8. Consume that approval for exactly one Runway create. An ambiguous create response is a stop condition, never permission to resubmit.
9. Poll within the fixed deadline, download bounded media, and run `ffprobe` before storage.
10. Upload exactly one content-addressed MP4 and one canonical manifest through Genblaze.
11. Read both objects back and verify exact bytes, SHA-256, manifest validity, canonical hash, and Runway task lineage.
12. Delete only the two recorded owned keys, confirm absence, close the backend, then remove local media.
13. Scan and hash the private evidence before producing a redacted attestation.
14. Claims promotion requires a separate human approval. It does not authorize deployment, publication, or submission.

## Approval Boundary

The current campaign authorization forbids paid APIs and caps external spend at `$0`. Participation approval is not registration, spend, publication, or submission approval.

A future one-shot approval must:

- expire;
- bind to one clean commit and one run ID;
- name the approving human;
- permit exactly one `gen4.5`, five-second, `1280:720` create;
- cap estimated pre-tax provider spend at `$0.60`;
- forbid retries, parallel creates, credit purchase, or account top-up;
- become consumed when the create is attempted, including an ambiguous response.

Static environment confirmations are defense-in-depth only and are not sufficient authorization.

## Secret Handling

After the B2 account authorization gate passes, load only `B2_BUCKET`, `B2_REGION`, `B2_KEY_ID`, and `B2_APP_KEY` through an approved local secret mechanism for the scoped B2 preflight. Do not load `RUNWAYML_API_SECRET` at that stage. Load the Runway secret only after the later campaign paid-API gate, current price check, and one-shot spend authorization all pass. Review `JINGCI_RUNWAY_OUTPUT_HOSTS` as non-secret exact host names before either live path.

Never place secret values in arguments, command history, committed `.env` files, screenshots, shell transcripts, logs, or evidence JSON. Disable shell tracing and environment dumps. Private evidence must use mode `0600` and must be scanned independently because the normal release collector scans Git-tracked files only.

## Plan Commands

These commands do not authorize or execute live services:

```bash
npm run hackathon:check:draft
npm run hackathon:deploy:check:draft
npm run hackathon:demo:check
npm run hackathon:live:check:draft

cd spikes/genblaze-provenance
PYTHONPATH=. .venv/bin/python -m unittest tests.test_offline_runway_b2_transaction -v
PYTHONPATH=. .venv/bin/python -m jingci_spike.live_runway_b2_transaction --plan
PYTHONPATH=. .venv/bin/python -m jingci_spike.live_runway_smoke --plan
PYTHONPATH=. .venv/bin/python -m jingci_spike.live_genblaze_b2_smoke --plan
```

The combined command is implemented and tested without external calls. Do not create its approval document or invoke `--live` until the human owner supplies the exact one-attempt spend authorization for the pinned commit. The command writes a canonical private success result only after complete cleanup; a consumed run that fails writes conservative non-attestable recovery evidence when possible and never retries.

## Stop Conditions

- Any gate, source, dependency, credential-shape, output-host, price, or B2 preflight failure: stop before provider create.
- Ambiguous Runway create: consume approval, do not retry, record ambiguity.
- Active task failure or interruption: attempt cancellation once. Do not claim cancellation succeeded without provider-state evidence.
- Successful task followed by download or probe failure: preserve the provider output; do not delete the successful task.
- Probe, asset read-back, manifest, canonical hash, or lineage failure: stop and block all live claims.
- Ambiguous B2 commit: compensate only pre-registered explicit keys.
- Out-of-prefix returned key: do not delete it automatically; record a non-secret recovery handle.
- Cleanup or backend-close failure: set `cleanup_required`, record residual keys, and block every live claim.
- Never continue because an error appears transient. A second generation requires a new approval and revised spend accounting.

## Cleanup And Rollback

Cleanup order is manifest key, asset key, backend close, then local media. Wildcard, recursive, prefix-wide, bucket-wide, lifecycle, and visibility mutations are forbidden. `exists=false` proves only the checked object lookup, not version-level erasure or retention policy.

Rollback disables the live feature, removes confirmations, unloads or revokes temporary credentials, preserves redacted failure evidence, and leaves all readiness claims false. Rollback never means another generation.

## Evidence Boundary

A private result must bind run ID, clean commit, approval ID, one Runway task ID, unique B2 prefix, timestamps, asset digest, manifest hash, probe result, cleanup state, and residual keys. It must contain no credentials or signed URLs.

The exact private file and redacted output contracts are defined in `live-evidence-contract.md`. The attester is implemented and fixture-tested, but no live private result or attestation exists.

Only a machine-validated `passed` result with complete cleanup can support narrow claims that one provider generation and one private B2 upload/read-back occurred. It cannot prove public serving, durable retention, deployment, release readiness, judging access, or submission.
