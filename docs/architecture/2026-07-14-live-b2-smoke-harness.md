# Architecture Note: Guarded Live B2 Smoke

## Decision

Keep account verification separate from the browser and application service. Add one CLI that defaults to a no-network plan and requires two independent signals for live I/O: the `--live` argument and `JINGCI_ALLOW_LIVE_B2_SMOKE=YES`.

## Live Boundary

```text
explicit live flag + exact confirmation + four B2 values
  -> preflighted Genblaze S3StorageBackend.for_backblaze
  -> random jingci-smoke/<utc>/<uuid>/probe.bin
  -> put -> exists -> get -> SHA-256
  -> delete -> confirm absent -> close
```

The backend enables preflight but never applies bucket-wide lifecycle rules. It writes only below a generated prefix, accepts no caller-supplied arbitrary key from the CLI, and reports no bucket, key ID, or application key.

## Failure And Recovery

- Missing explicit confirmation fails before configuration parsing or backend construction.
- Digest mismatch fails the smoke and triggers deletion in `finally`.
- Unexpected storage keys or failed visibility checks still trigger deletion.
- Cleanup failure reports the non-sensitive object key so an authorized operator can remove it manually.
- Connection close runs on success and failure.

## Rejected Alternatives

- Browser-based B2 smoke: would expose credentials and mix infrastructure verification with product UX.
- Reusing a fixed object key: risks overwriting another run and weakens cleanup ownership.
- Automatic lifecycle configuration: a bucket-wide mutation is unnecessary for one smoke.
- Treating upload success as proof: read-back bytes and cleanup must also pass.

## Next Boundary

The direct object smoke proves B2 transport only after an authorized live run. A separate next slice should route the deterministic Genblaze provider through `ObjectStorageSink` into the same backend and clean both content-addressed asset and manifest keys.
