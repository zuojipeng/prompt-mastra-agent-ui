# ADR: Extract DirectorKit Export Builders

Date: 2026-06-06
Status: Accepted

## Context

The Workbench V3 UE design pack identified `ChatBox.tsx` as the main architecture bottleneck. Before changing the UI layout, the export and copy text builders should be separated from UI rendering and state transitions.

Affected behavior:
- per-shot prompt copy
- execution checklist copy
- project snapshot copy
- platform feed pack copy
- shot execution summary used by exported text

## Decision

Create `lib/director-kit-export.ts` as a typed domain module for pure DirectorKit export builders.

The module owns:
- `summarizeShotExecution`
- `buildShotPrompt`
- `buildExecutionChecklist`
- `buildProjectSnapshot`
- `buildPlatformFeedPack`

`ChatBox.tsx` keeps:
- UI state
- copy interaction state
- rendering
- feedback submission
- V2 flow transitions

## Why This Shape

This is the smallest sufficient architecture:
- no new dependency
- no service class
- no generic export framework
- no broad component split

The real pressure is testability and future movement into a Workbench V3 layout, not a need for a generalized workflow engine.

## Consequences

Positive:
- Export behavior is unit-testable without browser setup.
- `ChatBox.tsx` is smaller and less responsible for domain formatting.
- Future project workspace persistence has a cleaner seam for export/snapshot logic.

Tradeoff:
- `ChatBox.tsx` still remains large. Component extraction is intentionally deferred until a UI slice actively moves result sections into workbench regions.

## Alternatives Considered

1. Keep builders inside `ChatBox.tsx`.
   - Rejected because export behavior would remain coupled to UI and harder to test.

2. Extract a generic export service.
   - Rejected as overengineering. Current exports are DirectorKit-specific.

3. Big-bang split of `ChatBox.tsx`.
   - Rejected because it would mix architecture cleanup with broader UI movement.

## Follow-Up

Next architecture slice:
- extract Workbench V3 candidate sections only when implementation starts:
  - `DirectorKitExecutionPanel`
  - `DirectorKitShotList`
  - `DirectorKitPlatformAdvice`
  - `FeedbackInsightPanel`
