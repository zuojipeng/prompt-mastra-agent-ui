# Agent Run: Local Project Library MVP

Date: 2026-06-16

## Product Agent

Goal: upgrade Jingci from one recoverable draft to a small local project library.

Acceptance:

- Saving a project adds it to a recent project list.
- The recent project list can reopen a saved project.
- Project state still survives reload.
- A project can be removed from the local library.

## UEAgent

Placement: left rail Snapshot card, below save/restore/clear.

Rationale: recent projects are part of workbench navigation. Keeping them close to project metadata makes the feature visible without adding a new page or modal.

The list is capped visually to the three most recent projects to avoid overwhelming the narrow rail.

## Architecture Agent

Extended `lib/project-workspace.ts` with:

- `LOCAL_PROJECT_WORKSPACE_LIBRARY_KEY`
- `loadLocalProjectWorkspaceLibrary`
- `loadLocalProjectWorkspaceSummaries`
- `loadLocalProjectWorkspaceById`
- `deleteLocalProjectWorkspace`

The sidebar consumes summaries instead of raw workspace payloads.

## Engineering Agent

Implemented:

- Schema-versioned project library storage.
- Upsert-on-save behavior.
- Recent project summary list in `ChatBox`.
- Open and remove actions for saved projects.
- Unit coverage for library sorting, summaries, and deletion.
- Browser E2E coverage for save, clear, reopen from recent projects, and reload restore.

## Test Agent

Validation evidence:

- `npx tsc --noEmit`: PASS
- `npm test`: PASS, 46 tests
- `npm run lint`: PASS
- `git diff --check`: PASS
- `PLAYWRIGHT_PORT=3200 npm run test:e2e:browser`: PASS, 6 tests

