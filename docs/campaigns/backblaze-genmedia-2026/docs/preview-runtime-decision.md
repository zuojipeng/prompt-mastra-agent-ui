# ADR: Judge Preview Runtime

Status: accepted for implementation; deployment remains unauthorized
Date: 2026-07-18
Owners: Architecture Agent + DevOps Agent
Reviewers: Code Review Agent + Claims Review Agent

## Decision

Use a deliberately small three-tier preview boundary:

1. Cloudflare Pages serves the static Jingci campaign frontend.
2. A same-origin Pages Function at `/api/provenance/*` validates Cloudflare Access, constrains the request, and injects a server-only service token.
3. A dedicated Railway Python service runs the guarded provenance adapter and keeps Runway and B2 credentials server-side.

The frontend sets `NEXT_PUBLIC_PROVENANCE_API_URL=/api/provenance`. It never receives the Python service URL, service token, Runway key, B2 key, signed media URL, or Cloudflare Access configuration.

This ADR authorizes code and documentation only. It does not authorize creating resources, configuring Access, uploading secrets, deploying, publishing a URL, invoking Runway, writing B2 objects, or submitting to Devpost.

## Request Path

```text
Judge browser
  -> Cloudflare Access policy
  -> Cloudflare Pages static frontend
  -> same-origin Pages Function
  -> HTTPS Railway provenance service
  -> private B2 / approved provider boundary
```

The Pages Function exposes only `GET /api/provenance/health` and `POST /api/provenance/v1/provenance-runs`. It validates the Access JWT through Cloudflare's official Pages plugin, rejects cross-site POST requests, caps request and response bodies at 64KB, refuses redirects, applies a 12-second upstream deadline, redacts upstream authentication failures, and returns no-store responses.

## Required Bindings

| Binding | Type | Purpose |
| --- | --- | --- |
| `CF_ACCESS_TEAM_DOMAIN` | encrypted secret or protected variable | Exact `https://<team>.cloudflareaccess.com` issuer |
| `CF_ACCESS_AUD` | encrypted secret or protected variable | Access application audience |
| `PROVENANCE_SERVICE_URL` | protected variable | Exact HTTPS Railway service origin with no path/query |
| `PROVENANCE_SERVICE_TOKEN` | encrypted secret | Pages Function to Python bearer, at least 32 characters |
| `JINGCI_PROVENANCE_ENABLED` | protected variable | Exact `YES` feature gate |

The Python service uses the same token as `JINGCI_PREVIEW_BEARER_TOKEN`, sets `JINGCI_PREVIEW_ALLOWED_ORIGIN` to the exact Pages origin, and remains disabled unless `JINGCI_PUBLIC_PREVIEW_MODE=YES` and `JINGCI_PROVENANCE_ENABLED=YES` are both present.

## Railway Runtime Package

The service root is `spikes/genblaze-provenance`. Railway must be configured to use that exact root so its checked-in `railway.json` and `/Dockerfile` path resolve consistently.

- Python is pinned to `3.12.13-slim-bookworm`; all Python packages are exact-version locked in `requirements.lock`.
- The container runs as the unprivileged `jingci` user.
- The runtime binds `0.0.0.0` and requires Railway's injected `PORT` to be an integer from 1 through 65535.
- Public-preview policy is validated before the socket is created. Invalid configuration produces one generic event and exits with code 2 without echoing values.
- Railway checks `/health`, restarts only on failure with three retries, and allows bounded overlap and draining during a future approved rollout.
- SIGTERM and SIGINT trigger an asynchronous HTTP-server shutdown so Railway draining cannot deadlock the serving thread.

`npm run hackathon:runtime:check` verifies the tracked runtime plan without reading environment values. `npm run hackathon:runtime:smoke` builds and exercises the container with a fixed fake token, deterministic memory storage, and no external API calls.

## B2 Evidence Mode

`JINGCI_PROVENANCE_STORAGE_MODE` is mandatory. `MEMORY` is restricted to local container smoke; the tracked deployment plan requires `B2`.

The B2 executor does not generate new paid media and does not trust the browser for source lineage. Server-only configuration binds one reviewed private source object below `jingci-preview/source/` to its exact SHA-256, maximum bytes, provider, and model. For this campaign the reviewed lineage is Runway `gen4.5`.

Each accepted request:

