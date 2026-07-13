# Architecture Plan: Provenance Run Boundary

Owner: Architecture Agent
Reviewer: Code Review Agent + Test Agent
Gate evidence: E2 plus existing E3 spike evidence

## Decision

Keep the existing Next.js frontend and Cloudflare Worker unchanged for the first campaign slice. Add one isolated Python execution adapter behind a narrow versioned HTTP contract only when account-bound integration is approved. The browser consumes normalized run records and never receives provider or B2 credentials.

```text
DirectorKit Shot
  -> Provenance Run API
  -> Python Genblaze Adapter
  -> Video Provider
  -> Genblaze ObjectStorageSink
  -> Backblaze B2 asset + manifest
  -> Verified Provenance Run
```

## Domain Contract

`jingci.provenance-run.v1` is the wire response boundary. It owns:

- project, shot, job, parent job, and attempt identity
- the four-state lifecycle: queued, running, succeeded, failed
- provider, model, and video modality
- durable asset URL, media type, size, and SHA-256
- manifest URI, canonical hash, and verified state
- a recoverable error for failed runs

Terminal invariants are strict: success requires verified asset and manifest evidence; failure requires one error and no result; non-terminal states carry neither result nor error.

## Boundaries

- `lib/provenance-run-contract.ts`: TypeScript wire validation only.
- `spikes/genblaze-provenance/`: current executable Python proof; it is not yet a deployed service.
- Future Python service: provider execution, Genblaze orchestration, B2 write, server-side secrets.
- Existing project workspace: stores only normalized run evidence after UI integration.

## Smallest Delivery Sequence

1. Freeze and test the wire response contract.
2. Define the shot submission request and deterministic fixture transport.
3. Add one provenance panel to the selected-shot path with all lifecycle states.
4. Replace fixture transport with the isolated Python adapter.
5. Run approved B2 network smoke, then browser E2E and preview deploy.

## Rejected Alternatives

- Put Genblaze inside the Worker: incompatible runtime and unnecessary rewrite.
- Put B2 credentials in the browser: unacceptable secret boundary.
- Build queues, webhooks, database migrations, and multi-provider abstractions now: no proven pressure.
- Reuse the existing manual `generated/failed/usable` status as provider state: it mixes operator judgment with execution lifecycle.
- Trust an arbitrary successful JSON response: external evidence must be validated at the boundary.

## Failure And Rollback

- Unknown schema, invalid hashes, or contradictory states normalize to `null` and cannot be shown as verified.
- The provenance feature remains additive; manual shot status and notes continue to work.
- The feature can be disabled by removing the future transport entry point without migrating current project data.

## Test Implications

- Unit: lifecycle and terminal-state invariants, hashes, timestamps, retry lineage.
- Integration: deterministic Python run writes one asset and one manifest.
- E2E: selected shot passes queued/running/success and failure/retry states.
- Live smoke: B2 upload, read-back digest, permissions, and credential redaction. This remains account-gated.
