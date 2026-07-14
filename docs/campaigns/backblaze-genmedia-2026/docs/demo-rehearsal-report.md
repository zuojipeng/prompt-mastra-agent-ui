# Demo Rehearsal Report

Date: 2026-07-14
Status: LOCAL REHEARSAL ONLY

## Captured Evidence

- Visual reel: `artifacts/demo/jingci-backblaze-rehearsal.webm`
- Format: VP8 WebM, 1440×1000, 10.48 seconds, no audio track
- Local desktop: `output/playwright/hackathon-rehearsal-local-desktop.png`
- Local mobile: `output/playwright/hackathon-rehearsal-local-mobile.png`
- Fixture failure/retry desktop: `output/playwright/provenance-desktop.png`
- Fixture failure/retry mobile: `output/playwright/provenance-mobile.png`

The WebM is a short visual reel for editing and timing rehearsal. It is not the final 2:35 submission video and is intentionally Git-ignored.

## Truthful Demo Path

1. Enter the wasteland robot idea and run creative diagnosis.
2. Select the cinematic reconstruction and generate DirectorKit.
3. Open shot 1 and point out the visible `Local adapter` and memory-storage labels.
4. Run provenance through the real loopback Python HTTP boundary.
5. Show `jingci-local-video / local-proof`, asset SHA, memory URI, manifest hash, and `Verified`.
6. Switch to the separately labeled Fixture evidence to explain provider timeout, attempt 2, and parent-run lineage.
7. Close on the planned live B2 boundary and state that account-backed evidence is still blocked.

## Local Voiceover Replacement

Use this wording over the current rehearsal evidence:

> This is a local integration proof, not a live provider or Backblaze upload. The browser calls our Python Genblaze adapter, receives deterministic media from memory storage, and accepts the run only after the asset digest and provenance manifest verify.

For failure recovery:

> The failure path is an explicit offline fixture. It proves that retry increments the attempt and preserves the parent run; it does not prove provider behavior.

## Failure Fallback

If the local adapter is unavailable during a rehearsal:

1. Do not silently switch evidence modes.
2. Show the `Fixture` badge before running the fallback.
3. Use the tracked desktop/mobile Fixture screenshots for failure and retry lineage.
4. State that live provider and B2 verification remain open gates.
5. Return to the base DirectorKit workflow rather than showing a broken spinner.

## Visual Review

- Desktop and mobile panels show the evidence mode before the action.
- Provider/model, attempt, asset, manifest, and verified state remain readable.
- Long memory URIs wrap within the panel.
- No credentials, account identifiers, public URLs, personal data, or third-party media appear.
- The reel has no sound; final voiceover or accurate English subtitles remain required.
