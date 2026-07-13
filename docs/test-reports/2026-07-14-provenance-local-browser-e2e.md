# Test Report: Provenance Local Browser E2E

Date: 2026-07-14
Gate: Test / Ops
Status: PASS FOR CREDENTIAL-FREE LOCAL INTEGRATION

## Matrix

| Check | Command | Result |
| --- | --- | --- |
| TypeScript | `npx tsc --noEmit` | PASS |
| Scoped lint | `npx eslint playwright.provenance-local.config.ts tests/e2e/v2-director-kit.spec.ts` | PASS; dependency freshness warning only |
| First integration attempt | Node 18.12.1 local E2E command | FAIL before Next.js startup; unsupported Node version |
| Local browser integration | `PATH=/Users/edy/.nvm/versions/node/v22.21.1/bin:$PATH PROVENANCE_PYTHON=/private/tmp/jingci-genblaze-venv/bin/python npm run test:e2e:provenance:local` | PASS, desktop and mobile Chromium, 2 tests |
| Frontend regression | `npm test -- --pool=threads` | PASS, 17 files / 113 tests |
| Python regression | `PYTHONPATH=. /private/tmp/jingci-genblaze-venv/bin/python -m unittest discover -s tests -v` | PASS, 14 tests |
| Fixture browser regression | `PLAYWRIGHT_PORT=3200 npx playwright test tests/e2e/v2-director-kit.spec.ts --project=chromium --project=mobile-chrome --grep="happy path"` | PASS, 2 tests |
| Production build | `npm run build` | PASS, static export generated |

## Proven

- Playwright starts the Python adapter and Next.js as separate loopback processes.
- Browser CORS POST reaches the Python service and returns HTTP 200.
- Response provider is `jingci-local-video`.
- Asset and manifest use the real local pipeline's `memory://jingci-spike/` locations.
- Manifest verification reaches the selected-shot UI on desktop and mobile.
- Fixture failure controls are absent in Local adapter mode.

## Evidence

- `output/playwright/provenance-local-desktop.png`
- `output/playwright/provenance-local-mobile.png`

## Not Proven

Provider generation, B2 network persistence/read-back, auth, deployment, production behavior, and hackathon submission.
