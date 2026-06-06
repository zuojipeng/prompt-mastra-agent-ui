# ADR: DirectorKit Platform Advice Panel

Date: 2026-06-06

## Status

Accepted

## Context

After the Workbench V3 layout shell, `ChatBox.tsx` still owned the full platform advice rendering block. This block is a meaningful product surface because it turns DirectorKit output into platform-ready execution packets.

The V3 design calls this area platform advice/detail in the center work surface, with copy actions available for execution.

## Decision

Create `app/components/DirectorKitPlatformAdvicePanel.tsx`.

The component owns:

- platform advice card layout
- recommended/optional badges
- prompt tips, settings, and avoid lists
- platform feed pack copy button placement
- copied state display

`ChatBox.tsx` keeps:

- platform feed pack text builder
- copy handler
- feedback submission

## Consequences

Positive:

- `ChatBox.tsx` no longer contains the platform advice card renderer.
- Platform advice becomes a reusable Workbench V3 module.
- Existing E2E semantics are preserved by keeping the heading text `平台建议`.

Trade-off:

- Feedback is still passed as a render callback, because feedback state and analytics refresh remain parent-owned.

## Follow-Up

- Consider moving platform advice into a center/right split once users can select a current shot.
- Add a focused visual smoke test for platform advice after Playwright screenshot capture is stabilized.
