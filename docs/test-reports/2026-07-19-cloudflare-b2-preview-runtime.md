# Test Report: Cloudflare B2 Preview Runtime

Status: PASS locally

Date: 2026-07-19

| Check | Result |
| --- | --- |
| Gateway behavior | PASS - 6/6 |
| Runtime/deployment validators | PASS - 12 focused tests |
| Full Vitest regression | PASS - 28 files, 185 tests |
| TypeScript | PASS |
| ESLint | PASS |
| Next.js production export | PASS - 5 static pages |
| Cloudflare Pages Functions bundle | PASS |
| Source digest/lineage | PASS under injected B2 fake |
| Manifest write/read-back | PASS under injected B2 fake |
| Tampered read-back cleanup | PASS |
| Ambiguous PUT cleanup | PASS |
| Tracked secret scan | PASS - only intentional attack fixtures matched |

The first standalone TypeScript run raced with a parallel Next.js build that was rebuilding `.next/types`; the required serial rerun passed. No Cloudflare deployment, live Worker-to-B2 request, Runway call, publication, or Devpost submission is claimed by this report.
