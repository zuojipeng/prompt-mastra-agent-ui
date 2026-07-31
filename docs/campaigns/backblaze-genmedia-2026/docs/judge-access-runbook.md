# Judge Access Runbook

Status: public zero-network judge path and public demo video verified. The protected authenticated cloud B2 preview remains separate and non-blocking for the public Fixture demo.

## Reviewer Entry

- Public judge app: `https://jingci-genmedia-judge-demo-2026.pages.dev/`
- Access instructions: none; the static Fixture demo is anonymous and performs no external API request
- Public deployment commit: `c73388d`
- Public demo video: `https://youtu.be/I4dsEfnbUX4`

## Expected Judge Path (Under 3 Minutes)

1. Open the campaign app and confirm the Jingci workbench loads without console-blocking errors.
2. Enter the wasteland robot idea, run creative diagnosis, and choose one reconstruction.
3. Generate the DirectorKit and select shot 1.
4. Run provenance once and wait for a terminal state.
5. Confirm source attribution, SHA-256, canonical manifest hash, and the mode-specific verified state. The protected preview must label object locations as private rather than display raw B2 keys.
6. Retry once and confirm attempt 2 retains the parent run.
7. Open Projects, restore the project, and confirm the sanitized shot receipt remains attached after reload.

The final judge path must show protected-preview retained-source labeling and a successful authenticated cloud smoke. Fixture or Local adapter labels are fallback evidence only and cannot close the cloud judging claim.

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

The deployed Cloudflare preview verifies the retained source and writes one Jingci retained-source manifest per accepted request. The separate Python commands below remain recovery evidence tools and are not the deployed browser runtime. Run them only under a separate authorization and without placing secrets on the command line:

```bash
PYTHONPATH=. .venv/bin/python -m jingci_spike.live_b2_smoke --live
PYTHONPATH=. .venv/bin/python -m jingci_spike.live_genblaze_b2_smoke --live
```

## Post-Deploy Smoke

Before consuming any one-shot business POST approval, validate the identity boundary
in this exact order:

1. Add the reusable Service Auth policy to the target Access application.
2. Save the policy, then save the outer Access application.
3. Reload the target application and confirm the policy is still visible.
4. Confirm the reusable policy reports exactly one application using it.
5. Execute only the separately authorized `GET /api/provenance/health`. This route
   checks configuration but performs no B2 object operation.
6. Require HTTP 200, JSON content type, and exact body
   `{"status":"ok","mode":"cloudflare-b2-preview"}`.
7. Treat HTTP 302, missing policy, usage count other than one, or body mismatch as
   a hard stop. Revoke the temporary identity and do not send the business POST.
8. After identity preflight passes, obtain a fresh explicit approval for exactly
   one no-retry business POST.

The machine-checked plan is
`cloudflare-access-smoke-preflight-plan.json`. Validate it with
`npm run hackathon:access:preflight`. The plan grants no cloud configuration,
identity GET, business POST, B2, deployment, publication, or submission authority.

Observed on 2026-07-26: the repaired attachment procedure passed outer-save,
reload, bidirectional membership, and exact-one usage checks, but the single
identity-only health GET still returned HTTP 302. The temporary policy and token
were revoked. Before another identity request, inspect Access decision evidence
for the pinned hash hostname and verify header acceptance without sending a
business POST or touching B2.

Read-only diagnosis later on 2026-07-26 found no matching service-authentication
event after removing the new log view's default service-auth exclusion, and the
legacy log agreed. The hash hostname matches only the wildcard application; the
apex application does not shadow it, and no custom single-header service-token
mode is configured. Classify the failure as an unaccepted service-token request,
not as Pages Function or B2 evidence. Because the temporary token and request
material were deleted, do not claim whether the precise defect was malformed
header capture or a mismatched credential pair.

For the next separately authorized identity-only preflight:

1. Create one fresh token and capture Client ID and Client Secret by their
   explicit labels, never by display order.
2. Bind a secret-free token identity digest into the policy selection,
   attachment attestation, and request preparation evidence.
3. Keep credential material only in a mode-0600 temporary file and verify the two
   values are non-empty and distinct without printing them.
4. Send exactly one standard-header health GET with redirects disabled.
5. Require exact HTTP 200 JSON; otherwise clean up and stop without a business
   POST.

The labeled-capture preflight later on 2026-07-26 completed all five steps but
still returned HTTP 302 to Access login with an empty body. Its policy was
detached and deleted, its service token was deleted, and all local temporary
files were removed. Do not repeat this identical token flow. Before another
identity request, require materially new Cloudflare decision evidence or a
reviewed configuration repair; the exact HTTP 200 JSON gate remains unchanged.

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
