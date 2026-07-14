# Judge Access Runbook

Status: executable draft. URLs and credentials remain intentionally blank until approved deployment.

## Reviewer Entry

- Campaign app URL: **BLOCKED — deployment not authorized**
- Test account/access instructions: **BLOCKED — human account gate**
- Repository commit: **BLOCKED — pin after release candidate**
- Public demo video: **BLOCKED — record after live evidence**

## Expected Judge Path (Under 3 Minutes)

1. Open the campaign app and confirm the Jingci workbench loads without console-blocking errors.
2. Enter the wasteland robot idea, run creative diagnosis, and choose one reconstruction.
3. Generate the DirectorKit and select shot 1.
4. Run provenance once and wait for a terminal state.
5. Confirm provider/model, asset location, SHA-256, manifest location, canonical hash, and Verified state.
6. Retry once and confirm attempt 2 retains the parent run.
7. Open Projects and confirm the shot evidence remains attached to the project handoff.

The final judge path must show `B2`/production evidence labeling. Fixture or Local adapter labels are fallback evidence only and cannot close the live judging claim.

## Pre-Release Commands

```bash
npm ci
npm run hackathon:check
npm run hackathon:deploy:check
npm run hackathon:demo:check:strict
npm run hackathon:evidence:strict
npx tsc --noEmit
npm run lint
npm test -- --pool=threads
npm run build
```

Run both HTTP boundary smokes before any runtime decision:

```bash
cd spikes/genblaze-provenance
PYTHONPATH=. .venv/bin/python -m unittest discover -s tests -p 'test_*.py' -v
PYTHONPATH=. .venv/bin/python tests/http_service_smoke.py
PYTHONPATH=. .venv/bin/python tests/preview_http_service_smoke.py
```

The preview bearer is an access-layer-to-service secret. Do not put it in the static frontend, judge instructions, screenshots, URLs, or evidence output.

Run the authorized B2 transport and Genblaze pipeline smokes from a secure environment without placing secrets on the command line:

```bash
PYTHONPATH=. .venv/bin/python -m jingci_spike.live_b2_smoke --live
PYTHONPATH=. .venv/bin/python -m jingci_spike.live_genblaze_b2_smoke --live
```

## Post-Deploy Smoke

1. `GET /health` returns 200 with service version and mode but no secret/config values.
2. An unauthenticated provenance request is denied.
3. An allowed reviewer session succeeds; a disallowed origin receives no CORS permission.
4. Oversized, malformed, and invalid-lineage requests fail with bounded errors.
5. One shot reaches verified B2 evidence; remote bytes and manifest verify.
6. Retry lineage reaches attempt 2.
7. Logs contain request ID, status, and duration but no prompt, token, signed URL, key ID, or application key.
8. Rate-limit behavior is observed without provider/B2 execution.
9. Disable the provenance feature and confirm manual shot status/notes still work.
10. Re-enable only after the rollback smoke passes.

## Evidence To Capture

- Immutable frontend and provenance-service commit hashes.
- Campaign and service HTTPS URLs.
- Redacted environment/config summary.
- Health response, allowed/denied CORS, auth denial, and rate-limit evidence.
- B2 asset/manifest keys, hashes, read-back result, and cleanup/retention decision.
- Desktop and mobile Playwright screenshots.
- Rollback result and final known-risk list.

## Judge-Period Operations

- Keep the app free and accessible through the official judging period.
- Check health, error rate, quota, and B2/provider availability at least daily.
- Freeze feature work after the release candidate except blocker repairs.
- Do not rotate or revoke reviewer access without updating submission instructions.
- Revoke temporary keys and remove campaign resources after judging unless retention is explicitly approved.
