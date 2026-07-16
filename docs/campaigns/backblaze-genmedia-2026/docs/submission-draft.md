# Devpost Submission Draft: Jingci Provenance Vault

Status: **DRAFT — not ready for submission**

## Tagline

An auditable AI video director workflow that keeps every shot's prompt, generation result, retry lineage, asset digest, and provenance manifest together.

## The Problem

AI video creators rarely lose only a prompt. They lose the relationship between a creative decision, the exact model run, the useful output, and the reason a retry worked. Provider links are temporary, results become detached from their shot plan, and teams cannot reliably inspect or hand off how an asset was produced.

## What Jingci Does

Jingci turns one creative idea into a DirectorKit: a feasibility diagnosis, three rewrite directions, structured shot cards, platform guidance, stability checks, and recovery strategies. Provenance Vault extends the selected-shot workflow so a creator can run a shot, inspect its provider and model, verify asset and manifest hashes, and retry without losing the parent run.

## How It Uses Genblaze

The Python adapter uses Genblaze's official `SyncProvider`, `Pipeline`, `ObjectStorageSink`, and `StorageBackend` extension points. The current credential-free proof executes a deterministic provider, stores exact media bytes and a separate canonical manifest through an in-memory backend, and returns a strict `jingci.provenance-run.v1` record to the browser.

A second no-network integration test composes the production Runway Genblaze adapter with a scripted fake Runway client and a B2-shaped in-memory backend. Fixture media passes through an injected probe gate, Genblaze `Pipeline`, and `ObjectStorageSink`; the test reads back and verifies the content-addressed asset and canonical manifest, then removes its owned storage objects and temporary local media. It does not execute ffprobe, Runway, or Backblaze B2.

Live provider execution is not yet proven and must not be inferred from the local deterministic provider.

## How It Uses Backblaze B2

The planned live path stores content-addressed generated media and its provenance manifest in a restricted B2 bucket through Genblaze's S3-compatible storage adapter. Configuration is server-side, fails closed when any required value is missing, redacts credentials, and disables accidental network preflight in offline tests.

**Live B2 upload and read-back have not yet run. This section remains a design and offline-readiness claim until C-008 passes.**

## AI Providers And Models

- DeepSeek `deepseek-chat`: primary structured DirectorKit generation in the existing backend.
- OpenAI `gpt-4.1-mini`: JSON text-generation fallback in the existing backend.
- `jingci-local-video` / `local-proof`: deterministic Genblaze integration provider used only for credential-free pipeline testing; it is not an external AI media model.
- Runway `gen4.5`: selected 5-second text-to-video candidate. Its REST transport, adapter, media validation, and guarded one-attempt harness pass offline tests, but no live generation has run.

## Significant Update During The Submission Period

Jingci existed before the hackathon began on June 22, 2026. The pre-existing product already generated DirectorKits and supported shot execution, project handoff, platform feedback, and browser testing. Beginning July 13, 2026, the campaign branch added the Provenance Vault capability: the Genblaze Python adapter, content-addressed storage boundary, fail-closed B2 configuration, versioned provenance request and response contracts, selected-shot provenance UI, failure and retry lineage, a loopback HTTP service, and desktop/mobile browser integration tests.

The relevant campaign work begins at commit `3e42c78` and is isolated on `spike/backblaze-provenance`.

## Architecture

```text
DirectorKit selected shot
  -> versioned provenance request
  -> Python Genblaze pipeline
  -> Runway gen4.5 (selected; live integration pending)
  -> Genblaze ObjectStorageSink
  -> Backblaze B2 asset + manifest (live verification pending)
  -> strict verified run record
  -> selected-shot evidence and retry lineage
```

## Built With

Next.js 15, React 18, TypeScript, Tailwind CSS, Python, Genblaze, Backblaze B2's S3-compatible API, Cloudflare Worker and D1, Vitest, and Playwright.

## Links To Complete

- Working application: **TBD after preview release and smoke**
- Repository: https://github.com/zuojipeng/prompt-mastra-agent-ui/tree/spike/backblaze-provenance
- Public demo video: **TBD after final B2-backed recording**

## Current Blockers

Live B2 evidence, a real AI media provider, public campaign deployment, final video, default-branch/reviewer handoff, and human submission approval remain open. Registration and terms were completed by the human owner on July 16, 2026. See `submission-readiness.json` for the machine-checked gate state.
