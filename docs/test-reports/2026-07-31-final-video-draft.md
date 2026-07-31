# Test Report: Final Video Draft

Date: 2026-07-31

Status: PASS LOCAL

| Check | Result |
| --- | --- |
| Runtime | PASS, 147 seconds (< 180) |
| Video | PASS, H.264 1280×720 at 30 fps |
| Audio | PASS, AAC mono, 147 seconds |
| Captions | PASS, English `mov_text`, 7 cues recoverable from MP4 |
| Public-flow network boundary | PASS, requests outside Pages host 0 |
| Visual checkpoints | PASS at 00:05, 01:05, 01:22, 01:53, 02:18 |
| Claims qualification | PASS, approved two-phase and deletion language present |
| Output digest | `85dfde49118b69e4aef67f285d4fd5b71bf458fe1893166590a0ea14885f0bd0` |

Residual: subtitle visibility depends on the player enabling the embedded track. The SRT must also be uploaded as platform captions when the video is published.
