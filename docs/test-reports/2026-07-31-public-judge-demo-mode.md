# Test Report: Public Judge Demo Mode

Date: 2026-07-31

Status: PASS LOCAL / NOT DEPLOYED

## Results

| Check | Result |
| --- | --- |
| Public-demo focused unit tests | PASS, 3 files / 27 tests |
| Full Vitest regression | PASS, 32 files / 213 tests |
| Desktop Playwright | PASS, DirectorKit + Fixture path, zero forbidden requests |
| Mobile Playwright | PASS, DirectorKit + Fixture path, zero forbidden requests |
| TypeScript | PASS after build completed; parallel pre-build invocation raced with `.next/types` regeneration and was discarded |
| ESLint | PASS |
| Fixture-mode production build | PASS, Next.js 15.5.20 / Node 22.21.1 |
| Static release packaging | PASS, 27 files; Functions 0; `_routes.json` 0; forbidden binding names 0 |

## Negative Coverage

- Injecting `NEXT_PUBLIC_API_URL` does not cause optimization, feedback, history, user, or project requests.
- Injecting `NEXT_PUBLIC_PROVENANCE_API_URL=/api/provenance` cannot override Fixture provenance.
- Project cloud writes report unavailable and retain the existing local-first path.

No external service was called by the implementation tests.
