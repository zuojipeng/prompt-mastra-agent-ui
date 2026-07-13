# Code Review: Provenance Local Browser E2E

Reviewer: Code Review Agent + Test Agent + DevOps Agent
Producer reviewed: Engineering Agent
Decision: PASS FOR CREDENTIAL-FREE LOCAL INTEGRATION

## Strongest Rejection Reason

A polished UI screenshot could falsely suggest the browser crossed the Python boundary, while a reused process or mocked response actually supplied the result.

## Findings

1. P1, closed: the test now waits for the real `POST /v1/provenance-runs` response and checks status, provider, memory asset, memory manifest, and verification.
2. P1, closed: both configured web servers use `reuseExistingServer: false`, so an unknown service cannot satisfy the gate.
3. P1, closed: the initial run used Node 18.12.1 and failed before Next.js startup. The rerun fixed the execution PATH to Node 22.21.1 and passed both browser projects.
4. P2, accepted: the command requires a Python environment with `requirements.txt` installed. `PROVENANCE_PYTHON` makes that dependency explicit.
5. P2, accepted: mobile evidence lives in a scrollable inspector. Browser assertions prove the complete state while the screenshot records the visible selected-shot surface.

## Residual Risk

This does not prove a generation provider, Backblaze B2 upload/read-back, authentication, deployment, production CORS, cost behavior, or public submission readiness. Those claims remain blocked behind C-003 and C-008.
