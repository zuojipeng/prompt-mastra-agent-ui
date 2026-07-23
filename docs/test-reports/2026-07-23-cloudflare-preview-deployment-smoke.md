# Test Report: Cloudflare Preview Deployment Smoke

Status: ROLLED BACK / BLOCKED

Date: 2026-07-23

## Scope

Validate the Access-protected Cloudflare Pages preview, the Pages Function route, one
retained-source B2 manifest transaction, and the rollback path. No Runway call,
public release, paid call, or Devpost submission was authorized or performed.

## Results

| Check | Result | Evidence |
| --- | --- | --- |
| Production hostname denies anonymous access | PASS | HTTP 302 to Cloudflare Access |
| Hash deployment denies anonymous access | PASS | HTTP 302 to native Pages preview Access |
| Pages Function bundle and route exist | PASS | Dashboard route and invocation configuration |
| Authenticated health | PASS | HTTP 200, `cloudflare-b2-preview` |
| Authenticated B2 manifest transaction | FAIL | HTTP 502 `storage_unavailable` |
| Equivalent local Worker gateway with the same local B2 credential | PASS | One no-retry 4.9s transaction: source read, SHA-256 verification, manifest write and readback |
| Temporary smoke UI removed | PASS | Commit `3189164f55480afff0bf972f732c66095854aff5` |
| Rollback deployment | PASS | `https://e2791cd2.jingci-genmedia-preview-2026.pages.dev` |
| Access after rollback | PASS | Production and rollback hash URLs both return HTTP 302 anonymously |

The first local probe returned HTTP 400 at request validation and performed no B2
operation. The corrected probe was then executed exactly once with Vitest retries
disabled.

## Diagnosis

The same gateway code and local B2 credential completed the transaction outside the
Cloudflare deployment. This narrows the cloud failure to deployment configuration or
the Cloudflare execution boundary. It does not prove that the currently stored
Cloudflare secret values match the local verified values.

Re-uploading the credential was not attempted after the execution safety reviewer
required a new, explicit post-risk approval for that exact transfer.

## Rollback

- Rotated `JINGCI_PROVENANCE_ENABLED` to a non-`YES` value for the next deployment.
- Removed the temporary `/ops/provenance-smoke` page.
- Built, tested, committed, pushed, and deployed the rollback commit.
- Rechecked anonymous Access protection on production and hash deployment URLs.

Authenticated HTTP 503 verification remains pending because the authenticated app
browser became unavailable. The code path is fail-closed for every value other than
exact `YES`.
