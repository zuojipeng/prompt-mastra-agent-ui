# Test Report: Cloudflare Access Identity Health Preflight

Date: 2026-07-26

Status: ATTACHMENT PASS / IDENTITY FAIL / CLEANED

## Results

| Check | Result | Evidence |
| --- | --- | --- |
| Exact wildcard application | PASS | `*.jingci-genmedia-preview-2026.pages.dev` |
| Policy action | PASS | `Service Auth` |
| Token selector | PASS | One temporary service token |
| Outer application save and reload | PASS | Policy remained visible after reload |
| Application to policy membership | PASS | Target application listed the temporary policy |
| Policy to application membership | PASS | Policy listed only the target application |
| Application usage count | PASS | Exactly `1` |
| Private attestation validator | PASS | Mode 0600, fresh, secret-free, distinct observer/reviewer |
| Identity-only health GET | FAIL | One HTTP 302, `text/html`; expected HTTP 200 JSON |
| Pages Function reached | NO | Access redirect occurred first |
| Business POST | NOT EXECUTED | No authority consumed |
| B2 operation | NOT EXECUTED | Health route did not reach the Function |
| Retry | NONE | Single request only |
| Cloud cleanup | PASS | Policy detached/deleted; token deleted |
| Local cleanup | PASS | Credential, response, header, and attestation files deleted |

## Boundary

No provenance business POST, B2 object operation, Runway call, deployment,
publication, paid action, or Devpost submission occurred.
