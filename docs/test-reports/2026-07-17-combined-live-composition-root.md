# Test Report: Combined Live Composition Root

Date: 2026-07-17
Result: PASS

- 114 Python spike tests passed after the recovery and proxy fake-IP regressions were added.
- Focused combined transaction, durable approval journal, and failure evidence suites passed.
- Python compileall passed.
- `live_runway_b2_transaction --plan` returned a deterministic no-network plan.
- Injected fake Runway plus in-memory B2 produced the live result schema with one create, verified media/storage digests, complete cleanup, canonical bytes, no URL, and mode 0600.
- The initial offline composition validation made no external API request, B2 mutation, or Runway credit spend; later live evidence is recorded separately below.
- The first frontend test launch used an obsolete Node runtime and failed before tests started; rerunning with the project Node 22 runtime passed 32 focused readiness/attestation/release-evidence tests.
- The first authorized live invocation stopped locally before approval marker publication because the journal path was relative. No provider create occurred. The CLI now resolves the private root before constructing the absolute-path-only journal.
- The next source-bound approval was durably consumed, then Python failed TLS verification before sending an HTTP create. Conservative failure evidence was written and no retry occurred. Setting `SSL_CERT_FILE=/etc/ssl/cert.pem` only in the ignored mode-0600 environment made an unauthenticated stdlib request return the expected 401, matching curl connectivity without disabling verification.
- The renewed paid attempt sent exactly one create. Runway accepted it and deducted 60 credits, but the live root inherited a 30-second fixture deadline and canceled the still-running task once. No retry, media output, B2 asset, or manifest was produced.
- Regression coverage now asserts that the live dependency boundary passes a 600-second total deadline, 100 MiB media ceiling, and the caller's real sleep function; fixture execution keeps its fast deterministic defaults.
- The renewed attempt produced one successful Runway task and consumed 60 credits. Read-only request history showed no cancellation. Exact-host download recovery produced a 1,044,064-byte H.264 1280x720 MP4 of 5.041667 seconds with SHA-256 `ca8ea95388d2e2f943f628ec6ca8bf9386baad8862b54ce26764675fa2b438f6`.
- Proxy fake-IP tests permit only `198.18.0.0/15` for an exact trusted hostname and continue to reject loopback and untrusted hosts. Recovery tests prove `SUCCEEDED` task validation, signed-source exclusion, durable HTTPS B2 URLs, zero provider creates, asset/manifest read-back, exact cleanup, symlink rejection, and local-media preservation.
- The first recovery staging attempt stopped before backend upload because Genblaze rejected the source path outside its allowed temporary roots. The second uploaded/read back/cleaned but rejected the credential-free B2 durable HTTPS URL under an over-broad string scan. Both findings were repaired with temporary staging and structured URL checks; the final B2 recovery passed with complete cleanup and no additional Runway call.
- Final focused frontend verification passed 13 Vitest tests covering the live plan and operator handoff gates.
- Recovery-attestation and release-evidence verification passed 27 focused Vitest tests. A read-only build/evaluate pass against the real private recovery result returned zero errors, the dedicated recovery schema, and `claims_eligible=false` without printing private identifiers.
- Full frontend regression passed 61 suites / 164 tests; ESLint passed with only the existing stale browser-data advisory.
- Claims packet and handoff repair passed 30 focused Vitest tests. Submission and demo draft validators now report `live_claims_promotion_approval` instead of stale live-provider/B2 evidence blockers, and operator handoff derives `claims_promotion` as the sole current stage.
- The first full regression after blocker migration failed 2 assertions that still expected the retired `live_b2_evidence` and `live_b2_upload_readback` blocker names; the assertions were updated to the new human claims gate before the final rerun.
- Claims promotion contract passed 5 focused scope/hash tests and 13 release-evidence tests. The real collector validates packet and attestation hashes, reports zero live-evidence blockers and zero secret findings, but keeps release readiness false because deployment, video publication, and final submission are outside the approval.
- Claims-gate handoff verification passed 21 focused tests and now derives `preview_deployment` after the approved packet artifact is present; removing a blocker can no longer regress the workflow to combined verification.
- The first full regression after claim promotion failed 3 stale assertions that still expected the claims blocker or false live claims. They were updated to require the remaining deployment, recording, public-video, and final-submission gates before the final rerun.
