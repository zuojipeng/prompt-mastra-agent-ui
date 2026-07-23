# Test Report: Project Provenance Receipt

Date: 2026-07-24

Status: PASS LOCAL / CLOUD CLAIM BLOCKED

## Results

| Check | Result |
| --- | --- |
| TypeScript `npx tsc --noEmit` | PASS |
| ESLint `npm run lint` | PASS |
| Vitest full regression | PASS, 28 files / 188 tests |
| Production build | PASS |
| Receipt unit/source tests | PASS, 22 tests in focused run |
| Desktop failure/retry E2E | PASS |
| Mobile failure/retry E2E | PASS |
| Desktop project restore/reload E2E | PASS |
| Mobile project restore/reload E2E | PASS |
| Demo draft validator | PASS with 3 declared blockers |
| Submission draft validator | PASS with 4 declared blockers |
| Deployment draft validator | PASS with 7 declared blockers |
| Release evidence scan | 0 tracked-secret findings; non-strict run remains red because the worktree is intentionally dirty and release blockers remain |

## Browser Evidence

- `output/playwright/provenance-desktop.png`
- `output/playwright/provenance-mobile.png`

Visual review confirmed readable desktop/mobile receipts and no raw B2 location in
protected-preview rendering. Fixture URLs remain visible only under the explicit
offline Fixture label.

## Interpretation

The local product contract is verified. This report does not promote the protected
Cloudflare deployment to cloud-B2 verified, judge-accessible, public, or
release-ready.
