# Genblaze Provenance Spike

This isolated spike verifies the smallest Jingci-to-Genblaze contract without provider credentials, B2 access, paid generation, UI changes, or production deployment.

It accepts one completed shot asset with a SHA-256 digest and builds a verified Genblaze provenance manifest. It does not claim that media generation or B2 upload has occurred.

The second local slice also exercises Genblaze's real `SyncProvider -> Pipeline -> ObjectStorageSink -> StorageBackend` lifecycle with deterministic bytes and an in-memory storage fake. This validates content-addressed object keys and durable credential-free URLs, but it is still not a Backblaze network upload.

## Run

```bash
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
PYTHONPATH=. .venv/bin/python -m unittest discover -s tests -v
PYTHONPATH=. .venv/bin/python -m jingci_spike.cli fixtures/shot-job.json
PYTHONPATH=. .venv/bin/python -m jingci_spike.http_service --port 8788
PYTHONPATH=. .venv/bin/python tests/http_service_smoke.py
PYTHONPATH=. .venv/bin/python -m jingci_spike.live_b2_smoke --plan
```

To opt the frontend into this loopback adapter, start Next.js with:

```bash
NEXT_PUBLIC_PROVENANCE_API_URL=http://127.0.0.1:8788 npm run dev
```

Without this variable the UI stays in its explicit deterministic Fixture mode. A configured adapter failure is shown as a failed run and never silently downgraded to fixture evidence.

To run the browser-to-Python integration against both desktop and mobile Chromium:

```bash
PROVENANCE_PYTHON=.venv/bin/python npm run test:e2e:provenance:local
```

The dedicated Playwright configuration starts both loopback services, rejects occupied ports instead of reusing an unknown process, and verifies the HTTP response plus the rendered `memory://` evidence. Use a Node.js version supported by the frontend.

## Guarded Live B2 Smoke

The default `--plan` command performs no network request and needs no credentials. Live mode is reserved for the separately approved account gate. It requires an exact `JINGCI_ALLOW_LIVE_B2_SMOKE=YES` confirmation plus `B2_BUCKET`, `B2_REGION`, `B2_KEY_ID`, and `B2_APP_KEY` in the process environment.

Do not place secrets on the command line, in `.env` files committed to Git, or in reports. Load them through an approved local secret mechanism, then run:

```bash
PYTHONPATH=. .venv/bin/python -m jingci_spike.live_b2_smoke --live
```

The smoke writes one random key below `jingci-smoke/`, reads it back, verifies SHA-256, deletes it, and confirms absence. It does not change bucket lifecycle or visibility. A passing result is B2 transport evidence only; it does not prove an external AI media provider.

Use explicit imports from `genblaze_core`. A wildcard import loads optional components and may fail when unrelated extras such as `pyarrow` are not installed.

## Boundary

- Input: one `jingci.shot-provenance.v1` JSON job.
- Output: one verified Genblaze manifest envelope.
- Next adapter: execute one provider pipeline and replace the fixture asset URL/digest.
- Current local adapter: deterministic provider plus official object-storage sink against an in-memory backend.
- Local HTTP adapter: loopback-only `GET /health` and `POST /v1/provenance-runs`, with a 64KB body limit and local-origin CORS.
- Later adapter: persist asset and manifest through `genblaze-s3` to an explicitly authorized B2 bucket.

## B2 Gate

`B2Config` requires `B2_BUCKET`, `B2_REGION`, `B2_KEY_ID`, and `B2_APP_KEY`, and only exposes a redacted summary. `build_offline_backblaze_backend` explicitly disables network preflight and lifecycle mutation. A real B2 smoke must use a separate authorization and must never print credentials.
