# ADR: Provider-Neutral Shot Attempt Record

Date: 2026-08-01
Status: Accepted

## Context

Stage 1 stored one execution status and one free-form note per shot. That was sufficient for handoff readiness, but it discarded failed and superseded generations and could not explain which provider/model result was selected.

## Decision

Add optional `shotAttempts` and `selectedShotAttemptIds` fields to the existing local workspace. Each `ShotGenerationAttempt` records provider, model, status, asset reference, note, cost, duration, source, and creation time.

The domain layer owns creation, validation, the eight-attempt retention limit, append order, and selected-result projection. Selecting an attempt updates the existing shot status and result note so current exports, handoff checks, and dashboard summaries remain compatible.

The UI accepts manual imports only. It does not call a generation provider or introduce a provider SDK.

## Consequences

- old saved workspaces remain valid because both fields are optional;
- failed attempts remain available for comparison and feedback;
- downstream features can add provider adapters behind the same record without changing UI semantics;
- the current cloud Projects API stores the workspace envelope but has not yet added attempt-specific summary fields;
- selecting an older attempt records a new workspace update time rather than moving time backward.
