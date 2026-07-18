# Code Review: Preview Security Gateway

Status: PASS FOR CODE-ONLY HANDOFF; DEPLOYMENT BLOCKED
Producer: Architecture Agent + Engineering Agent + DevOps Agent
Reviewer: Security Agent + Code Review Agent

## Scope

- Same-origin provenance preview transport.
- Cloudflare Pages Access middleware and constrained proxy.
- Preview runtime ADR, threat model, deployment readiness, and operator handoff.
- Next.js/runtime dependency security baseline.

## Findings Closed

1. **BLOCKER — upstream authentication body leaked after status normalization.** The first gateway test showed a `401` body still reached the browser as a `502`. Authentication and all 5xx responses now return gateway-owned generic JSON.
2. **BLOCKER — preview transport fell through to fixture execution.** ChatBox previously treated only `local` as HTTP. Both `local` and `preview` now use the HTTP client, and preview gets an explicit non-B2 UI label.
3. **BLOCKER — production build suppressed type and lint failures.** Removed both Next.js bypasses and repaired pre-existing test typing so the production build runs both checks.
4. **BLOCKER — known production dependency vulnerabilities.** Upgraded Next.js and aligned `eslint-config-next` to 15.5.20, moved the flat config through `FlatCompat`, and overrode nested PostCSS to 8.5.15. Full `npm audit` now reports zero findings.
5. **REWORK — stale deployment blockers and provider claims.** Removed the completed live-evidence blocker, split identity/rate-limit work into separately verifiable controls, and corrected older provider documents without changing the hash-bound claims packet.
6. **IMPROVEMENT — missing deadline and health tests.** Added explicit abort and allowed-health-route coverage.

## Security Properties Reviewed

- No secret, backend origin, Access audience, or bearer appears in public frontend code.
- Only exact HTTPS service origins with no credentials/path/query/fragment are accepted.
- Access is cryptographically validated by Cloudflare's official plugin when configured.
- POST requires exact same origin and rejects cross-site Fetch Metadata.
- Request and response streams are read with hard byte ceilings.
- Redirects are refused; unsupported routes and methods fail closed.
- Backend auth failures, 5xx bodies, and exceptions are not relayed.
- Responses are JSON, no-store, and nosniff with request IDs.

## Residual Risks

- Cloudflare Access, edge rate limiting, Railway, and secret bindings are not configured or live-tested.
- The Python preview endpoint currently produces deterministic memory evidence, not a judge-visible B2 persistence event.
- Distributed rate limiting must remain an external Cloudflare control; per-isolate counters would be misleading.
- Post-deploy browser, rollback, logs, and reviewer-account evidence are still required.

## Verdict

The code-only preview boundary is proportionate and reversible. It is ready for deployment preparation, not deployment or public B2 claims.
