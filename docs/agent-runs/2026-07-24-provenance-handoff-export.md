# Agent Run: Provenance Handoff Export

Date: 2026-07-24

Task: C-051 / JC-T005

## Assignment

Hermes dispatched Product/UE, Architecture/Code Review, and Test/Claims reviews
while Engineering integrated the sanitized project receipt into the existing
execution checklist, project snapshot, and Operator handoff.

## Decisions

- Reuse `ProjectProvenanceReceipt`; do not create a second DTO, repository, route,
  or schema version.
- Export full asset and manifest hashes, mode, provider/model, attempt, and
  verification time.
- Do not export `parentJobId`, object locations, credentials, raw runs, or provider
  responses.
- Keep provenance coverage separate from production handoff readiness.
- Label every export as the latest successful receipt, which may predate the most
  recent execution.
- Preserve the latest saved workspace and append only the receipt when an async run
  completes.

## Review Repairs

- Closed a stale-workspace overwrite risk by reading the latest persisted project
  before appending a receipt and refusing cross-project completion.
- Rejected Markdown, HTML, URL, token-like, control-character, and overlength
  provider/model identities.
- Added distinct Fixture, Local, and Preview qualifications.
- Added real clipboard E2E instead of relying on success toasts.

## Boundary

Receipt-derived export lines are public-safe by field whitelist. Existing
user-authored material notes and platform calibration links remain project data and
must still be reviewed before publishing the whole document.

No external service was called.
