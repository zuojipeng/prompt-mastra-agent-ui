# Code Review: Project API Client Boundary

Date: 2026-06-25

## Scope

Reviewed:

- `lib/project-api-client.ts`
- `lib/api-client.ts`
- `app/components/ChatBox.tsx`
- `__tests__/project-api-client.test.ts`

## Findings

No blocking findings.

## Notes

- Project cloud sync now has a focused module boundary.
- The general API client no longer imports local project workspace types.
- `ChatBox` still orchestrates local-first behavior, but remote calls are clearly separated.
- Tests cover URL rewriting from `/api/optimize` to `/api/projects`, summary normalization, encoded IDs, and safe failure behavior.

## Residual Risk

`fetchProjectWorkspace` still returns a typed cast after confirming the payload is an object. `ChatBox` continues to validate with `isLocalProjectWorkspace` before applying cloud payloads, which keeps the restore path guarded.

