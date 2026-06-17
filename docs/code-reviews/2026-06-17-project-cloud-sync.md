# Code Review: Project Cloud Sync

Date: 2026-06-17

## Scope

Reviewed project cloud sync changes in:

- `lib/api-client.ts`
- `app/components/ChatBox.tsx`
- `tests/e2e/v2-director-kit.spec.ts`

## Findings

No blocking findings.

## Notes

- Local-first save is the right failure mode for the current product: creators do not lose work when the backend is unreachable.
- Cloud summary normalization keeps backend timestamp differences out of UI code.
- Opening a workspace validates the payload with `isLocalProjectWorkspace` before applying it to the workbench.
- The UI exposes sync state near the existing project snapshot rather than creating a disruptive global alert.
- E2E coverage now mocks the Projects API and verifies the synced state after saving.

## Residual Risk

- Client-generated `X-User-Id` is not a real account boundary. This should move to authenticated identity before multi-user production use.
- Delete is best-effort after local deletion. If the cloud delete fails, the project may reappear after a later cloud refresh.

