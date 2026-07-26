# Test Report: Cloudflare Authenticated Smoke Attempt

Date: 2026-07-26

Status: HTTP REACHED / FUNCTION UNREACHED / BLOCKED

## Scope

Use one temporary Cloudflare Access service identity to execute exactly one
authenticated POST against the pinned Pages deployment. The approval prohibited
retry, Runway calls, public release, paid calls, and Devpost submission.

## Results

| Check | Result | Evidence |
| --- | --- | --- |
| Owner browser authentication | PASS | Protected preview opened in the existing owner session |
| Temporary service identity | CREATED THEN REVOKED | One service token and one reusable Service Auth policy |
| Policy attachment | FAIL CLOSED | After save, the reusable policy reported zero applications using it |
| Authorized POST | HTTP 302 | One request reached Cloudflare and received the Access redirect response |
| Pages Function | UNREACHED | No provenance response schema or application status was returned |
| B2 operation | NOT OBSERVED | The request stopped before the Pages Function |
| Retry prohibition | PASS | Exactly one business POST; no retry |
| Cloudflare cleanup | PASS | Temporary policy and service token deleted and verified absent |
| Local cleanup | PASS | Five temporary credential, request, response, status, and helper files deleted |

## Interpretation

This attempt improved the diagnosis from a local DNS failure to a confirmed
Cloudflare Access response. It did not verify the Pages Function or B2 path. The
reusable policy was created successfully but was not persisted on the wildcard
Pages application, as shown by its zero-application usage count.

The authorization is consumed. Cloud B2 verification remains blocked and requires
a new explicit one-attempt approval after the Access attachment procedure is
corrected.

## Safety

- No B2 object read, write, or delete was observed.
- No Runway request or spend occurred.
- No deployment, public publication, or Devpost submission occurred.
- Temporary Cloudflare credentials and local secret-bearing files were removed.

## Repository Verification

- Focused campaign tests: 3 files / 9 tests passed.
- Full Vitest regression: 30 files / 201 tests passed.
- Preview result, operator handoff, and generated campaign status validators passed.
- ESLint passed.
- Next.js production build passed.
- Tracked-file secret pattern review found no credential values.
