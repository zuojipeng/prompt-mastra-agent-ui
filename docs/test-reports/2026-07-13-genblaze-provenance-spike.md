# Test Report: Genblaze Provenance Spike

Date: 2026-07-13
Gate: Engineering / Code Review / Test
Status: PASS FOR LOCAL SPIKE

## Matrix

| Check | Command | Result |
| --- | --- | --- |
| Python syntax/imports | `PYTHONPATH=. /private/tmp/jingci-genblaze-venv/bin/python -m compileall -q jingci_spike tests` | PASS |
| Spike contract and manifest | `PYTHONPATH=. /private/tmp/jingci-genblaze-venv/bin/python -m unittest discover -s tests -v` | PASS, 4 tests |
| Fixture CLI | `PYTHONPATH=. /private/tmp/jingci-genblaze-venv/bin/python -m jingci_spike.cli fixtures/shot-job.json` | PASS, `verified: true`, completed run, no unverified assets |
| Existing Jingci tests | `PATH=/Users/edy/.nvm/versions/node/v22.21.1/bin:$PATH npm test -- --pool=threads` | PASS, 13 files / 92 tests |
| Patch hygiene | `git diff --check` | PASS |

## Failed Evidence Retained

The first frontend test attempt used the shell's older Node runtime and failed because `node:util.styleText` was unavailable. Re-running with the project's established Node 22.21.1 path passed all 92 tests. This was an environment mismatch, not a product-code repair.

## Not Tested

- paid or external model generation
- Backblaze account, bucket, credentials, upload, or public asset URL
- remote asset re-hashing
- Python service transport/authentication
- browser UI and production deployment
