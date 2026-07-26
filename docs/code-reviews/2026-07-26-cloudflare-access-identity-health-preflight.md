# Review: Cloudflare Access Identity Health Preflight

Date: 2026-07-26

Status: FAIL CLOSED / CLEANUP VERIFIED

## Findings

1. The previous zero-usage defect is closed: the policy survived outer
   application save and reload, both sides reported the same application/policy
   membership, and policy usage was exactly one.
2. The identity preflight still returned HTTP 302 rather than the exact expected
   health JSON, so Service Auth was not accepted for the pinned hash hostname.
3. The failure occurred before the Pages Function. It is not evidence about the
   B2 credential, object path, or provenance transaction.
4. The single-request and no-retry boundary was honored.
5. Temporary cloud and local credentials were revoked or deleted after the
   failure.

## Strongest Rejection Reason

A persisted policy is necessary but not sufficient evidence that Cloudflare
accepted the service identity for the requested hostname. HTTP 302 is a hard
identity failure, so a provenance POST would only consume authority without
testing the application.

## Decision

Reject promotion of the cloud B2 claim. Require a read-only Access diagnosis and
a new, independently bounded identity preflight before any business POST.
