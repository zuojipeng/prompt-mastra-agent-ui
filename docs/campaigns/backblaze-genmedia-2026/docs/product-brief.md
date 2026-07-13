# Product Brief: Jingci Provenance Vault

Owner: Product Agent
Reviewer: Hermes Orchestrator + Test Agent
Gate evidence: E2

## User Job

When a short-video creator sends a DirectorKit shot to an AI video provider, they want one durable record linking the exact prompt, model, output asset, and retry history, so they can prove what was generated, recover the useful result, and iterate without losing context.

## Demo Promise

Select one DirectorKit shot, execute it once, and inspect a verified provenance record containing the provider/model, B2 asset, SHA-256, Genblaze manifest hash, and parent retry lineage.

## MVP Scope

1. Submit one video shot from an existing DirectorKit.
2. Show `queued`, `running`, `succeeded`, and `failed` states.
3. On success, show the durable asset location, asset digest, manifest location, canonical manifest hash, and verification state.
4. Retry one failed or unsatisfactory run while preserving `parent_job_id` and incrementing `attempt`.
5. Keep the current manual execution workflow usable when the provenance service is unavailable.

## Acceptance Criteria

- A selected shot maps to exactly one versioned provenance run request.
- Invalid or contradictory run responses fail closed at the frontend boundary.
- A successful run cannot render as verified without a valid asset digest and verified manifest.
- A retry displays its parent run and attempt number.
- Provider or storage failure leaves the shot recoverable and exposes a useful error state.
- The demo can be completed with deterministic fixtures when external generation is unavailable.

## Success Signals

- Demo path completion: one shot reaches a verified success record.
- Time from shot selection to inspectable run evidence.
- Retry lineage remains intact across one failure/retry cycle.
- Zero secrets appear in browser payloads, logs, screenshots, or repository artifacts.

## Non-Goals

- Multi-provider routing or cost optimization.
- Migrating Jingci's existing Cloudflare Worker to Python.
- Full project asset management, collaboration, billing, or production release.
- Claiming remote B2 durability before an approved live storage smoke passes.
- Event registration, terms acceptance, paid API use, publication, or submission without their separate gates.

## Judging Thesis

Jingci turns generative media from a disposable provider link into an auditable creative workflow. Genblaze supplies generation provenance and B2 supplies durable media plus manifest storage; both are visible in the primary user path rather than added as infrastructure decoration.
