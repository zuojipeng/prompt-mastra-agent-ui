# Test Report: B2 Credential Scope Attestation

Status: PASS OFFLINE

Date: 2026-07-18

| Check | Result |
| --- | --- |
| Scope/adapter/contract focused suite | PASS - 37 tests |
| Python full regression | PASS - 170 tests |
| Canonical short-lived scope accepted | PASS |
| Wrong bucket, prefix, or Key ID hash rejected | PASS |
| Missing required capability rejected | PASS |
| Dangerous extra capability rejected | PASS |
| Execution authority and secret recording rejected | PASS |
| Expired and over-24-hour review rejected | PASS |
| Adapter rejects scope before backend/consumption | PASS |
| Terminal result records scope review hash | PASS |
| Scope review target must match result storage target | PASS |
| Live-private result without scope evidence rejected | PASS |

No real approval, credential, environment value, Backblaze backend, network request, object mutation, Runway call, deployment, publication, or submission was used.
