# Test Report: Combined Live Composition Root

Date: 2026-07-17
Result: PASS

- 109 Python spike tests passed.
- Focused combined transaction, durable approval journal, and failure evidence suites passed.
- Python compileall passed.
- `live_runway_b2_transaction --plan` returned a deterministic no-network plan.
- Injected fake Runway plus in-memory B2 produced the live result schema with one create, verified media/storage digests, complete cleanup, canonical bytes, no URL, and mode 0600.
- No external API request, B2 mutation, or Runway credit spend occurred.
- The first frontend test launch used an obsolete Node runtime and failed before tests started; rerunning with the project Node 22 runtime passed 32 focused readiness/attestation/release-evidence tests.
