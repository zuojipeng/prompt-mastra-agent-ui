# Test Report: Release Evidence Collector

Date: 2026-07-14
Gate: DevOps / Claims Review / Code Review / Test
Status: PASS FOR LOCAL RELEASE EVIDENCE

## Matrix

| Check | Command | Result |
| --- | --- | --- |
| Initial collector tests | focused Vitest collector file | PASS, 3 tests |
| Adversarial focused suite | collector + submission + deployment readiness tests | PASS, 3 files / 11 tests |
| TypeScript | `npx tsc --noEmit` | PASS |
| Scoped lint | collector, readiness scripts, and tests | PASS; dependency freshness notice only |
| Draft evidence run | `npm run hackathon:evidence` | PASS; 395 tracked, 378 text scanned, 17 binary exclusions, 0 findings |
| Strict evidence run | `npm run hackathon:evidence:strict` | EXPECTED FAIL; dirty tree, 7 submission blockers, 8 deployment blockers |
| Full frontend regression | `npm test -- --pool=threads` | PASS, 20 files / 124 tests |
| Production build | `npm run build` | PASS, static export generated |
| Patch hygiene | `git diff --check` | PASS |

## Proven

- The collector produces stable source, gate, redacted config, artifact hash, and scan metadata for a fixed repository state.
- Suspected secret values are not copied into findings.
- Dirty source, real blockers, wrong readiness status, secret findings, symlinks, and oversized scan exclusions cannot become a release candidate.
- Binary exclusions are visible rather than falsely counted as scanned.

## Not Proven

Git history cleanliness, provider-side scanning, ignored-file safety, CI secret configuration, public deployment, live provider/B2 behavior, reviewer access, or formal submission.
