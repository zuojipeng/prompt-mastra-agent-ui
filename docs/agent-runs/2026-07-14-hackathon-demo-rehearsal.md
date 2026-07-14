# Agent Run: Hackathon Demo Rehearsal

## Goal

Rehearse the updated judge path with timed narration, truthful Local/Fixture labels, desktop/mobile browser evidence, and an explicit failure fallback without live claims.

## Loop Board

Loop: 12
Current gate: Operator / UE / Claims Review / Test
Decision: SHIP LOCAL REHEARSAL, KEEP FINAL VIDEO BLOCKED

| ID | From | To | Level | Request | Close Evidence | Status |
| --- | --- | --- | --- | --- | --- | --- |
| DR1 | Operator Agent | Engineering Agent | BLOCKER | Record the real browser-to-Python local path, not the old DirectorKit-only reel | New recorder and WebM | CLOSED |
| DR2 | Claims Review Agent | Operator Agent | BLOCKER | Replace B2 voiceover whenever Local or Fixture is visible | Script alternatives and report | CLOSED |
| DR3 | Test Agent | DevOps Agent | REWORK | First recording used Node 18.12 and could not start Next.js | Node 22 rerun and recorded failure | CLOSED |
| DR4 | UEAgent | Test Agent | BLOCKER | Verify evidence labels, long URIs, and controls on desktop/mobile | Four screenshots and four E2E checks | CLOSED |
| DR5 | Claims Review Agent | Engineering Agent | BLOCKER | Prevent local footage from becoming final-ready metadata | Demo manifest, strict gate, and four tests | CLOSED |
| DR6 | Code Review Agent | Claims Review Agent | REWORK | Final gate incorrectly required audio even when accurate captions are allowed | Voiceover-or-captions rule and test | CLOSED |

## Result

- Recorded a 10.48-second VP8 visual reel through the real local Python adapter.
- Captured current desktop and mobile Local panels.
- Re-ran Local success and Fixture failure/retry E2E on both viewports.
- Added a contiguous 2:35 narration manifest and local/final claims gate.
- Preserved five final-video blockers and no public URL.

## Next Owner

Product Agent and Architecture Agent select one external AI media provider and freeze a guarded adapter contract with official constraints, cost gate, output verification, and a credential-free fake before any live authorization.
