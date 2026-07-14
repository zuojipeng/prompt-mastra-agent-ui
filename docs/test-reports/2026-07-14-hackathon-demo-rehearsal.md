# Test Report: Hackathon Demo Rehearsal

Date: 2026-07-14
Gate: Operator / UE / Claims Review / Test
Status: PASS FOR LOCAL REHEARSAL ONLY

## Matrix

| Check | Command | Result |
| --- | --- | --- |
| First recording run | `npm run demo:record:hackathon` | FAIL, default terminal used unsupported Node 18.12.1 |
| Node 22 recording rerun | same script with approved Node 22 and campaign Python | PASS |
| Media inspection | `ffprobe` on local WebM | PASS, VP8 1440×1000, 10.48s, no audio |
| Local desktop/mobile E2E | `npm run test:e2e:provenance:local` | PASS, 2 projects |
| Fixture desktop/mobile E2E | focused Playwright happy path | PASS, 2 projects including failure/retry lineage |
| Demo draft gate | `npm run hackathon:demo:check` | PASS with five named blockers |
| Demo strict gate | `npm run hackathon:demo:check:strict` | EXPECTED FAIL while final evidence is absent |
| Demo gate tests | focused Vitest | PASS, 4 tests |
| TypeScript and scoped lint | `tsc` plus recorder/gate lint | PASS; dependency freshness notice only |
| Full frontend regression | `npm test -- --pool=threads` | PASS, 21 files / 128 tests |
| Production build | `npm run build` | PASS, static export generated |

## Visual Evidence

- Local desktop and mobile screenshots show mode, memory-storage warning, provider/model, attempt, asset SHA/URI, manifest hash/URI, and Verified.
- Fixture desktop and mobile screenshots show Fixture mode, no-real-storage warning, attempt 3, parent run, and retry control.
- Long evidence URIs wrap inside the panel; controls and status remain visible.

## Not Proven

Live provider generation, live B2 persistence/read-back, public deployment, real provider failure behavior, final narration/captions, public video availability, or submission compliance after transcoding.
