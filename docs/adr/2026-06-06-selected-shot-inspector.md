# ADR: Selected Shot Inspector

Date: 2026-06-06

## Status

Accepted

## Context

Mobile Workbench V3 introduced `Work / Execute / Feedback` tabs, but Execute still showed the same broad shot list. That made execution less focused than the design target.

The product needs a current-shot execution surface where a user can copy the selected shot prompt, mark status, record output, and submit feedback.

## Decision

Create `app/components/DirectorKitShotInspector.tsx`.

Add selected-shot state in `ChatBox.tsx`:

- first generated shot becomes selected automatically
- shot list can set the current shot
- mobile Execute tab shows the selected-shot inspector

Desktop keeps the full shot list and right rail behavior.

## Consequences

Positive:

- Mobile Execute now has a focused execution surface.
- Current shot selection is explicit.
- The inspector reuses existing status controls and parent-owned callbacks.

Trade-off:

- Selected shot is still local UI state, not persisted project state.

## Follow-Up

- Persist selected shot when project workspace storage exists.
- Move more execution-only controls out of `DirectorKitShotList` after desktop selected-shot workflow is designed.
