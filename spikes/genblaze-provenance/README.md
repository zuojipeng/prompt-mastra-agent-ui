# Genblaze Provenance Spike

This isolated spike verifies the smallest Jingci-to-Genblaze contract without provider credentials, B2 access, paid generation, UI changes, or production deployment.

It accepts one completed shot asset with a SHA-256 digest and builds a verified Genblaze provenance manifest. It does not claim that media generation or B2 upload has occurred.

The second local slice also exercises Genblaze's real `SyncProvider -> Pipeline -> ObjectStorageSink -> StorageBackend` lifecycle with deterministic bytes and an in-memory storage fake. This validates content-addressed object keys and durable credential-free URLs, but it is still not a Backblaze network upload.

The campaign provider contract selects Runway `gen4.5` for a fixed 5-second text-to-video request. `runway_provider.py` implements the bounded Genblaze adapter; `runway_client.py` and `live_runway_smoke.py` implement the guarded REST and one-attempt harness. One privately attested generation and B2 recovery verification now support the exact human-approved claims packet; they do not authorize another generation, deployment, publication, or submission. See `docs/campaigns/backblaze-genmedia-2026/docs/provider-decision.md` and `docs/campaigns/backblaze-genmedia-2026/docs/claims-promotion-review.md`.

`offline_runway_b2_transaction.py` composes the real Runway Genblaze adapter with a scripted fake client, an injected probe gate, `Pipeline`, `ObjectStorageSink`, and a B2-shaped in-memory backend. It verifies asset and manifest read-back plus compensating cleanup under one owner. This is no-network composition evidence only: it is not ffprobe, Runway, or Backblaze B2 live evidence.

`live_runway_b2_transaction.py` is the combined transaction root. Its `--plan` path imports no provider, transport, storage, or credential code. The separately gated `--live` path requires a clean pinned source, a canonical expiring one-shot approval, durable approval consumption, exact Runway output-host review, B2 credentials, and the explicit `$0.60` confirmation. Its fixture runner still accepts only `FakeRunwayTaskClient` and `InMemoryStorageBackend` and emits `jingci.combined-runway-b2-fixture-result.v1`, which the live attester deliberately rejects.

`approval_journal.py` and `private_file_store.py` add a local POSIX at-most-once boundary using owner-only immutable approval markers published by durable hard link before provider create. `transaction_failure_evidence.py` binds non-attestable failure records to the actual marker and recovery records to the actual failure file. Recovery requires positive absence evidence for every owned key and can never authorize another create or become live success evidence. See `durable-approval-recovery-contract.md`; no live composition root uses these modules yet.

## Run

```bash
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
PYTHONPATH=. .venv/bin/python -m unittest discover -s tests -v
PYTHONPATH=. .venv/bin/python -m jingci_spike.cli fixtures/shot-job.json
PYTHONPATH=. .venv/bin/python -m jingci_spike.http_service --port 8788
PYTHONPATH=. .venv/bin/python tests/http_service_smoke.py
PYTHONPATH=. .venv/bin/python -m jingci_spike.live_b2_smoke --plan
PYTHONPATH=. .venv/bin/python -m jingci_spike.live_genblaze_b2_smoke --plan
PYTHONPATH=. .venv/bin/python -m jingci_spike.live_runway_smoke --plan
PYTHONPATH=. .venv/bin/python -m unittest tests.test_offline_runway_b2_transaction -v
PYTHONPATH=. .venv/bin/python -m jingci_spike.live_runway_b2_transaction --plan
PYTHONPATH=. .venv/bin/python -m unittest tests.test_approval_journal tests.test_transaction_failure_evidence -v
```

To opt the frontend into this loopback adapter, start Next.js with:

```bash
NEXT_PUBLIC_PROVENANCE_API_URL=http://127.0.0.1:8788 npm run dev
```

Without this variable the UI stays in its explicit deterministic Fixture mode. A configured adapter failure is shown as a failed run and never silently downgraded to fixture evidence.

The undeployed judge-preview build uses the exact same-origin gateway path instead of a public Python URL:

```bash
NEXT_PUBLIC_PROVENANCE_API_URL=/api/provenance npm run build
```

That path is implemented by the root Pages Function and requires Cloudflare Access plus server-side bindings. It is not usable until the separate deployment gate is approved and configured.

