# Code Review: Combined Live Composition Root

Date: 2026-07-17
Verdict: PASS FOR HUMAN-GATED LIVE ATTEMPT

Reviewed boundaries:

- plan mode remains credential-free and network-free;
- live mode requires a clean commit and canonical active approval bound to run and commit;
- project-level `may_use_paid_api=true` and an exact `$0.60` campaign cap are required independently of the one-shot approval;
- approval consumption is durable and occurs immediately before the sole provider create;
- approval and result paths reject symlinks, hard links, unsafe modes, ownership mismatch, oversize input, and collisions;
- provider retries remain disabled and output hosts remain exact allowlists;
- B2 writes are limited to one generated prefix and cleanup names exact owned keys;
- success evidence is canonical mode 0600 and failure evidence remains non-attestable.

Findings repaired during review: live result collision was initially detected after execution; approval file type was initially under-validated; consumed failures initially lacked automatic conservative evidence. All were moved or connected before approval.

Live preflight repair: the first authorized invocation stopped before durable marker publication or provider delegation because the CLI passed a relative journal path into the absolute-path-only private store. The private root is now resolved before journal construction. No provider create or credits were consumed by that stopped invocation.

Residual operational risk: the exact Runway CDN host can only be confirmed by the first successful task response. A host mismatch stops download and consumes the one-shot approval; it does not retry or widen the allowlist automatically.

## Paid Attempt Incident Review

Finding: `_run_live_dependencies` reused `_run_runway_b2_transaction` without overriding fixture defaults. The live task therefore had a 30-second total deadline, a 1 MiB output ceiling, and a no-op sleep. Runway accepted and charged the task, but the client canceled it before completion.

Repair: live policy is now explicit at the live boundary: 600-second deadline, 100 MiB output ceiling, and real `time.sleep`. Offline callers retain deterministic fast defaults. A regression test inspects the exact arguments crossing this boundary. Verdict remains blocked for another paid attempt until a new one-shot human authorization is supplied.