1. rejects provider/model drift before opening storage;
2. reads the fixed source object and verifies size plus SHA-256 before any write;
3. writes one content-addressed video and one Genblaze manifest below a random `jingci-preview/runs/` prefix;
4. reads both objects back and verifies bytes, digest, manifest signature state, and canonical hash;
5. retains both evidence objects on success;
6. deletes only the current request's owned keys on partial failure and never deletes the reviewed source.

The browser's preview request now declares `runway` / `gen4.5`, while Fixture and Local modes keep their existing labels. No source key, digest, bucket, region, credential, or service origin enters the static bundle.

## External Controls

- Protect the entire preview hostname with Cloudflare Access; the Function also validates the Access JWT.
- Configure an edge rate-limit rule for `/api/provenance/v1/provenance-runs`. Function-local counters are not a distributed rate limit.
- Keep the Railway service on a dedicated campaign deployment. Do not expose reviewer credentials or service tokens in Devpost copy.
- Use a deployment-specific bucket key. The prior B2 smoke key is evidence, not automatically a release credential.
- Reuse the already verified Runway output for the preview unless a new paid call receives separate approval.

## Rollback

1. Set `JINGCI_PROVENANCE_ENABLED=NO` in Pages and Railway.
2. Roll Cloudflare Pages back to the previous immutable deployment.
3. stop the Railway campaign service.
4. Revoke the deployment service token and bucket key if compromise is suspected.
5. Confirm the static DirectorKit/manual-shot path remains available.

## Evidence Required Before Deployment Status Can Change

- Cloudflare Access application and reviewer identity policy.
- Edge rate-limit configuration.
- Railway service URL and redacted environment summary.
- Pages preview URL pinned to one commit.
- Unauthorized, wrong-origin, oversized-body, health, success, timeout, and disable-switch smoke results.
- Desktop and mobile Playwright evidence.
- Human deployment approval recorded separately.

## Local Container Evidence

On 2026-07-18 the pinned image built successfully and the reproducible smoke proved:

- `/health` returned HTTP 200 in preview mode;
- an origin-correct request without a bearer returned HTTP 401;
- an origin-correct request with the fixed local-only token produced verified deterministic memory evidence;
- SIGTERM completed within the ten-second local stop budget and the container was removed.

This closes runtime packaging only. No Railway project, service, domain, variable, volume, or deployment was created.

The B2 executor has also passed offline tests against an injected in-memory backend. That proves ownership, verification, lineage, and compensation logic but is not B2 network evidence.

## Retained Source Binding

The reviewed source is now frozen in `preview-runtime-plan.json` as the private object `jingci-preview/source/runway-gen45-ca8ea95388d2.mp4`, SHA-256 `ca8ea95388d2e2f943f628ec6ca8bf9386baad8862b54ce26764675fa2b438f6`, 1,044,064 bytes, with Runway `gen4.5` lineage. The runtime validator rejects any source key, digest, size, provider, model, visibility, or promotion-commit substitution and rejects claims that this binding is already configured in a deployment.

The custom B2 key has been independently reviewed for the bucket and `jingci-preview/` prefix needed by this runtime, but it remains local and must not be uploaded to Railway without a separate deployment approval. This closes source identity and local credential suitability only; public access, cloud secret configuration, and deployment remain blocked.

## B2 Retry Policy

All default live B2 construction now uses `NoRetryS3StorageBackend`. The subclass delegates the complete storage implementation to Genblaze and changes only the Botocore client retry envelope through `Config.merge()`, setting `total_max_attempts=1` in standard mode. This preserves Genblaze timeouts, checksum behavior, endpoint handling, preflight, upload, read-back, and error classification without a global monkeypatch or duplicate S3 implementation.

Offline factories and explicitly injected test backends are unchanged. The runtime validator and unit tests fail if the subclass, live default factory, or one-total-attempt value drifts. This policy prevents an approved preview request from silently multiplying storage attempts; it does not authorize any request or deployment.

## Sources Reviewed

- Cloudflare Pages Functions: https://developers.cloudflare.com/pages/functions/
- Pages Functions routing: https://developers.cloudflare.com/pages/functions/routing/
- Pages secret bindings: https://developers.cloudflare.com/pages/functions/bindings/
- Cloudflare Access Pages plugin: https://developers.cloudflare.com/pages/functions/plugins/cloudflare-access/
- Cloudflare Access JWT validation: https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/validating-json/
- Railway config as code: https://docs.railway.com/config-as-code
- Railway config reference: https://docs.railway.com/config-as-code/reference
- Railway health checks: https://docs.railway.com/deployments/healthchecks
- Railway Dockerfiles: https://docs.railway.com/builds/dockerfiles
