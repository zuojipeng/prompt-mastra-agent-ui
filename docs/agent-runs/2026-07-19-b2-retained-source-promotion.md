# Agent Run: B2 Retained Source Promotion

Date: 2026-07-19

Task: C-044 / JC-T005

Orchestrator: Hermes

## Authorization

The human owner approved one exact operation bound to commit `9a0e875a87acb276eccbd0b975c5b25ed7235a59`, source SHA-256 `ca8ea95388d2e2f943f628ec6ca8bf9386baad8862b54ce26764675fa2b438f6`, size 1,044,064 bytes, and private key `jingci-preview/source/runway-gen45-ca8ea95388d2.mp4`. After a safety-policy stop, the owner explicitly acknowledged third-party transfer and retention risk and renewed the same narrow approval.

## Execution

- The clean commit, private source mode, size, digest, result-path absence, credential file, and unexpired least-privilege scope attestation passed before network access.
- The installed SDK default of three adaptive attempts was rejected. The one-shot process replaced it with and asserted Botocore `total_max_attempts=1` without changing tracked code or the installed dependency.
- The adapter consumed one immutable approval, refused overwrite, uploaded only the approved object, read it back, and matched the complete SHA-256.
- The object remains private and retained. No compensation delete was needed.

## Result

Private mode-0600 evidence records `status=passed`, `evidence_mode=live_private`, `retained=true`, and `readback_verified=true`. No deployment, public release, Devpost submission, paid API call, or other-object operation occurred.
