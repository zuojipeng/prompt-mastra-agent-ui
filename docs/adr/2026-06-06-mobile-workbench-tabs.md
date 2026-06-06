# ADR: Mobile Workbench Tabs

Date: 2026-06-06

## Status

Accepted

## Context

Workbench V3 defines desktop as a simultaneous three-region interface, but mobile should be task-based.

The previous V3 shell stacked all regions on small screens. That preserved content but made the mobile experience feel like a compressed desktop page.

## Decision

Add mobile-only tabs to `ChatBox.tsx`:

- `Work`: main creation and DirectorKit workflow
- `Execute`: shot execution work plus operations/right-rail execution panel
- `Feedback`: feedback insight view

Also add a mobile-only bottom action bar:

- Work: submit current idea or move to Execute when DirectorKit exists
- Execute: copy execution checklist
- Feedback: refresh insight

Desktop and tablet layouts remain unchanged.

## Consequences

Positive:

- Mobile now follows task completion instead of showing a long stacked desktop layout.
- Feedback insight no longer pushes execution below the fold on mobile.
- E2E now explicitly verifies mobile tab navigation.

Trade-off:

- Execute still shows the main shot list because shot status controls live there. A future selected-shot inspector can make Execute more focused.

## Follow-Up

- Move shot status and result note controls into an execution-focused mobile inspector once selected-shot state exists.
- Add visual regression screenshots through the Playwright test runner.
