# Test Report: Cloudflare Access Labeled Identity Preflight

Date: 2026-07-26

Status: IDENTITY PREFLIGHT FAILED / CLEANUP PASSED

## Results

| Check | Result | Evidence |
| --- | --- | --- |
| Fresh token created | PASS | Exact temporary token name |
| Credential capture | PASS | Explicit Client ID and Client Secret labels |
| Credential validation | PASS | Non-empty, distinct, expected formats |
| Secret retention | PASS | Only token-pair SHA-256 retained |
| Service Auth policy | PASS | Exact named token, 15-minute session |
| Application attachment | PASS | Outer save and exact usage count one |
| Identity-only health GET | FAIL | One HTTP 302 to Access login |
| Redirect following | DISABLED | Empty 302 response retained |
| Expected health JSON | NOT OBSERVED | Zero-byte response body |
| Pages Function reached | NO | Access redirect occurred first |
| Business POST / B2 | NOT EXECUTED | Identity gate stopped execution |
| Retry | NOT EXECUTED | One-attempt authorization consumed |
| Policy cleanup | PASS | Detached, usage zero, then deleted |
| Token cleanup | PASS | Temporary token deleted |
| Local cleanup | PASS | Credential, config, header, and body files absent |

## Response Evidence

- HTTP status: `302`
- Redirect class: Cloudflare Access login
- Body length: `0`
- Body SHA-256:
  `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`
- Exact expected body: `false`

## Conclusion

The standard service-token header path still failed even after explicit label
capture and same-token binding. This run does not prove a Pages Function or B2
defect. Another identical identity attempt is not justified without a
materially different diagnostic or configuration change.
