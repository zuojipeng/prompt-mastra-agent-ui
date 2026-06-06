# ADR: DirectorKit Shot List Component

Date: 2026-06-06

## Status

Accepted

## Context

Workbench V3 defines the center surface as a DirectorKit work area with per-shot execution, notes, risk context, and feedback.

Before this change, `ChatBox.tsx` rendered the entire shot list inline. That made the file responsible for:

- shot card layout
- risk badge rendering
- stability checklist rendering
- shot prompt copy UI
- shot status controls
- result note input
- shot feedback placement

This made the next Workbench V3 implementation harder because the center shot surface had no component boundary.

## Decision

Create `app/components/DirectorKitShotList.tsx`.

The component owns the shot-list presentation and receives behavior through explicit props:

- shot cards
- copied prompt state
- execution status state
- execution options
- result notes
- copy callback
- status callback
- note callback
- feedback renderer

`ChatBox.tsx` keeps orchestration state, feedback submission, and export behavior.

## Consequences

Positive:

- `ChatBox.tsx` is materially smaller and closer to an orchestration component.
- The future Workbench V3 center surface now has a natural landing point.
- Shot feedback stays visually near the shot card without moving feedback submission logic into the presentational component.

Trade-offs:

- `DirectorKitShotList` still receives a `renderFeedback` callback. This is intentional because feedback submission depends on `ChatBox` state and analytics refresh.
- Shot card visual helpers live inside the component for now. A design-token extraction would be premature before the full V3 workbench lands.

## Follow-Up

- Extract `FeedbackInsightPanel` when improving the right rail learning-loop surface.
- Consider a `DirectorKitPlatformAdvicePanel` only after the shot list and feedback panel boundaries are stable.
