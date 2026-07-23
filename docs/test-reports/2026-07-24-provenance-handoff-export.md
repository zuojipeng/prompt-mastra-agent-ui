# Test Report: Provenance Handoff Export

Date: 2026-07-24

Status: PASS LOCAL / CLOUD CLAIM BLOCKED

## Results

| Check | Result |
| --- | --- |
| Focused export/workspace/source tests | PASS, 36 tests |
| Full Vitest regression | PASS, 28 files / 194 tests |
| TypeScript | PASS |
| ESLint | PASS |
| Production build | PASS |
| Desktop clipboard handoff E2E | PASS |
| Mobile clipboard handoff E2E | PASS |
| Desktop restore/reload/copy E2E | PASS |
| Mobile restore/reload/copy E2E | PASS |
| Claims approval validator | PASS; draft/demo copy only |
| Submission draft validator | PASS with 4 declared blockers |

## Covered Assertions

- All three copied artifacts contain mode, provider/model, attempt, full asset
  SHA-256, full manifest hash, and verification time.
- Parent Job IDs are absent from copied artifacts.
- Fixture, Local, and Preview qualifications cannot collapse into a generic cloud
  success claim.
- Legacy projects omit empty receipt sections.
- Orphan receipts are ignored.
- Unsafe identity text is rejected before persistence/export.
- Restore and reload retain the same receipt in a newly copied snapshot.

## Limit

This verifies receipt-derived fields. Existing user-authored links in notes and
calibration evidence remain visible by design and require human review before public
sharing.
