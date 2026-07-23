# Code Review: Project Provenance Receipt

Date: 2026-07-24

Status: PASS

## Reviewed Surface

- `lib/project-workspace.ts`
- `app/components/ChatBox.tsx`
- `app/components/ShotProvenancePanel.tsx`
- `app/components/DirectorKitShotInspector.tsx`
- receipt unit and browser tests
- campaign claims, architecture, demo, and judge-path copy

## Findings Closed

1. **P0 claim ambiguity:** protected preview copy now states that it reads a
   pre-generated Runway source and does not invoke Runway or Genblaze.
2. **P0 private-location exposure:** preview evidence renders private-object labels
   instead of raw asset and manifest locations.
3. **P1 evidence continuity:** successful evidence creates a sanitized project
   receipt that survives restore and reload.
4. **P1 schema expansion risk:** receipt validation accepts an exact key set and
   rejects injected fields such as `assetUrl`.
5. **P1 retry semantics:** failed attempt 2 preserves the prior receipt; recovered
   attempt 3 replaces it and retains the failed run as parent.

## Residual Risks

- The deployed cloud path still lacks a successful authenticated B2 smoke.
- Full run details are intentionally not restored; only the non-secret receipt is.
- Fixture URLs remain visible only in visibly labeled offline evidence mode.

## Decision

PASS for local campaign-branch integration. No public release or cloud claim is
approved by this review.
