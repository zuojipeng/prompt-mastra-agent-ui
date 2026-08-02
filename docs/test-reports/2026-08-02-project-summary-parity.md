# Test Report: Project Summary Parity

Date: 2026-08-02
Task: JC-T007
Gate: Engineering / Code Review / Test / Release

## Acceptance Matrix

| Acceptance criterion | Evidence | Result |
| --- | --- | --- |
| Local summaries expose selected attempt evidence | workspace unit test | PASS |
| New and old cloud summaries normalize safely | API client unit tests | PASS |
| Dashboard shows selected provider, model, and status | source test + desktop/mobile E2E | PASS |
| Provider and model participate in dashboard search | implementation review | PASS |
| Backend list/detail derive the same evidence | eight-step local Worker smoke | PASS |
| Malformed or stale selected evidence fails closed | backend smoke + review repair | PASS |

## Commands

- Targeted frontend tests: 3 files, 29 tests passed.
- `npx tsc --noEmit`: PASS.
- Full frontend suite: 14 files, 100 tests passed.
- Scoped ESLint over `app lib __tests__ tests`: PASS with the existing data-age warning.
- `npm run build`: PASS.
- Playwright Chromium desktop/mobile: 6 tests passed in 53.3 seconds.
- Backend `npm run check`: PASS.
- Backend smoke script syntax: PASS.
- Backend local Worker Projects API smoke: 8/8 PASS.

## Failed Evidence Retained

- Plain `npm run lint` traversed the unrelated untracked `output/hackathon-public-demo-static/` generated bundle and reported 2,542 problems. The scoped product-source lint passed; the unrelated artifact was not modified or deleted.
- The first Playwright server start and first Worker start were denied by sandbox localhost policy; approved local execution passed.
- Backend review exposed broad inferred status types and malformed selected evidence; both were repaired before the final pass.
- Read-only production health/project requests timed out after 20 seconds inside and outside the sandbox. This is not treated as a production outage or deployment evidence.

## Release Status

Frontend and local Worker gates pass. Production deployment and E5 smoke remain pending explicit approval.
