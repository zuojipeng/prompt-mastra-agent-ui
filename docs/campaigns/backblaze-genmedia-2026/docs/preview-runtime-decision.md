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
