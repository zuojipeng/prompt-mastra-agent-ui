# Test Report: Final Video Draft

Date: 2026-07-31

Status: PASS PUBLIC

| Check | Result |
| --- | --- |
| Runtime | PASS, 147 seconds (< 180) |
| Video | PASS, H.264 1280×720 at 30 fps |
| Audio | PASS, AAC mono, 147 seconds |
| Visible captions | PASS, 10 contiguous burned-in English and Chinese cues cover all 147 seconds |
| Accessibility track | PASS, English `mov_text` stream retained in the MP4 |
| Public-flow network boundary | PASS, requests outside Pages host 0 |
| Visual checkpoints | PASS at 00:05, 01:05, 01:22, 01:53, 02:18; Chinese glyphs render, long lines wrap, and captions stay inside the lower safe area |
| Claims qualification | PASS, approved two-phase and deletion language present |
| Output digest | `886f4c448e8e2c4650d1dcefcf05140af582f65c5ce53070df8b9b2f6d4d69b1` |
| YouTube publication | PASS, `https://youtu.be/I4dsEfnbUX4` |
| Anonymous availability | PASS, oEmbed metadata and media extraction report a public video |
| Public transcode | PASS, 1280×720 video and audio streams available |
| YouTube checks | PASS, no copyright issues found |

Residual: burned-in captions cannot be disabled or localized independently. The retained English SRT remains local and may be attached later for accessibility and search indexing; visible bilingual captions are already player-independent.
