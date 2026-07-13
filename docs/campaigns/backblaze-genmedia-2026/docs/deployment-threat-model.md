# Preview Deployment Threat Model

Status: design gate only. No deployment or account action is authorized by this document.

## Security Decision

The current Python adapter must not be exposed to the internet. It binds only to loopback, permits only local CORS origins, has no authentication, rate limit, concurrency limit, structured logs, or public-service shutdown control. The frontend client also rejects non-loopback provenance URLs.

The recommended judge preview uses a dedicated campaign deployment and an approved access layer with reviewer test-account instructions. B2 and provider credentials remain only in the provenance service. An embedded browser token is not authentication and is rejected as the primary control.

## Trust Boundaries

```text
Judge browser
  -> Cloudflare Pages campaign build
  -> approved reviewer access layer
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
| Secret shipped in static bundle or logs | Account compromise and storage loss | Server-only secrets, redacted structured logs, bundle scan | Partial/local |
| Anonymous generation abuse | Provider spend and denial of service | Reviewer authentication, edge rate limit, daily quota, concurrency cap | Missing |
| Cross-origin invocation | Third-party sites consume quota | Exact HTTPS origin allowlist and denied credentialed wildcard CORS | Loopback only |
| Oversized or malformed requests | Memory/CPU exhaustion or contract bypass | 64KB body cap, JSON media type, strict request schema | Implemented locally |
| Provider output SSRF or arbitrary URL fetch | Internal network access or data exfiltration | Provider and URL scheme/host allowlist; no arbitrary browser URL | Missing for live provider |
| Forged verified response | False provenance claim | Strict response parser, asset digest, read-back manifest verification | Implemented locally/offline |
| Cross-run object collision | Wrong deletion or lineage mix-up | Unique run prefix and content-addressed asset keys | Implemented offline |
| Public B2 object exposure | Prompt/media leakage | Private bucket and short-lived signed reads only | Pending account setup |
| Persistent presigned URLs | Credential material in durable records | Persist key/durable URI only; sign at read time | Design established |
| Partial upload residue | Cost and privacy residue | Owned-key tracking, cleanup, retention policy, manual recovery key | Implemented offline |
| Dependency or runtime drift | Broken judge app | Pinned versions, immutable commit, build and smoke evidence | Partial |
| Unobservable failure | Slow recovery during judging | Health/dependency checks, request IDs, latency/error counters | Missing |

## Required Public-Service Controls

1. Explicit `PUBLIC_PREVIEW_MODE=true`; service refuses non-loopback bind without it.
2. Exact `ALLOWED_ORIGINS` with HTTPS only; no wildcard.
3. Approved reviewer authentication or access layer. Public tokens embedded in JavaScript do not count.
4. Edge request rate limit plus process concurrency and timeout limits.
5. Dedicated bucket-scoped B2 key and private bucket; no lifecycle mutation by the app.
6. Provider/model and output URL allowlists.
7. Structured redacted logs with request ID, status, duration, provider, model, attempt, and no prompts or secrets by default.
8. `/health` for process state and a protected dependency check for provider/B2 configuration.
9. `PROVENANCE_ENABLED=false` rollback switch that leaves the existing manual shot workflow available.
10. Cleanup/retention runbook and explicit human approval before deployment.

## Release And Rollback

Preview release is blocked until `npm run hackathon:deploy:check` passes. Roll back immediately on secret exposure, uncontrolled anonymous requests, incorrect CORS, digest/manifest mismatch, cleanup failure rate above zero, or inability to complete the judge path twice consecutively.

Rollback sequence:

1. Set `PROVENANCE_ENABLED=false` or remove the provenance service URL from the campaign build.
2. Roll the frontend to the previous healthy Pages deployment.
3. Stop the Python service revision and revoke its provider/B2 keys if compromise is possible.
4. Inspect and remove owned `jingci-smoke/` or campaign-prefix objects.
5. Re-run the base DirectorKit smoke to prove manual workflow continuity.
