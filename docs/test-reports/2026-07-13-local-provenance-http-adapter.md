# Test Report: Local Provenance HTTP Adapter

Date: 2026-07-13
Gate: Architecture / Engineering / Code Review / Test
Status: PASS FOR LOCAL HTTP ADAPTER

## Matrix

| Check | Command | Result |
| --- | --- | --- |
| Python contract, dispatcher, pipeline, B2 config regression | `PYTHONPATH=. /private/tmp/jingci-genblaze-venv/bin/python -m unittest discover -s tests -v` | PASS, 14 tests |
| Python syntax/imports | `PYTHONPATH=. /private/tmp/jingci-genblaze-venv/bin/python -m compileall -q jingci_spike tests` | PASS |
| Real loopback HTTP | `PYTHONPATH=. /private/tmp/jingci-genblaze-venv/bin/python tests/http_service_smoke.py` | PASS, ephemeral port GET and POST |
| Patch hygiene | `git diff --check` | PASS before report update |

## Proven

- Request lineage and video-only contract fail closed.
- Local CORS is restricted to loopback origins.
- JSON, route, and size failures return stable status codes.
- Unexpected exceptions do not expose their message.
- HTTP POST executes the real deterministic Genblaze pipeline and returns a verified manifest plus memory asset evidence.

## Not Proven

Frontend HTTP integration, provider APIs, B2 durability, remote-byte verification, auth, cancellation, deployment, or production behavior.
