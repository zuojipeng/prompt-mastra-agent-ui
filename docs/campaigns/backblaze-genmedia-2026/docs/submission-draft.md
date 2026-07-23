# Devpost Submission Draft: Jingci Provenance Vault

Status: **DRAFT — not ready for submission**

## Tagline

An auditable AI video director workflow that keeps every shot's prompt, generation result, retry lineage, asset digest, and provenance manifest together.

## The Problem

AI video creators rarely lose only a prompt. They lose the relationship between a creative decision, the exact model run, the useful output, and the reason a retry worked. Provider links are temporary, results become detached from their shot plan, and teams cannot reliably inspect or hand off how an asset was produced.

## What Jingci Does

Jingci turns one creative idea into a DirectorKit: a feasibility diagnosis, three rewrite directions, structured shot cards, platform guidance, stability checks, and recovery strategies. Provenance Vault extends the selected-shot workflow so a creator can run a shot, inspect its provider and model, verify asset and manifest hashes, and retry without losing the parent run.

## How It Uses Genblaze

The Python adapter uses Genblaze's official `SyncProvider`, `Pipeline`, `ObjectStorageSink`, and `StorageBackend` extension points. The credential-free proof executes a deterministic provider, stores exact media bytes and a separate canonical manifest through an in-memory backend, and returns a strict `jingci.provenance-run.v1` record to the browser.

The judge preview uses a smaller Cloudflare Pages Function instead of exposing or hosting the Python process. It verifies the one retained private Runway asset directly in B2, stores one read-back retained-source manifest per reviewer run, and persists prompt hashes rather than raw prompts. This browser path does not claim to invoke Runway or Genblaze again; the approved private recovery evidence below proves the separate Genblaze-to-B2 composition.

A second no-network integration test composes the production Runway Genblaze adapter with a scripted fake Runway client and a B2-shaped in-memory backend. Fixture media passes through an injected probe gate, Genblaze `Pipeline`, and `ObjectStorageSink`; the test reads back and verifies the content-addressed asset and canonical manifest, then removes its owned storage objects and temporary local media.

During an approved private verification, Runway `gen4.5` generated one five-second 1280x720 H.264 shot. After the provider task had succeeded, a separate recovery phase passed the verified MP4 through Genblaze, uploaded the content-addressed asset and provenance manifest to B2, read both back, verified their hashes and lineage, and deleted the two scoped objects. The phases were evidence-preserving but not one uninterrupted atomic transaction.

## How It Uses Backblaze B2

The live recovery path stores content-addressed generated media and its provenance manifest in a restricted B2 bucket through Genblaze's S3-compatible storage adapter. Configuration is server-side, fails closed when any required value is missing, redacts credentials, and disables accidental network preflight in offline tests.

On July 16, 2026, one authorized live B2 transport smoke uploaded a small object below the restricted `jingci-smoke/` prefix, read it back with an identical SHA-256, deleted it, and confirmed absence. A later recovery verification used the meaningful generated MP4 and canonical manifest: both were uploaded through Genblaze, read back, verified, and explicitly cleaned. This proves scoped ephemeral integration, not public serving, durable retention, or version-level erasure.

## AI Providers And Models

- DeepSeek `deepseek-chat`: primary structured DirectorKit generation in the existing backend.
- OpenAI `gpt-4.1-mini`: JSON text-generation fallback in the existing backend.
- `jingci-local-video` / `local-proof`: deterministic Genblaze integration provider used only for credential-free pipeline testing; it is not an external AI media model.
- Runway `gen4.5`: generated one privately verified five-second 1280x720 H.264 output. Public use of this claim remains subject to the claims-promotion gate.

## Significant Update During The Submission Period

Jingci existed before the hackathon began on June 22, 2026. The pre-existing product already generated DirectorKits and supported shot execution, project handoff, platform feedback, and browser testing. Beginning July 13, 2026, the campaign branch added the Provenance Vault capability: the Genblaze Python adapter, content-addressed storage boundary, fail-closed B2 configuration, versioned provenance request and response contracts, selected-shot provenance UI, failure and retry lineage, a loopback HTTP service, and desktop/mobile browser integration tests.

The relevant campaign work begins at commit `3e42c78` and is isolated on `spike/backblaze-provenance`.

## Architecture

```text
Historical generation evidence:
Runway gen4.5 -> private five-second MP4

Separate recovery verification:
verified MP4 -> Python Genblaze pipeline -> ObjectStorageSink
  -> temporary B2 asset + manifest -> read-back verification -> scoped cleanup

Current protected preview:
DirectorKit selected shot -> same-origin Cloudflare Pages Function
  -> retained private B2 source digest check -> retained-source manifest read-back
  -> strict verified run record -> sanitized project receipt
```

## Built With

Next.js 15, React 18, TypeScript, Tailwind CSS, Python, Genblaze, Backblaze B2's S3-compatible API, Cloudflare Worker and D1, Vitest, and Playwright.

## Links To Complete

- Working application: **TBD after preview release and smoke**
- Repository: https://github.com/zuojipeng/prompt-mastra-agent-ui/tree/spike/backblaze-provenance
- Public demo video: **TBD after claims approval and final recording**

## Current Blockers

The narrow private Runway and B2 recovery claims have been approved for this draft with the mandatory qualification in `claims-promotion-review.md`. A private Cloudflare deployment exists behind owner-only Access, but its authenticated cloud B2 transaction was not reached during the one authorized smoke attempt. Public judge access, final video, default-branch/reviewer handoff, and human submission approval remain open. Registration and terms were completed by the human owner on July 16, 2026.
