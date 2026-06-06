# ADR: Extract DirectorKit Execution Panel

Date: 2026-06-06
Status: Accepted

## Context

Workbench V3 defines a right-side execution panel for shot progress, execution checklist, project snapshot, and next actions. The current V2 result page already has this behavior, but it lived inside `ChatBox.tsx`.

After extracting DirectorKit export builders, the next smallest architecture seam is the execution summary panel.

## Decision

Create `app/components/DirectorKitExecutionPanel.tsx`.

The component owns:
- execution progress display
- checklist/snapshot copy buttons
- copied success messages
- per-status count tiles

`ChatBox.tsx` keeps:
- DirectorKit state
- shot execution state
- copy handlers
- V2 flow control
- shot-level controls and feedback behavior

## Why This Shape

This is a targeted component extraction, not a broad UI rewrite.

It is justified because:
- it maps directly to the Workbench V3 right rail concept
- it has clear inputs and callbacks
- it does not need to know DirectorKit internals
- existing E2E already covers the user-facing behavior

## Alternatives Considered

1. Keep execution panel inside `ChatBox.tsx`.
   - Rejected because this is a stable Workbench V3 region and has a clean prop boundary.

2. Extract all DirectorKit result sections at once.
   - Rejected because that would mix too much UI movement into one slice.

3. Introduce a generic panel framework.
   - Rejected as overengineering.

## Consequences

Positive:
- `ChatBox.tsx` is smaller and closer to orchestration.
- Workbench V3 can reuse or evolve the panel more directly.
- Execution UI has a named component boundary.

Tradeoff:
- The component still receives presentation class names through `shotExecutionOptions`. This is acceptable for now because status styling is existing UI state, not domain logic.

## Follow-Up

Next candidate section:
- `DirectorKitShotList`, if Workbench V3 starts moving shot cards into the center work surface.
- `FeedbackInsightPanel`, if feedback insight becomes a right-rail module.
