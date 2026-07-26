# Test Report: Cloudflare Access Read-Only Diagnosis

Date: 2026-07-26

Status: DIAGNOSIS PASS / IDENTITY GATE BLOCKED

## Results

| Check | Result | Evidence |
| --- | --- | --- |
| Preview HTTP request | NOT EXECUTED | Read-only diagnosis boundary |
| Cloudflare mutation | NOT EXECUTED | No application, policy, or token change |
| New-log service-auth exclusion removed | PASS | Two events remained; no preflight service event |
| Legacy Access log checked | PASS | Only completed owner-session events |
| Hash-host application match | PASS | Wildcard target only |
| Apex application overlap | REJECTED | Apex target does not match hash hostname |
| Custom service-token header mode | REJECTED | Standard pair mode remains configured |
| Exact credential failure subtype | UNPROVEN | Temporary token and request material were securely deleted |
| Business POST / B2 | NOT EXECUTED | Identity gate remains closed |

## Conclusion

The failed preflight did not produce accepted service-authentication evidence.
The next valid test is a new, explicitly authorized, single identity-only health
request using a freshly bound token and policy. No business request is allowed
until that test passes.

## References

- https://developers.cloudflare.com/cloudflare-one/access-controls/service-credentials/service-tokens/
- https://developers.cloudflare.com/cloudflare-one/access-controls/policies/app-paths/