To run the browser-to-Python integration against both desktop and mobile Chromium:

```bash
PROVENANCE_PYTHON=.venv/bin/python npm run test:e2e:provenance:local
```

The dedicated Playwright configuration starts both loopback services, rejects occupied ports instead of reusing an unknown process, and verifies the HTTP response plus the rendered `memory://` evidence. Use a Node.js version supported by the frontend.

## Railway Runtime Package

The undeployed Railway service is packaged from this directory. Set the Railway service root to `spikes/genblaze-provenance`; its checked-in `railway.json` then selects `/Dockerfile`, `/health`, and the bounded restart/drain policy.

From the repository root, validate the plan without reading environment values:

```bash
npm run hackathon:runtime:check
```

With Docker Desktop running, build and exercise the pinned non-root image using only a fixed fake token and deterministic memory evidence:

```bash
npm run hackathon:runtime:smoke
```

The smoke waits for health, requires an unauthenticated request to return 401, verifies an authenticated fixture manifest, sends SIGTERM, and removes the container and temporary responses. It does not create Railway resources, upload variables, use B2 credentials, or call Runway.

`JINGCI_PROVENANCE_STORAGE_MODE` is mandatory. `MEMORY` exists only for the local smoke. An approved deployment must use `B2` and provide a bucket-scoped B2 configuration plus a reviewed private source object under `jingci-preview/source/`, its exact SHA-256, and fixed provider/model lineage. The browser cannot select or override the source key or digest. Each successful request retains one content-addressed asset and one verified manifest below a random `jingci-preview/runs/` prefix; a partial failure deletes only the keys owned by that request and never deletes the reviewed source object.

Inspect the no-network source-promotion core with `PYTHONPATH=. .venv/bin/python -m jingci_spike.preview_source_promotion --plan`. The dedicated approval contract binds one immutable approval to the exact commit, run, private source key, SHA-256, byte count, scope, and active time window. Its private result contract distinguishes retained verified success, compensated failure, and unresolved recovery while granting no deployment, publication, submission, or paid-API authority. There is intentionally no live CLI entrypoint or approval-generation command; a human decision and a separately reviewed composition root are still required.

`offline_preview_source_promotion.py` composes the full lifecycle only with its exact in-memory backend. It validates every precondition before durable approval consumption, writes `fixture_non_attestable` private evidence after consumption, and supports conservative recovery when terminal evidence publication is interrupted. It has no CLI, environment read, credential loader, or network-capable dependency path.

Validate the disabled live-adapter plan with `PYTHONPATH=. .venv/bin/python -m jingci_spike.preview_source_live_plan --check`. The validator requires the exact stage order, private namespace, size/attempt limits, recovery matrix, prohibited actions, input classifications, and all-false execution/authorization flags. It reads only the tracked plan JSON and cannot execute the operation.

`guarded_preview_source_live_adapter.py` implements that plan as a library function with no CLI and no process-environment access. It reads only owner-only approval/media/scope-review files, binds approval to bucket/region as well as source identity, delays injected configuration loading until local checks pass, requires a short-lived `b2_credential_scope_attestation.py` review bound to the exact Key ID hash and `jingci-preview/` least-privilege scope, consumes the durable approval only after exact-key absence is observed, and writes conservative private evidence after consumption. Terminal results retain the scope-review hash, while the review itself grants no execution authority. Injected backends always produce `fixture_non_attestable` evidence; only the exact reviewed default B2 factory can produce `live_private` shape, and it has not been called.

## Guarded Preview Boundary

The HTTP adapter refuses a non-loopback bind unless all preview safety configuration is explicit. This mode is for local security verification before a separate runtime and reviewer-access decision; it is not deployment authorization.

```bash
JINGCI_PUBLIC_PREVIEW_MODE=YES \
JINGCI_PROVENANCE_ENABLED=YES \
JINGCI_PREVIEW_ALLOWED_ORIGIN=https://approved-preview.example \
JINGCI_PREVIEW_BEARER_TOKEN='<load-from-approved-secret-store>' \
JINGCI_PREVIEW_MAX_CONCURRENCY=2 \
PYTHONPATH=. .venv/bin/python -m jingci_spike.http_service --host 0.0.0.0 --port 8788
```

