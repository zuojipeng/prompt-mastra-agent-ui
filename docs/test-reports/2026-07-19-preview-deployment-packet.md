# Test Report: Preview Deployment Packet

Status: SUPERSEDED by `2026-07-19-cloudflare-b2-preview-runtime.md`

This report covers the earlier v1 Cloudflare/Railway packet. The current v2 packet is tested in the superseding report.

Date: 2026-07-19

| Check | Result |
| --- | --- |
| Packet validator | PASS |
| Focused mutation tests | PASS - 2/2 |
| Four secret fields null | PASS |
| Retained-source cross-binding | PASS |
| Smoke matrix | PASS - 10 unique checks |
| Rollback matrix | PASS - 5 unique steps |
| Deployment blockers | PASS - exact 7 |
| External authorization | PASS - all false |
| Full Node regression | PASS - 28 files, 186 tests |
| Secret scan | PASS - 538 text files, 19 binary exclusions, zero findings |

No Cloudflare, Railway, B2, Runway, publication, or Devpost operation was executed.
