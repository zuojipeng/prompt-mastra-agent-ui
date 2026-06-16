# ADR: Local Project Library MVP

Date: 2026-06-16

## Status

Accepted

## Context

The previous local workspace slice preserved one current project. That solved refresh loss, but the product still behaved like a single draft tool. Jingci needs to move toward projectized creation where creators can keep multiple short-film ideas and resume them.

## Decision

Extend the local workspace layer into a small local project library.

- Keep `jingci-current-project` as the active project pointer.
- Add `jingci-project-library` as a schema-versioned recent-project library.
- Save up to 12 recent projects, sorted by `updatedAt`.
- Save operations upsert into both the active project and the project library.
- Add summaries for UI rendering instead of exposing full project payloads in the sidebar.
- Support open-by-id and delete-by-id in the domain module.
- Keep the MVP local-only and single-user.

## Consequences

Creators can now save and reopen multiple local projects without backend sync. The library remains intentionally small and recent-first, which keeps the UI compact and avoids prematurely designing a full asset/project management system.

Future backend sync can map the same workspace records to a user-owned project table.

