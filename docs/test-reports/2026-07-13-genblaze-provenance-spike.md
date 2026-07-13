# Test Report: Genblaze Provenance Spike

Date: 2026-07-13
Gate: Engineering / Code Review / Test
Status: PASS FOR LOCAL SPIKE

## Matrix

| Check | Command | Result |
| --- | --- | --- |
| Python syntax/imports | `PYTHONPATH=. /private/tmp/jingci-genblaze-venv/bin/python -m compileall -q jingci_spike tests` | PASS |
| Spike contract, provider, storage, and B2 config | `PYTHONPATH=. /private/tmp/jingci-genblaze-venv/bin/python -m unittest discover -s tests -v` | PASS, 9 tests |
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

## Loop 2 Evidence

The local pipeline test proves one provider invocation, completed run, succeeded step, exact byte-derived SHA-256, content-addressable asset key, separate manifest key, two storage writes, and credential-free durable URLs. It uses no network and therefore does not close the Backblaze integration gate.

## Loop 3 Evidence

B2 tests prove missing configuration fails closed, credentials are redacted, and offline backend construction disables preflight and lifecycle mutation. Team OS generated six campaign artifacts in evaluation mode. No B2 network request was made.
