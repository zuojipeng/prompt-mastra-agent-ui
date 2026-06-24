# Agent Run: Project API Client Boundary

Date: 2026-06-25

## Loop Board

Loop: 1
Goal: reduce frontend API coupling after adding cloud project sync.
Current gate: Test
Decision: SHIP

| ID | From | To | Blocking Level | Request | Evidence Required | Status |
| --- | --- | --- | --- | --- | --- | --- |
| L1 | Architecture Agent | Engineering Agent | IMPROVEMENT | Move Projects API calls out of the general API client | Dedicated module and passing tests | CLOSED |
| L2 | Test Agent | Engineering Agent | BLOCKER | Cover project API URL, normalization, failure, and id encoding behavior | Unit test results | CLOSED |

## Product Agent

This slice does not change the user-facing workflow. It supports the product direction by making projectized creation easier to extend after the backend release blocker is resolved.

## Architecture Agent

Decision: extract project cloud sync into `lib/project-api-client.ts`.

Rejected alternatives:

- Keep all calls in `api-client.ts`: rejected because the module is already broad.
- Add a generic API service layer: rejected as premature abstraction.
- Move all project local and cloud persistence into one large repository object: rejected because local storage and cloud sync have different failure modes.

## Engineering Agent

Implemented:

- Added `lib/project-api-client.ts`.
- Removed project cloud-sync helpers from `lib/api-client.ts`.
- Updated `ChatBox` imports.
- Added `__tests__/project-api-client.test.ts`.

## Test Agent

Validation evidence:

- `npx vitest run __tests__/project-api-client.test.ts`: PASS, 5 tests
- `npx tsc --noEmit`: PASS
- `npm test`: PASS, 7 files, 51 tests
- `npm run lint`: PASS, existing `baseline-browser-mapping` warning only
- `git diff --check`: PASS

## Release Note

No deployment required for this architecture slice. It should ship with the next frontend deploy.

