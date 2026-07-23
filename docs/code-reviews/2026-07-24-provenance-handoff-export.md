# Code Review: Provenance Handoff Export

Date: 2026-07-24

Status: PASS WITH EXPLICIT PUBLICATION BOUNDARY

## Findings Closed

1. Export context now receives the existing sanitized receipt collection.
2. All three builders use a shared receipt formatter and full verification hashes.
3. Orphan receipts outside the current DirectorKit are ignored.
4. Internal parent Job IDs are retained in the project UI but excluded from copied
   handoff artifacts.
5. Fixture, Local, and Preview exports state different evidence limits; Preview
   explicitly does not prove the deployed Cloudflare smoke.
6. Missing receipts do not change legacy output or production handoff readiness.
7. Async receipt completion appends to the latest persisted project instead of
   rebuilding from a stale event-handler closure.
8. Receipt identity validation rejects Markdown/URL injection and bounded-length
   violations.

## Residual Risks

- Existing user-entered result notes and calibration material links are intentionally
  still exported. The complete document is not automatically safe for public
  publication.
- The type-only workspace/export ownership cycle remains technical debt; splitting
  it now would exceed the slice.
- The authenticated cloud B2 path remains unverified.

## Decision

PASS for campaign-branch project handoff. No release, publication, deployment, paid
call, or submission authority is granted.
