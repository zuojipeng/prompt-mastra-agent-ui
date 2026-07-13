# Test Report: Backblaze Campaign Contract

Date: 2026-07-13
Gate: Engineering / Code Review / Test
Status: PASS FOR CONTRACT SLICE

## Matrix

| Check | Command | Result |
| --- | --- | --- |
| Provenance response contract | `npx vitest run __tests__/provenance-run-contract.test.ts --pool=threads` | PASS, 6 tests |
| TypeScript boundary | `npx tsc --noEmit` | PASS |
| Scoped lint | `npx eslint lib/provenance-run-contract.ts __tests__/provenance-run-contract.test.ts` | PASS; dependency freshness warning only |
| Frontend regression | `npm test -- --pool=threads` | PASS, 14 files / 98 tests |
| Genblaze regression | `PYTHONPATH=. /private/tmp/jingci-genblaze-venv/bin/python -m unittest discover -s tests -v` | PASS, 9 tests |
| Production build | `npm run build` | PASS, static export complete |
| Patch hygiene | `git diff --check` | PASS before report update |

## Acceptance Mapping

- Lifecycle states are explicit and stable: covered.
- Verified success requires asset and manifest evidence: covered.
- Retry parent and attempt survive normalization: covered.
- Failed runs require a recoverable error and no result: covered.
- Malformed external evidence fails closed: covered, including the review repair.
- Browser demo, deterministic transport, B2 live behavior, and fallback UX: not part of this slice.

## Residual Risk

The parser is a local boundary, not transport or release proof. UE, browser E2E, service integration, live B2 smoke, and preview deployment remain open gates.
