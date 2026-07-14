# Campaign Evidence Index

Status legend: `PROVEN`, `LOCAL ONLY`, `BLOCKED`, `DRAFT`.

| Claim | Status | Evidence | Limit |
| --- | --- | --- | --- |
| Strict provenance lifecycle and terminal invariants | PROVEN | `lib/provenance-run-contract.ts`, contract tests | Local contract boundary |
| Genblaze pipeline and object-storage extension points execute | LOCAL ONLY | `spikes/genblaze-provenance/jingci_spike/local_pipeline.py`, Python tests | Deterministic provider and memory backend |
| Browser reaches Python adapter over HTTP/CORS | PROVEN | `playwright.provenance-local.config.ts`, local Playwright test/report | Loopback only |
| Selected-shot provenance UX works on desktop and mobile | PROVEN | `output/playwright/provenance-*.png`, Playwright tests | Fixture/local evidence |
| Failure and retry preserve parent lineage | PROVEN | fixture transport and E2E assertions | Session-only UI state |
| B2 configuration fails closed and redacts secrets | LOCAL ONLY | `b2_config.py`, Python tests | No network call |
| B2 upload/read-back/delete smoke is guarded and reproducible | LOCAL ONLY | `live_b2_smoke.py`, 8 focused tests | Harness only; live run not authorized |
| Genblaze sink owns, verifies, and cleans asset plus manifest | LOCAL ONLY | `live_genblaze_b2_smoke.py`, 7 focused tests | B2-shaped backend; no network |
| Preview deployment trust boundary and judge procedure are reviewable | LOCAL ONLY | `deployment-readiness.json`, deployment validator, threat model, judge runbook | Design only; strict gate remains red |
| Guarded preview HTTP boundary rejects unsafe access | LOCAL ONLY | `http_service.py`, 11 focused tests, 35-test regression, preview HTTP smoke | Upstream token only; no reviewer identity, edge rate limit, or deployment |
| Release evidence can be regenerated without reading credentials | LOCAL ONLY | `collect-hackathon-evidence.mjs`, 4 collector tests, release evidence runbook | Local snapshot; strict gate remains red |
| Timed judge path and truthful local/fixture visuals are rehearsed | LOCAL ONLY | demo rehearsal manifest/report, 4 desktop/mobile E2E checks, local WebM | 10.48s silent visual reel; not final or public |
| B2 stores and serves the asset and manifest | BLOCKED | C-008 | Requires authorized account and E4 read-back smoke |
| External AI media provider generates the asset | BLOCKED | Submission readiness gate | Deterministic local provider is not an AI model |
| Public judge-accessible campaign app | BLOCKED | Submission checklist | Campaign branch not deployed/default |
| Public under-three-minute demo | DRAFT | `demo-video-script.md` | Final recording waits for live path |

## Reproducible Checks

```bash
npm run hackathon:check:draft
npm run hackathon:deploy:check:draft
npm run hackathon:evidence
npm run hackathon:demo:check
npm test -- --pool=threads
PROVENANCE_PYTHON=spikes/genblaze-provenance/.venv/bin/python npm run test:e2e:provenance:local
PYTHONPATH=spikes/genblaze-provenance spikes/genblaze-provenance/.venv/bin/python spikes/genblaze-provenance/tests/preview_http_service_smoke.py
npm run build
```

Strict readiness must remain red until the account-bound and public evidence is available:

```bash
npm run hackathon:check
npm run hackathon:deploy:check
npm run hackathon:evidence:strict
npm run hackathon:demo:check:strict
```
