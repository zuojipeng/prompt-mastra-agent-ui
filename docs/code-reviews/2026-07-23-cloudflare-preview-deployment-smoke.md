# Code Review: Cloudflare Preview Deployment Smoke

Status: CONDITIONAL PASS / RELEASE BLOCKED

Producer: Engineering Agent + DevOps Agent

Reviewer: Code Review Agent + Test Agent + Claims Review Agent

## Findings

1. **PASS - anonymous preview bypass was closed.** Production and hash deployment
   hostnames both challenge through separate Cloudflare Access applications.
2. **PASS - the deployed Function is real.** Dashboard evidence shows the compiled
   module, middleware, function route, and `_routes.json`; the earlier static-site
   conclusion came from an abbreviated deployment identifier.
3. **PASS - storage failures are redacted.** Logs contain only request ID,
   operation, and upstream status. Bucket names, object keys, credentials, tokens,
   prompts, and signed URLs are excluded.
4. **PASS - rollback is reversible and fail-closed.** The feature requires exact
   `YES`; the rollback rotates it away from `YES` and removes the temporary UI.
5. **BLOCKER - cloud B2 write evidence is absent.** HTTP 502 cannot be promoted to a
   successful cloud provenance claim even though the equivalent local transaction
   passed.
6. **BLOCKER - credential equivalence is unverified.** Cloudflare secret values are
   write-only. Re-upload requires a new explicit human approval.
7. **RESIDUAL - authenticated rollback response is unobserved.** Anonymous Access
   remained correct, but the authenticated 503 response could not be rechecked.

## Verdict

Keep the preview rolled back. Do not publish, submit, or claim a cloud B2
transaction until credential re-upload, authenticated smoke, rate limiting, and
judge-path E2E all pass.
