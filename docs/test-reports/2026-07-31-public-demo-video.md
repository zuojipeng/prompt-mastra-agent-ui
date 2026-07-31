# Test Report: Public Demo Video

Date: 2026-07-31

Status: PASS

## Result

- URL: `https://youtu.be/I4dsEfnbUX4`
- Title: `Jingci Provenance Vault | Backblaze GenAI Media Challenge`
- Availability: public
- Runtime: 147 seconds (`2:27` from anonymous media metadata; Studio rounds the player display to `2:28`)
- Public media: 1280×720 H.264-compatible video and audio streams are available
- Captions: English and Chinese captions are burned into the source image; local visual checkpoints passed before publication
- Privacy: the reviewed source contains no credentials, signed URLs, private object keys, account consoles, or personal identifiers
- YouTube checks: copyright check completed with no issues found

## Verification

The human owner explicitly approved uploading the final bilingual MP4 to a public video platform. YouTube returned `Video published`. A cookie-free HTTP request returned 200, oEmbed returned the exact title and channel, and anonymous media extraction returned `availability=public`, duration 147 seconds, a 1280×720 video stream, and audio.

No Devpost final submission was performed.

## Repository Gates

- Strict demo readiness: PASS (`final-ready`, zero blockers)
- Operator handoff: PASS, current stage `final_submission`
- Campaign status summary: PASS
- Submission draft: PASS with only `default_branch_or_reviewer_handoff` and `human_submission_approval` open
- Focused readiness tests: 15/15 PASS
- Full frontend tests: 214/214 PASS
- TypeScript: PASS
- ESLint: PASS
