# Test Report: Preview Service Hardening

Date: 2026-07-14
Gate: Architecture / Engineering / Code Review / Test
Status: PASS FOR LOCAL PREVIEW HARDENING ONLY

## Matrix

| Check | Command | Result |
| --- | --- | --- |
| First focused run | `python -m unittest tests.test_http_service -v` | FAIL, sandbox denied random-port bind; test boundary repaired |
| Focused rerun | same command after repair | PASS, 11 tests |
| Full Python regression | `python -m unittest discover -s tests -p 'test_*.py' -v` | PASS, 35 tests |
| Python compile | `python -m compileall -q jingci_spike tests` | PASS |
| Preview real HTTP smoke | `python tests/preview_http_service_smoke.py` | PASS, expected 401 then verified 200 |
| Local real HTTP regression | `python tests/http_service_smoke.py` | PASS, health and verified run |
| First deployment-focused run | `npx vitest run __tests__/hackathon-deployment-readiness.test.ts --pool=threads` | FAIL, stale blocker name exposed |
| Deployment-focused rerun | same command after evidence repair | PASS, 3 tests |
| Deployment draft gate | `npm run hackathon:deploy:check:draft` | PASS with eight named blockers |
| Deployment strict gate | `npm run hackathon:deploy:check` | EXPECTED FAIL while public evidence is absent |
| TypeScript | `npx tsc --noEmit` | PASS |
| Scoped lint | `npx eslint __tests__/hackathon-deployment-readiness.test.ts scripts/check-hackathon-deployment.mjs` | PASS; dependency freshness notice only |
| Patch hygiene | `git diff --check` | PASS |

## Proven

- Non-loopback mode requires explicit configuration and local mode remains compatible.
- Exact CORS, upstream token validation, disablement, concurrency recovery, request limits, generic errors, sanitized logs, and request IDs behave locally.
- The real HTTP handler enforces denial before success and still executes the verified deterministic pipeline.

## Not Proven

Reviewer identity, access proxy integration, edge rate limiting, provider/B2 dependency health, internet abuse resistance, runtime behavior, external generation, live storage, public deployment, or submission.
