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

## Sources Reviewed

- Cloudflare Pages Functions: https://developers.cloudflare.com/pages/functions/
- Pages Functions routing: https://developers.cloudflare.com/pages/functions/routing/
- Pages secret bindings: https://developers.cloudflare.com/pages/functions/bindings/
- Cloudflare Access Pages plugin: https://developers.cloudflare.com/pages/functions/plugins/cloudflare-access/
- Cloudflare Access JWT validation: https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/validating-json/
