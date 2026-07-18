# Agent Run: Preview Security Gateway

## Goal

Prepare the judge-accessible runtime boundary without deploying, creating cloud resources, publishing a URL, writing B2, or invoking Runway.

## Loop Board

Loop: 30
Current gate: Architecture / Engineering / Security / Code Review / Test / Release Preparation
Decision: SHIP CODE AND EVIDENCE; KEEP DEPLOYMENT BLOCKED

| ID | From | To | Level | Request | Close Evidence | Status |
| --- | --- | --- | --- | --- | --- | --- |
| PG1 | Architecture Agent | Engineering Agent | BLOCKER | Keep credentials and service origins out of static JavaScript | Same-origin client and server-only bindings | CLOSED |
| PG2 | Security Agent | Engineering Agent | BLOCKER | Validate Cloudflare Access JWT instead of trusting a header | Official Access Pages plugin and Worker build | CLOSED |
| PG3 | Code Review Agent | Engineering Agent | BLOCKER | Do not relay upstream authentication or 5xx response bodies | Generic gateway error regression | CLOSED |
| PG4 | Test Agent | Engineering Agent | REWORK | Preview mode initially selected fixture execution in ChatBox | Non-fixture HTTP branch and source regression | CLOSED |
| PG5 | Test Agent | DevOps Agent | REWORK | Deployment test retained the old combined identity blocker | Split Access/rate-limit assertions and stale-live blocker denial | CLOSED |
| PG6 | Release Agent | Engineering Agent | BLOCKER | Production build skipped type and lint validation | Removed Next.js bypasses; build validates both | CLOSED |
| PG7 | Security Agent | Release Agent | BLOCKER | Next 15.0.3 and nested PostCSS had known production vulnerabilities | Next 15.5.20, PostCSS 8.5.15 override, zero-vulnerability audit | CLOSED |
| PG8 | Code Review Agent | Test Agent | IMPROVEMENT | Prove gateway deadline and health allowlist behavior | Timeout-abort and health-route tests | CLOSED |

## Result

- Static frontend uses only `/api/provenance` in preview mode.
- Pages Function validates Access, enforces same-origin POST, caps both directions at 64KB, refuses redirects, bounds upstream time, and injects a secret-bound bearer.
- Only health and provenance-run routes are forwarded.
- Python runtime, Access policy, rate-limit rule, deployment key, preview URL, and post-deploy smoke remain unconfigured and human-gated.
- The current Python HTTP path is deterministic preview evidence. It must not be presented as a public B2 execution until the deployment-specific B2 path is implemented and verified.

## Next Owner

DevOps Agent prepares the exact Access, rate-limit, Railway, B2-key, smoke, and rollback checklist. Human owner separately approves deployment before any infrastructure action.
