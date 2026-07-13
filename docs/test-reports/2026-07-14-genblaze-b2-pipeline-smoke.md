# Test Report: Genblaze B2 Pipeline Smoke

Date: 2026-07-14
Gate: Architecture / Engineering / Code Review / Test
Status: PASS FOR OFFLINE PIPELINE HARNESS

## Matrix

| Check | Command | Result |
| --- | --- | --- |
| First focused run | `python -m unittest tests.test_live_genblaze_b2_smoke -v` | FAIL, fixed-prefix isolation finding reproduced |
| Focused rerun | same command after parameterization | PASS, 7 tests |
| Full Python regression | `PYTHONPATH=. /private/tmp/jingci-genblaze-venv/bin/python -m unittest discover -s tests -v` | PASS, 29 tests |
| Python compile | `PYTHONPATH=. /private/tmp/jingci-genblaze-venv/bin/python -m compileall -q jingci_spike tests` | PASS |
| No-network plan | `PYTHONPATH=. /private/tmp/jingci-genblaze-venv/bin/python -m jingci_spike.live_genblaze_b2_smoke --plan` | PASS |
| Unconfirmed live attempt | same module with `--live`, no confirmation/config | EXPECTED FAIL before backend construction |

## Proven

- Local and B2-shaped paths use the same pipeline assembly.
- Genblaze writes one content-addressed video and one manifest below a unique owned prefix.
- Read-back verifies exact asset bytes, SHA-256, manifest validity, and canonical hash.
- Success, partial upload, corrupt manifest, and cleanup failure close the delegate and preserve cleanup evidence.

## Not Proven

Real B2, external AI media provider, public deployment, production traffic, cost, or submission behavior.
