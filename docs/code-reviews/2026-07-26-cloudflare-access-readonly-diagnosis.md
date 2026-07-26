# Review: Cloudflare Access Read-Only Diagnosis

Date: 2026-07-26

Status: ROOT-CAUSE CLASS NARROWED / EXECUTION STILL BLOCKED

## Findings

1. The hash hostname is protected only by the wildcard Access application. The
   apex application is not a more-specific match and did not shadow the attached
   Service Auth policy.
2. The wildcard application has no custom single-header service-token mode, so
   the standard `CF-Access-Client-Id` and `CF-Access-Client-Secret` contract
   remains applicable.
3. Removing the new log view's service-authentication exclusion did not reveal a
   preflight event. The legacy view also contained no matching service event.
4. HTTP 302 is consistent with the application's default failed-service-auth
   behavior, but the retained evidence cannot distinguish malformed or absent
   header values from a mismatched credential pair.
5. Recreating the old request from memory would be an unreviewable retry. The
   revoked token and deleted secret material must remain deleted.

## Required Repair

The next run must bind one fresh token identity across credential capture,
policy selection, attachment evidence, and request preparation. Credential
values must be captured by explicit label rather than display order, remain in a
mode-0600 temporary file, and be destroyed after one identity-only request.

## Decision

Reject any claim that the Pages Function or B2 caused the 302. Reject another
business POST until a newly authorized identity-only health preflight returns
the exact expected HTTP 200 JSON response.
