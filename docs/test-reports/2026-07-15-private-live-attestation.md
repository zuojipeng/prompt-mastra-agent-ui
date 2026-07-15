# Test Report: Private Live Result Attestation

Date: 2026-07-15
Status: PASS FOR FIXTURE-ONLY EVIDENCE BOUNDARY

## Focused Matrix

| Check | Result |
| --- | --- |
| Canonical exact private-result schema and deterministic redaction | PASS |
| Commit, approval document, run, attempt, cost, and time binding | PASS |
| MP4 probe, digest, B2 read-back, lineage, and cleanup contract | PASS |
| Raw secret, signed URL, duplicate key, unknown field, and noncanonical JSON rejection | PASS |
| Owner, `0700/0600`, symlink, hardlink, existing output, size, and UTF-8 controls | PASS |
| Exact owned prefix and content-addressed asset/manifest layout | PASS |
| Impossible date and out-of-namespace mutations | PASS |
| Collector absence, invalid evidence, valid fixture, and false claim promotion | PASS |

Focused result: 30 tests passed across 3 files on Node 22.

## Regression

- Full frontend/Node regression: 154 tests passed across 23 files.
- Production build: passed.
- ESLint on changed scripts/tests: passed; only stale baseline-data advisory emitted.
- Submission/deployment/demo/live draft blockers: 7 / 8 / 5 / 8.
- Staged draft release evidence: 418 tracked text files scanned, 19 binary exclusions, 0 secret findings, 1 live-evidence blocker.
- Python sources were not changed; C-020 remains the latest 81-test Python evidence.

## Not Proven

A combined live harness, a real private result or attestation, claims-promotion approval, registration, credentials, provider generation or billing, Backblaze B2 operations, deployment, publication, or submission.
