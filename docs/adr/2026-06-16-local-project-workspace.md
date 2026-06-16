# ADR: Local Project Workspace MVP

Date: 2026-06-16

## Status

Accepted

## Context

Jingci already produces a DirectorKit execution package, shot execution states, and per-shot result notes. The current workflow still behaves like a one-session tool: if the creator refreshes the page, the working context is lost unless they manually copy a project snapshot.

The next product slice should move Jingci toward a projectized creation workbench without waiting for a backend project-sync API.

## Decision

Add a local project workspace layer backed by `localStorage`.

- Store one current project under `jingci-current-project`.
- Keep the persistence contract in `lib/project-workspace.ts` instead of embedding JSON logic in the UI.
- Restore the latest valid workspace automatically on page load.
- Expose save, restore, and clear controls in the left workbench Snapshot area.
- Keep the data model compatible with future backend sync by using a schema version, stable project id, timestamps, creative input, target settings, DirectorKit payload, selected shot, shot statuses, and result notes.
- Allow Playwright to use `PLAYWRIGHT_PORT` so E2E can avoid local port collisions.

## Consequences

Creators can now return to the latest workbench state after refresh and continue execution. The MVP is intentionally local-only: it does not solve multi-device sync, multi-project lists, or collaboration.

Future backend sync can reuse the same workspace shape and replace the storage adapter without reshaping `ChatBox`.

