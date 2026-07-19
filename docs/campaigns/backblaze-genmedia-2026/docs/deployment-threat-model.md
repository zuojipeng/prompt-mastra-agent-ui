# Preview Deployment Threat Model

Status: Cloudflare Worker implementation complete locally; cloud controls and deployment evidence pending.

## Trust Boundary

```text
Reviewer -> Cloudflare Access -> Pages UI + Function -> private Backblaze B2
```

The existing DirectorKit Worker remains a separate backend. The preview Function has no Runway credential and cannot create paid media.

## Threat Matrix

| Threat | Control | Evidence state |
| --- | --- | --- |
| B2 secret reaches browser or logs | encrypted bindings, generic errors, static bundle scan | implemented; cloud binding pending |
| Anonymous write/read abuse | Cloudflare Access plus edge rate limit | JWT middleware implemented; policy/rule pending |
| Cross-site invocation | exact same-origin check and `Sec-Fetch-Site` validation | unit tested |
| Oversized or malformed request | 64KB stream cap and strict contract normalizer | unit tested |
| Source substitution | server-bound key, provider/model, byte limit, SHA-256 | unit tested; live Worker smoke pending |
| Manifest overwrite | random run ID plus destination-absence check | unit tested |
| Partial manifest residue | delete only current request's owned manifest | tampered read-back test passes |
| Prompt or project identifier disclosure | persist SHA-256 only, never raw values | unit tested |
| Arbitrary egress/SSRF | B2 endpoint and key built exclusively from reviewed server config | implemented |
| False Genblaze claim | label browser manifest as retained-source envelope; keep Genblaze claim bound to separate recovery evidence | Claims Review required |
| Paid provider call | no Runway binding or client in deployed Function | structurally excluded |
| Unbounded object growth | Access, edge rate limit, judging-period monitoring and teardown | rate/ops evidence pending |

## Release Conditions

Release remains blocked until Access and rate limiting are configured, deployment secrets are uploaded securely, the pinned preview deployment passes all smoke checks, and rollback is exercised. Public publication and Devpost submission remain separate human gates.
