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
| B2 stores and serves the asset and manifest | BLOCKED | C-008 | Requires authorized account and E4 read-back smoke |
| External AI media provider generates the asset | BLOCKED | Submission readiness gate | Deterministic local provider is not an AI model |
| Public judge-accessible campaign app | BLOCKED | Submission checklist | Campaign branch not deployed/default |
| Public under-three-minute demo | DRAFT | `demo-video-script.md` | Final recording waits for live path |

## Reproducible Checks

```bash
npm run hackathon:check:draft
npm test -- --pool=threads
PROVENANCE_PYTHON=spikes/genblaze-provenance/.venv/bin/python npm run test:e2e:provenance:local
npm run build
```

Strict readiness must remain red until the account-bound and public evidence is available:

```bash
npm run hackathon:check
```
