# Code Review: Genblaze Provenance Spike

Reviewer: Code Review Agent
Producer reviewed: Engineering Agent
Scope: `spikes/genblaze-provenance/`
Decision: PASS FOR LOCAL SPIKE

## Strongest Rejection Reason

A cryptographically valid manifest could still overstate product readiness if run status, asset bytes, provider execution, or B2 persistence are not real.

## Findings

1. BLOCKER, closed: the first implementation produced a succeeded step inside a pending run. The adapter now sets `RunStatus.COMPLETED`, and the test asserts both states.
2. BLOCKER, closed: negative prompt was initially stored as an arbitrary parameter. It now uses Genblaze's dedicated `negative_prompt` field.
3. IMPROVEMENT, accepted: manifest verification validates recorded hashes but does not re-download and hash remote bytes. This spike uses a fixture URI and makes no remote integrity claim.
4. IMPROVEMENT, accepted: `genblaze` umbrella and core package versions differ. The spike pins the tested umbrella version and records installed transitive versions in execution evidence.

## Evidence Checked

- strict contract validation and negative tests
- completed run / succeeded step assertions
- explicit Genblaze imports
- no environment variables, credentials, HTTP service, B2 call, or provider call
- architecture note and spike README boundaries

## Residual Risk

Provider adapters, retry execution, B2 upload, authentication, deployment, and UI integration remain untested and must not be presented as shipped capability.

## Loop 2 Review

Decision: PASS FOR MOCKED STORAGE BOUNDARY

- Provider code uses `SyncProvider` rather than Genblaze's pytest-dependent test helper.
- The official sink owns file hashing, content-addressable key selection, durable URL rewriting, and manifest persistence.
- Manifest identification uses recorded `application/json` write metadata instead of parsing byte prefixes.
- Tests independently recompute the fixture SHA-256 and reject persisted credential-bearing URL patterns.

Residual risk is narrowed but unchanged at the network boundary: an in-memory backend does not prove B2 credentials, bucket permissions, region handling, CORS, public/private URL behavior, latency, or upload limits.
