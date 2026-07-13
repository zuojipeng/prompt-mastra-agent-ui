# Architecture Note: Genblaze Provenance Spike

## Decision

Keep Genblaze outside the Cloudflare Worker. Validate it as an isolated Python 3.11+ pipeline adapter behind a versioned shot job contract.

## Why

- Jingci's `ShotCard` already owns prompt, modality, risk, and execution identity.
- Genblaze is a Python SDK; the current production backend is a TypeScript Cloudflare Worker.
- A sidecar boundary avoids a runtime rewrite and keeps provider/storage credentials out of the browser.
- The hackathon permits an existing project when B2 and Genblaze are added during the event and disclosed.

## Contract

`jingci.shot-provenance.v1` contains:

- stable job and shot identity
- prompt and optional negative prompt
- provider, model, and modality
- completed asset URL, media type, and SHA-256
- string-only metadata for DirectorKit context

The spike returns a Genblaze manifest envelope with run identity, canonical manifest hash, verification result, and the complete manifest.

## Rejected Alternatives

- Embed Python in the Worker: incompatible runtime and operationally unnecessary.
- Add B2 directly to the browser: exposes storage credentials and weakens authorization boundaries.
- Build a generic multi-provider service first: exceeds a trial slice and hides integration risk.
- Treat a URL-only asset as verified: Genblaze requires a valid SHA-256 for manifest verification.

## Risks

- Provider execution, B2 upload, authentication, retries, and deployment remain unproven.
- `genblaze` and its core packages currently publish different package versions; pin and test the umbrella package.
- Wildcard imports trigger optional modules such as Parquet support and can fail without `pyarrow`; use explicit imports.
- Manifest verification proves internal hash completeness, not that remote bytes still match the recorded digest.

## Spike Exit

- isolated install succeeds on Python 3.11+
- one strict shot fixture produces `verified: true`
- malformed contract and missing SHA-256 fail closed
- no provider, B2, production, registration, or paid action occurs

## Second Local Slice

The second slice uses Genblaze's official extension points without external calls:

- `DeterministicVideoProvider` implements `SyncProvider` and returns a local `file://` video fixture.
- `Pipeline` executes the provider lifecycle and reports completed/succeeded states.
- `ObjectStorageSink` reads the allowlisted temporary file, computes SHA-256, selects a content-addressable key, rewrites the asset to a durable URL, and writes the manifest.
- `InMemoryStorageBackend` implements the same `StorageBackend` contract expected by B2/S3 while recording every write for tests.

This proves the adapter seam and object layout, not Backblaze authentication or network behavior.

## B2 Configuration Boundary

The project consumes four server-side values only: `B2_BUCKET`, `B2_REGION`, `B2_KEY_ID`, and `B2_APP_KEY`. Missing values fail closed by variable name. Summaries redact both credential values. Offline construction sets `preflight=False` and `auto_lifecycle=False`; a later network smoke must explicitly opt into account-bound behavior under a new authorization.

Team OS communicates through the generated `docs/campaigns/backblaze-genmedia-2026/review-decision.json` and `campaign.json` artifacts. Jingci does not import Team OS implementation code.
