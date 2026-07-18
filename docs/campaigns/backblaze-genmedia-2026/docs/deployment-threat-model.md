# Preview Deployment Threat Model

Status: design gate only. No deployment or account action is authorized by this document.

## Security Decision

The default Python adapter remains loopback-only and must not be exposed directly. A guarded preview mode refuses non-loopback bind without explicit configuration and locally proves exact-origin CORS, an upstream service token, bounded concurrency/read timeout, metadata-only logs, process health, and a disable switch. The frontend now accepts only loopback HTTP for local work or the exact same-origin `/api/provenance` preview path.

The accepted preview design adds a Cloudflare Pages Function that validates Cloudflare Access with the official plugin before forwarding to the Python service. It injects a server-only bearer, rejects cross-site POSTs, limits both directions to 64KB, refuses redirects, bounds upstream time, and redacts upstream auth/5xx bodies. B2 and provider credentials remain only in the provenance service. An embedded browser token is not authentication and is rejected as the primary control.

## Trust Boundaries

```text
Judge browser
  -> Cloudflare Access
  -> Cloudflare Pages campaign build
  -> same-origin Pages Function security gateway
  -> hardened Python provenance service
  -> allowlisted AI media provider
  -> private dedicated B2 bucket
```

The existing DirectorKit Worker remains a separate service and repository. No B2 or provider secret crosses into static JavaScript, local storage, screenshots, URLs, or the Worker unless a separately reviewed server-to-server proxy is introduced.

## Assets To Protect

- B2 key ID and application key.
- AI provider credentials and spend quota.
- Generated media, prompts, manifests, and project identifiers.
- Provenance hashes and retry lineage.
- Judge access credentials and deployment URLs before publication approval.
- Availability through the judging period.

## Threat Matrix

| Threat | User Impact | Required Control | Current State |
| --- | --- | --- | --- |
| Secret shipped in static bundle or logs | Account compromise and storage loss | Server-only secrets, redacted structured logs, bundle scan | Implemented in gateway/Python code; bindings and bundle evidence pending |
| Anonymous generation abuse | Provider spend and denial of service | Reviewer authentication, edge rate limit, daily quota, concurrency cap | Access JWT and concurrency implemented in code; policy/rate rule pending |
| Cross-origin invocation | Third-party sites consume quota | Same-origin gateway plus exact Python origin allowlist | Implemented in code; deployment smoke pending |
| Oversized or malformed requests | Memory/CPU exhaustion or contract bypass | 64KB body cap, JSON media type, strict request schema | Implemented locally |
| Provider output SSRF or arbitrary URL fetch | Internal network access or data exfiltration | Provider and exact URL scheme/host allowlist; pre-fetch redirect validation; public-address check; deployment egress policy | Offline transport implemented; live host, DNS pinning/egress, and network evidence pending |
| Forged verified response | False provenance claim | Strict response parser, asset digest, read-back manifest verification | Implemented locally/offline |
| Cross-run object collision | Wrong deletion or lineage mix-up | Unique run prefix and content-addressed asset keys | Implemented offline |
| Public B2 object exposure | Prompt/media leakage | Private bucket and short-lived signed reads only | Pending account setup |
| Persistent presigned URLs | Credential material in durable records | Persist key/durable URI only; sign at read time | Design established |
| Partial upload residue | Cost and privacy residue | Owned-key tracking, cleanup, retention policy, manual recovery key | Implemented offline |
| Dependency or runtime drift | Broken judge app | Pinned versions, immutable commit, build and smoke evidence | Partial |
| Unobservable failure | Slow recovery during judging | Health/dependency checks, request IDs, latency/error counters | Local process health and redacted request logs; dependencies/counters missing |

## Required Public-Service Controls

1. Exact `JINGCI_PUBLIC_PREVIEW_MODE=YES`; service refuses non-loopback bind without it.
2. Exact `ALLOWED_ORIGINS` with HTTPS only; no wildcard.
3. Cloudflare Access on the preview hostname plus JWT validation in the Pages Function. The upstream bearer is injected from an encrypted binding and never embedded in JavaScript.
4. Edge request rate limit plus process concurrency and timeout limits.
5. Dedicated bucket-scoped B2 key and private bucket; no lifecycle mutation by the app.
6. Provider/model and output URL allowlists.
7. Structured redacted logs with request ID, status, duration, provider, model, attempt, and no prompts or secrets by default.
8. `/health` for process state and a protected dependency check for provider/B2 configuration.
9. `PROVENANCE_ENABLED=false` rollback switch that leaves the existing manual shot workflow available.
10. Cleanup/retention runbook and explicit human approval before deployment.

Implementation evidence is in `lib/provenance-gateway.ts`, `functions/api/provenance/`, `jingci_spike/http_service.py`, the TypeScript gateway tests, Python regression tests, and `tests/preview_http_service_smoke.py`. It does not satisfy configured edge rate limiting, reviewer-account evidence, provider/B2 dependency health, deployed runtime, or post-deploy controls.

## Release And Rollback

Preview release is blocked until `npm run hackathon:deploy:check` passes. Roll back immediately on secret exposure, uncontrolled anonymous requests, incorrect CORS, digest/manifest mismatch, cleanup failure rate above zero, or inability to complete the judge path twice consecutively.

Rollback sequence:

1. Set `JINGCI_PROVENANCE_ENABLED=NO` in both runtime layers; the public frontend contains only the same-origin path.
2. Roll the frontend to the previous healthy Pages deployment.
3. Stop the Python service revision and revoke its provider/B2 keys if compromise is possible.
4. Inspect and remove owned `jingci-smoke/` or campaign-prefix objects.
5. Re-run the base DirectorKit smoke to prove manual workflow continuity.
