# Agent Run: Private Live Result Attestation

## Goal

Build a fixture-proven boundary that can validate one future private Runway-to-B2 result, remove identifiers and secrets, and feed release evidence without authorizing claims or live execution.

## Capability Registration

| Agent | Capability | Level | Evidence | Limit | Reviewer |
| --- | --- | --- | --- | --- | --- |
| Engineering Agent | Local Node editing, Vitest, ESLint, build | C2 | Exact validators, fixture tests, build | No production connection | Code Review Agent |
| Security Agent | Adversarial file/schema/secret review | C2 | Reproductions for bypasses | Cannot certify implementation | Test Agent |
| Claims Review Agent | Readiness and public-claim review | C2 | Collector mutations and claim checks | Cannot approve live claims | Hermes |

## Loop Board

Loop: 17
Decision: SHIP FIXTURE EVIDENCE BOUNDARY, KEEP LIVE CLAIMS BLOCKED

| ID | From | To | Level | Request | Close Evidence | Status |
| --- | --- | --- | --- | --- | --- | --- |
| AT1 | Security Agent | Engineering Agent | BLOCKER | Scan original attestation bytes before JSON can discard duplicate keys | Canonical-byte and hidden-token regression | CLOSED |
| AT2 | Claims Review Agent | Engineering Agent | BLOCKER | Bind approval to run/commit and require it before provider execution | Exact approval fields and timestamp mutation tests | CLOSED |
| AT3 | Security Agent | Engineering Agent | BLOCKER | Prevent dirty source, symlink, hardlink, permission, and overwrite attacks | Owner/mode/nlink/clean-tree/exclusive-output checks | CLOSED |
| AT4 | Security Agent | Engineering Agent | BLOCKER | Restrict objects to the producer's owned content-addressed namespace | Exact prefix/assets/manifests validation and traversal tests | CLOSED |
| AT5 | Test Agent | Engineering Agent | BLOCKER | Reject normalized impossible dates and incomplete cleanup | Timestamp round-trip and cleanup mutations | CLOSED |
| AT6 | Claims Review Agent | DevOps Agent | BLOCKER | Never turn attestation presence into claims or release readiness | Collector remains strict-red with valid fixture attestation | CLOSED |

## Result

- Private source is canonical, closed-schema UTF-8 JSON under owner-only storage.
- Redacted output contains one binding hash and no actor, approval ID, task ID, object key, URL, path, payload, log, or error text.
- Release evidence validates raw attestation bytes and commit binding independently.
- `claims_promotion_approval=false`, `claims_eligible=false`, and `release_candidate=false` remain mandatory.

## Next Owner

Architecture and Engineering Agents implement the combined transaction harness in plan mode with fake external boundaries.
