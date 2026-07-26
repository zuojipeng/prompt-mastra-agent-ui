# Test Report: Cloudflare Access Smoke Preflight

Date: 2026-07-26

Status: PASS OFFLINE / NO CLOUD EXECUTION

## Focused Coverage

| Case | Result |
| --- | --- |
| Blocked identity-first plan | PASS |
| Fresh bidirectional attachment attestation | PASS |
| Zero application usage | REJECTED |
| One-way policy/application membership | REJECTED |
| Missing outer application save gate | REJECTED |
| Health redirect expectation | REJECTED |
| Stale attestation | REJECTED |
| Target commit drift | REJECTED |
| Non-Service Auth policy action | REJECTED |
| Same observer and reviewer | REJECTED |
| Secret-bearing evidence | REJECTED |
| Business POST authority widening | REJECTED |

Focused result: 1 file / 8 tests passed.

## Regression

- Full Vitest regression: 31 files / 209 tests passed.
- ESLint passed.
- Next.js production build passed.
- Deployment readiness, operator handoff, campaign status, and preflight validators passed.

## Boundary

The validator performs no network request and grants no cloud action. No
Cloudflare credential, B2 credential, object operation, Runway call, deployment,
publication, or Devpost submission was used.
