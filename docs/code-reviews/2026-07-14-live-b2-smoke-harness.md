# Code Review: Guarded Live B2 Smoke Harness

Reviewer: Code Review Agent + Test Agent + DevOps Agent
Producer reviewed: Architecture Agent + Engineering Agent
Decision: PASS FOR OFFLINE HARNESS READINESS

## Strongest Rejection Reason

A smoke tool could accidentally perform network I/O, mutate shared bucket settings, leave probe objects behind, or print credentials while being described as safe.

## Findings

1. P1, closed: live I/O requires both `--live` and exact `JINGCI_ALLOW_LIVE_B2_SMOKE=YES`; plan mode needs no configuration.
2. P1, closed: preflight is enabled for live verification, while lifecycle mutation remains disabled.
3. P1, closed: upload ownership is recorded immediately after `put`, so abnormal returned keys and visibility failures still enter cleanup.
4. P1, closed: digest mismatch, abnormal put result, cleanup, absence confirmation, and close are covered independently.
5. P1, closed: a cleanup failure now identifies only the random object key for manual recovery; bucket and credential values remain absent.
6. P2, accepted: the direct object smoke does not run the whole Genblaze pipeline. That is C-013 rather than hidden scope in this harness.

## Residual Risk

No real account behavior is proven until an authorized operator supplies bucket-scoped credentials and runs `--live`. Network errors may still leave an object when B2 denies deletion; the reported random key is the recovery handle.
