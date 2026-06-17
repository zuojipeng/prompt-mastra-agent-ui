# ADR: Project Cloud Sync

Date: 2026-06-17

## Status

Accepted

## Context

Jingci already has a local project workspace and a project dashboard, but saved work is still tied to one browser. The backend Projects API now provides a user-scoped project store, so the frontend can turn projectized creation into a recoverable workflow without replacing the local-first experience.

## Decision

Add a lightweight cloud sync layer for project workspaces.

- Keep local storage as the first write path so saving stays fast and usable offline.
- Sync the full `LocalProjectWorkspace` payload to `/api/projects` after local save.
- Fetch cloud summaries and merge them with local summaries by latest `updatedAt`.
- Open a project from local storage first, then fall back to the cloud payload.
- Delete locally first, then best-effort delete the cloud copy.
- Surface sync state in the snapshot panel: local-first, syncing, synced, or not synced.

## Consequences

The product now has a cross-device project source of truth while retaining graceful degradation when the API is unavailable. The dashboard can list cloud-backed projects without introducing a new route or a larger client data layer.

The frontend still trusts the backend API shape after validating restored payloads with the existing workspace guard. A future account system should replace the generated user id with authenticated identity before treating projects as durable production data.

