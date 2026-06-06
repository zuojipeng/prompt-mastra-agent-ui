# ADR: DirectorKit Shot Execution Controls

Date: 2026-06-06

## Status

Accepted

## Context

`ChatBox.tsx` still contains several inline render helpers after the DirectorKit export builder and execution panel extractions.

The shot execution status control is a good next boundary because it is:

- repeated inside each shot card
- directly tied to the Workbench V3 shot execution loop
- UI-only, with no need for new persistence or domain services

## Decision

Create `app/components/DirectorKitShotExecutionControls.tsx`.

The component owns only the visual control surface:

- current shot id
- current execution status
- available status options
- status change callback

`ChatBox.tsx` keeps the state map and passes a small handler into the component.

## Consequences

Positive:

- `ChatBox.tsx` loses another inline renderer and stays focused on orchestration.
- Shot execution UI can move into a future Workbench V3 shot list without moving state logic again.
- The extraction stays narrow and avoids a broad shot-card rewrite.

Trade-off:

- Status option styling is still defined in `ChatBox.tsx`. This is acceptable for now because the same option list is shared with the execution summary panel.

## Follow-Up

- Extract the full shot list only when the Workbench V3 center surface is implemented.
- Keep shot result notes and feedback close to the shot card until their final V3 layout is clearer.
