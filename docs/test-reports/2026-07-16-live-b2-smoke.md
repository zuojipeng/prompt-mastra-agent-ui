# Test Report: Live B2 Smoke

Date: 2026-07-16
Status: PASS FOR SCOPED B2 TRANSPORT
Evidence Level: E5

## Result

| Check | Result |
| --- | --- |
| Source branch | Clean and synchronized before execution |
| Focused offline tests | 8 passed |
| Object scope | One generated key below `jingci-smoke/` |
| Upload | PASS |
| Read-back | PASS |
| Payload SHA-256 | `e295accf62ba9afaf27e5b95cf2e6161e194b275ebe28f53695d683502ff5fb8` |
| Read-back SHA-256 | `e295accf62ba9afaf27e5b95cf2e6161e194b275ebe28f53695d683502ff5fb8` |
| Delete and confirm absent | PASS |
| Credentials in output/evidence | None |

## Wrapper Anomaly

The Python smoke emitted a passed result before the surrounding zsh command assigned to its reserved read-only `status` variable. The wrapper therefore exited 1 after successful cleanup. No second live execution was attempted.

## Limits

The smoke does not prove a generated media asset, canonical manifest, Genblaze live composition, old B2 version erasure, public URL, Runway request, spend, deployment, claims promotion, or submission.
