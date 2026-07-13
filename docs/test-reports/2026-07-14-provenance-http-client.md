# Test Report: Provenance HTTP Client

Date: 2026-07-14
Gate: Engineering / Code Review / Test
Status: PASS FOR OPT-IN LOCAL CLIENT

## Matrix

| Check | Command | Result |
| --- | --- | --- |
| HTTP client behavior | `npx vitest run __tests__/provenance-http-client.test.ts --pool=threads` | PASS, 5 tests |
| Provenance focused suite | `npx vitest run ...provenance tests... --pool=threads` | PASS, including 5 HTTP client tests |
| Frontend regression | `npm test -- --pool=threads` | PASS, 17 files / 113 tests |
| TypeScript | `npx tsc --noEmit` | PASS |
| Scoped lint | `npx eslint ...provenance client files...` | PASS; dependency freshness warning only |
| Python regression | `PYTHONPATH=. /private/tmp/jingci-genblaze-venv/bin/python -m unittest discover -s tests -v` | PASS, 14 tests |
| Fixture browser path | `PLAYWRIGHT_PORT=3200 npx playwright test tests/e2e/v2-director-kit.spec.ts --project=chromium --project=mobile-chrome --grep "happy path"` | PASS, 2 tests |
| Production build | `npm run build` | PASS |

## Proven

- Fixture remains default when no environment variable exists.
- Configured HTTP uses only loopback endpoints.
- Lifecycle emits queued, running, and terminal state.
- Identity drift, HTTP errors, invalid URLs, and timeout become failed runs.
- No configured failure silently becomes fixture evidence.

## Not Proven

Browser-to-Python cross-process CORS, real provider, B2, auth, deployment, or production behavior.
