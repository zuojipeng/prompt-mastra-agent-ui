# Code Review: Local Project Workspace MVP

Date: 2026-06-16

## Scope

Reviewed local workspace persistence, `ChatBox` integration, Playwright config, unit tests, and browser E2E coverage.

## Findings

No blocking findings.

## Notes

- The workspace module validates schema version, core scalar fields, target options, DirectorKit shape, shot status map, and notes map before restore.
- The UI does not attempt multi-project management yet. That is intentional for the MVP and keeps the current slice reversible.
- `saveLocalProjectWorkspace` returns a boolean, but browser storage is expected to exist in this client component. A future hardening slice can surface storage quota errors more explicitly.
- `PLAYWRIGHT_PORT` reduces local validation fragility when another dev server occupies the default port.

## Residual Risk

`localStorage` is single-device and single-project. Users who need project libraries, cross-device sync, or collaboration still need the future backend project model.

