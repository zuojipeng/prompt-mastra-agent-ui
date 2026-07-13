# Architecture Note: Genblaze ObjectStorageSink To B2 Smoke

## Decision

Reuse one extracted `execute_storage_pipeline` function for local and future B2-backed proofs. Wrap the live backend in `DeferredCloseBackend` so Genblaze retains normal sink lifecycle behavior while read-back verification happens before the underlying connection is finally closed.

## Boundary

```text
deterministic local video provider
  -> Genblaze Pipeline
  -> ObjectStorageSink
  -> DeferredCloseBackend
  -> guarded B2 backend
  -> content-addressed video + JSON manifest
  -> read both -> verify -> delete both -> close delegate
```

The wrapper records each successful put, its requested and returned key, and its content type. Every key must remain below one generated `jingci-smoke/<utc>/<uuid>` prefix. A valid run must produce exactly one `video/mp4` asset and one `application/json` manifest.

## Verification

- The returned storage key equals the requested key.
- Both objects exist after the pipeline completes.
- Asset bytes equal provider bytes and SHA-256 equals the Genblaze asset digest.
- The read-back manifest parses as `Manifest`, verifies, and retains the pipeline canonical hash.
- Both objects are deleted and confirmed absent.
- Partial upload, corrupt manifest, and cleanup failure retain recovery behavior.

## Lifecycle Choice

`ObjectStorageSink.close()` normally closes its backend as part of `Pipeline.run()`. The wrapper acknowledges that request but delays delegate close only for the bounded read-back and cleanup phase. It then closes the delegate exactly once on every exit path.

## Rejected Alternatives

- Reimplementing the pipeline for B2: duplicates tested orchestration and invites contract drift.
- Reopening a second backend for verification: creates another credential/client lifecycle and weakens ownership.
- Trusting sink return values without read-back: does not prove remote bytes or manifest integrity.
- Leaving smoke objects for inspection: unnecessary persistence and cost/privacy risk.
