# ADR: Cloudflare Judge Preview Runtime

Status: accepted for implementation; deployment remains separately gated
Date: 2026-07-19
Owners: Architecture Agent + DevOps Agent
Reviewers: Code Review Agent + Security Agent + Claims Review Agent

## Decision

Use one Cloudflare Pages deployment for both the static Jingci campaign UI and the same-origin provenance API. The prior Railway container plan is superseded because the account requires a paid plan and the preview does not need a general Python process.

```text
Judge browser
  -> Cloudflare Access
  -> Cloudflare Pages static UI
  -> same-origin Pages Function
  -> private Backblaze B2 retained source + per-run manifest
```

The frontend keeps `NEXT_PUBLIC_PROVENANCE_API_URL=/api/provenance`. The official Cloudflare Access Pages plugin validates reviewer identity before the Function runs. B2 credentials remain encrypted Pages bindings and never enter static JavaScript, browser storage, URLs, screenshots, or response bodies.

## Smallest Sufficient Architecture

The Function replaces the Railway proxy and exposes only:

- `GET /api/provenance/health`
- `POST /api/provenance/v1/provenance-runs`

It rejects cross-site POSTs, non-JSON and bodies over 64KB, malformed run contracts, and provider/model drift before B2 access. `aws4fetch` 1.0.20 supplies SigV4 signing; the project does not maintain a custom cryptographic signer.

The retained source is fixed to private object `jingci-preview/source/runway-gen45-ca8ea95388d2.mp4`, SHA-256 `ca8ea95388d2e2f943f628ec6ca8bf9386baad8862b54ce26764675fa2b438f6`, 1,044,064 bytes, Runway `gen4.5`. The browser cannot select or replace this lineage.

## Per-Request Behavior

1. Validate Access, same-origin request, schema, size, provider, and model.
2. Read the fixed B2 source and verify its exact size boundary and SHA-256.
3. Build one canonical retained-source manifest below a random `jingci-preview/runs/` prefix.
4. Persist SHA-256 values for prompts, project ID, and parent job ID, never their raw values.
5. Refuse overwrite by checking that the manifest destination is absent.
6. Upload and read back exactly one manifest, then verify byte equality.
7. Return a strict `jingci.provenance-run.v1` response with private `b2://` evidence locations.
8. If read-back fails after upload, delete only that request's manifest.

The source video is retained once and is not duplicated per request. This preview manifest is Jingci's retained-source evidence envelope. It does not claim that each browser request invokes Genblaze or Runway. The separately approved private recovery evidence remains the proof that Genblaze stored and verified the generated MP4 plus canonical manifest in B2.

## Required Bindings

| Binding | Classification | Purpose |
| --- | --- | --- |
| `CF_ACCESS_TEAM_DOMAIN` | protected | Access issuer |
| `CF_ACCESS_AUD` | protected | Access application audience |
| `JINGCI_PROVENANCE_ENABLED` | non-secret | exact `YES` feature gate |
| `B2_BUCKET` | protected | dedicated private bucket |
| `B2_REGION` | non-secret | exact B2 region |
| `B2_KEY_ID` | secret | prefix-scoped application key ID |
| `B2_APP_KEY` | secret | prefix-scoped application key |
| `JINGCI_PREVIEW_SOURCE_*` | protected/non-secret | immutable source identity and bounds |

No Runway secret is deployed because the preview reuses the already approved generated asset and performs no paid generation.

## External Controls

- Protect the preview hostname with Cloudflare Access and validate its JWT in the Function.
- Configure an edge rate-limit rule for the POST route; in-process counters are not a distributed control.
- Keep the B2 bucket private and the deployment key restricted to the reviewed bucket and `jingci-preview/` prefix.
- Keep logs to request ID, route, status, and duration; never log bodies, prompts, keys, or signed requests.

## Rollback

1. Set `JINGCI_PROVENANCE_ENABLED=NO`.
2. Roll Pages back to the previous immutable deployment.
3. Remove preview-only bindings.
4. Revoke the B2 key if compromise is suspected.
5. Verify the static DirectorKit and manual shot workflow still work.

## Evidence Required

- Access application and reviewer policy.
- Edge rate limit.
- Redacted binding inventory and pinned Pages deployment commit.
- Health, access denial, origin, payload, lineage, B2 digest, manifest read-back, disable, desktop, and mobile smokes.
- Rollback smoke and separate human approval before public Devpost publication or submission.
