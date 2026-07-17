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
| B2 transport uploads, reads back, verifies, and removes one scoped probe | PROVEN | `live_b2_smoke.py`, 8 focused tests, `2026-07-16-live-b2-smoke.md`, matching SHA-256 and cleanup confirmation | Small probe only; not a Genblaze asset/manifest transaction and not version-level erasure proof |
| Genblaze sink owns, verifies, and cleans asset plus manifest | PROVEN | Private recovered-result evidence, `recovered_runway_b2_transaction.py`, focused tests | One scoped live B2 recovery transaction; objects were intentionally cleaned, not durably published |
| Preview deployment trust boundary and judge procedure are reviewable | LOCAL ONLY | `deployment-readiness.json`, deployment validator, threat model, judge runbook | Design only; strict gate remains red |
| Guarded preview HTTP boundary rejects unsafe access | LOCAL ONLY | `http_service.py`, 11 focused tests, 35-test regression, preview HTTP smoke | Upstream token only; no reviewer identity, edge rate limit, or deployment |
| Release evidence can be regenerated without reading credentials | LOCAL ONLY | `collect-hackathon-evidence.mjs`, 4 collector tests, release evidence runbook | Local snapshot; strict gate remains red |
| Timed judge path and truthful local/fixture visuals are rehearsed | LOCAL ONLY | demo rehearsal manifest/report, 4 desktop/mobile E2E checks, local WebM | 10.48s silent visual reel; not final or public |
| Runway provider choice and guarded Genblaze adapter contract | LOCAL ONLY | `provider-decision.md`, `runway_provider.py`, 16 focused tests | Injected provider lifecycle; no live generation or spend |
| Runway REST transport and one-attempt smoke are fail-closed | LOCAL ONLY | `runway_client.py`, `live_runway_smoke.py`, 19 transport tests | Injected transport/probe only; no Runway request or spend |
| Fake Runway-to-Genblaze storage transaction composes end to end | LOCAL ONLY | `offline_runway_b2_transaction.py`, 11 focused tests | Scripted provider/probe and B2-shaped memory backend; no external I/O |
| Human live-verification order is machine checked and fail-closed | LOCAL ONLY | `live-verification-plan.json`, `live-verification-runbook.md`, 16 focused tests | Registration and scoped B2 transport are complete; plan-only validator still rejects execution on five spend, host, harness, and evidence blockers |
| Private live or recovered result can be reduced to a redacted attestation | PROVEN | `live-evidence-contract.md`, `attest-hackathon-live-result.mjs`, focused tests and private recovered-result preflight | Recovery attestation is narrower than atomic evidence; no claims approval or release eligibility |
| Combined Runway-to-B2 transaction is planned and fake-composed under one approval boundary | LOCAL ONLY | `live_runway_b2_transaction.py`, 107 Python tests, Node rejection test | CLI is plan-only; fixture schema is non-attestable and no external service ran |
| One-shot approval and failure/recovery evidence survive local process races | LOCAL ONLY | `approval_journal.py`, `transaction_failure_evidence.py`, durable contract, 18 focused tests | POSIX local at-most-once only; no exactly-once remote claim or live composition root |
| Human and Agent gates have one source-bound ordered handoff | LOCAL ONLY | `operator-handoff.json`, handoff validator, 3 focused tests | Derived status only; cannot accept terms, authorize spend, execute live services, deploy, publish, or submit |
| B2 stores and reads back the generated asset and canonical manifest | PROVEN | Private recovery result, matching asset/manifest digests, exact-key cleanup | Ephemeral verification only; public serving and durable retention are not proven |
| External AI media provider generates the asset | PROVEN | Private succeeded-task metadata, recovered MP4 probe and digest | One private Runway `gen4.5` output; atomic transaction and provider reliability are not claimed |
| Public judge-accessible campaign app | BLOCKED | Submission checklist | Campaign branch not deployed/default |
| Public under-three-minute demo | DRAFT | `demo-video-script.md` | Final recording waits for live path |

## Reproducible Checks

```bash
npm run hackathon:check:draft
npm run hackathon:deploy:check:draft
npm run hackathon:evidence
npm run hackathon:demo:check
npm run hackathon:live:check:draft
npm run hackathon:handoff
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
npm run hackathon:live:check
```