The bearer is an upstream service token for an approved access proxy to inject. It must never be placed in `NEXT_PUBLIC_*`, static JavaScript, browser storage, a URL, or a committed environment file. Preview mode enforces exact HTTPS-origin CORS, constant-time token comparison, a 64KB body cap, a 10-second request-read timeout, bounded generation concurrency, redacted metadata-only request logs, generic public validation errors, and a fail-closed disable switch. Edge rate limiting and reviewer identity remain required external controls.

Run the credential-free loopback proof with:

```bash
PYTHONPATH=. .venv/bin/python tests/preview_http_service_smoke.py
```

## Guarded Live B2 Smoke

The default `--plan` command performs no network request and needs no credentials. Live mode is reserved for the separately approved account gate. It requires an exact `JINGCI_ALLOW_LIVE_B2_SMOKE=YES` confirmation plus `B2_BUCKET`, `B2_REGION`, `B2_KEY_ID`, and `B2_APP_KEY` in the process environment.

Do not place secrets on the command line, in `.env` files committed to Git, or in reports. Load them through an approved local secret mechanism, then run:

```bash
PYTHONPATH=. .venv/bin/python -m jingci_spike.live_b2_smoke --live
```

The smoke writes one random key below `jingci-smoke/`, reads it back, verifies SHA-256, deletes it, and confirms absence. It does not change bucket lifecycle or visibility. A passing result is B2 transport evidence only; it does not prove an external AI media provider.

The Genblaze-path smoke extends that boundary through the real deterministic provider, `Pipeline`, and `ObjectStorageSink`. Its plan mode is also credential-free:

```bash
PYTHONPATH=. .venv/bin/python -m jingci_spike.live_genblaze_b2_smoke --plan
```

After the same separate live authorization and secure environment setup, `--live` writes one content-addressed video asset and one verified JSON manifest below a unique `jingci-smoke/` prefix. It reads both back, verifies bytes, SHA-256, manifest validity and canonical hash, then deletes both objects. The sink's backend close is deferred only long enough to complete read-back and cleanup, then the real connection is closed.

Use explicit imports from `genblaze_core`. A wildcard import loads optional components and may fail when unrelated extras such as `pyarrow` are not installed.

## Guarded Live Runway Smoke

The Runway harness defaults to a deterministic plan that reads no environment values, opens no transport, runs no subprocess, and incurs no cost:

```bash
PYTHONPATH=. .venv/bin/python -m jingci_spike.live_runway_smoke --plan
```

The reviewed REST transport uses `POST /v1/text_to_video`, pins API version `2024-11-06`, performs one create request, manually validates up to three media redirects, strips API authorization from media downloads, bounds JSON/media bytes, and probes the temporary MP4 with `ffprobe`. Live mode requires the exact phrase printed by `--plan`, a well-formed `RUNWAYML_API_SECRET`, and reviewed exact `JINGCI_RUNWAY_OUTPUT_HOSTS`. Do not run it until a separate one-attempt, maximum-$0.60 spend authorization is recorded.

The current stdlib transport rejects private DNS answers before every media request, but the resolver check and urllib connection use separate resolutions. A deployment must add egress enforcement or a TLS connector pinned to the validated address before this becomes a production SSRF claim.

## Boundary

- Input: one `jingci.shot-provenance.v1` JSON job.
- Output: one verified Genblaze manifest envelope.
- Next adapter: execute one provider pipeline and replace the fixture asset URL/digest.
- Selected live candidate: Runway `gen4.5`; adapter and guarded REST harness are implemented but only offline fakes have executed.
- Current local adapter: deterministic provider plus official object-storage sink against an in-memory backend.
- Local HTTP adapter: loopback-only `GET /health` and `POST /v1/provenance-runs`, with a 64KB body limit and local-origin CORS.
- Preview boundary: same-origin Cloudflare Pages Function to a pinned, locally container-verified guarded Python runtime; not deployed.

## B2 Gate

`B2Config` requires `B2_BUCKET`, `B2_REGION`, `B2_KEY_ID`, and `B2_APP_KEY`, and only exposes a redacted summary. `build_offline_backblaze_backend` explicitly disables network preflight and lifecycle mutation. A real B2 smoke must use a separate authorization and must never print credentials.
