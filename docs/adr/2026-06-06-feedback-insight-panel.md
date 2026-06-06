# ADR: Feedback Insight Panel Component

Date: 2026-06-06

## Status

Accepted

## Context

Workbench V3 separates the product into:

- source/project context
- DirectorKit work surface
- execution, export, and feedback right rail

The feedback insight UI was still rendered inline inside `ChatBox.tsx`, which mixed analytics presentation with page orchestration.

## Decision

Create `app/components/FeedbackInsightPanel.tsx`.

The component owns:

- feedback analytics empty/loading/error/content states
- dimension cards
- quality flags
- high-value sample rendering
- feedback label mapping used only by the insight panel

`ChatBox.tsx` keeps:

- open/closed state
- analytics fetch state
- sync action
- refresh behavior after feedback submission

## Consequences

Positive:

- `ChatBox.tsx` is smaller and closer to page orchestration.
- Feedback insight now has a natural Workbench V3 right-rail boundary.
- Analytics display logic is easier to review independently.

Trade-off:

- The panel is still placed in the current page flow, not a true right rail yet.

## Follow-Up

- Move `FeedbackInsightPanel` beside `DirectorKitExecutionPanel` when the full Workbench V3 layout is implemented.
- Consider extracting shared labels only after another analytics surface needs them.
