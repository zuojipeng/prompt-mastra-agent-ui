# Code Review: Provenance Fixture UI

Reviewer: Product Agent + Code Review Agent + Test Agent
Producer reviewed: UEAgent + Engineering Agent
Decision: PASS FOR FIXTURE UI

## Strongest Rejection Reason

A polished fixture could be mistaken for live B2 evidence or could silently lose retry provenance while appearing verified.

## Findings

1. P1, closed: submission requests initially allowed attempt 1 with a parent or later attempts without one. The boundary now enforces both directions and has negative tests.
2. P1, closed: the first panel showed hashes but not asset and manifest locations. Both locations are now inspectable and fixture-only origins remain explicit.
3. P1, closed: failure rendering existed only as component code. The browser flow now enters a provider timeout, shows a recoverable alert, retries, and preserves the failed run as parent.
4. P1, closed: the mobile fixed action bar obscured the secondary recovery command in screenshot review. Recovery now precedes the dominant retry action and both are visible.
5. P2, accepted: provenance runs are intentionally session-only. Persisting fixture evidence would blur the boundary with live project evidence.
6. P2, accepted: the browser owns fixture timing in this slice. Cancellation and transport timeouts belong to the local HTTP adapter slice.

## Evidence Checked

- UE state, responsive, and accessibility handoff.
- Request and response fail-closed tests.
- No `fetch`, credential, Worker, or project schema change in fixture transport.
- Desktop and Pixel 5 success, failure, recovery, lineage, and screenshots.
- Full frontend, Python spike, type, lint, and production build regression.

## Residual Risk

Live provider execution, B2 durability, remote-byte digest verification, auth, persistence, service timeout, deployment, and production observability remain unproven.
