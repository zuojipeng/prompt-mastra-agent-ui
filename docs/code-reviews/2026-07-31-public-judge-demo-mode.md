# Code Review: Public Judge Demo Mode

Date: 2026-07-31

Status: PASS LOCAL / PUBLICATION BLOCKED

## Review Points

1. Exact mode comparison avoids accidental truthy activation.
2. Provenance mode checks the public-demo boundary before configured preview/local URLs.
3. Every exported browser API path used by the workbench returns before fetch in public-demo mode.
4. Project cloud mutations report `unavailable`; browser-local project behavior remains intact.
5. The status copy and Fixture panel explicitly reject live provider/B2 interpretation.
6. The release plan uses a separate static-only project and leaves the private preview and its Access boundary unchanged.

## Adversarial Findings Closed

1. `P1` Pages Functions could be discovered during deployment. Closed by packaging into a separate static directory, excluding `_routes.json`, and rejecting any `functions/` path.
2. `P1` a hostile environment could silently disable fixture mode. Closed by the dedicated build script forcing the exact demo environment before `next build`.
3. `P2` feedback controls implied that judge feedback was recorded. Closed by disabling the controls and stating that the public demo does not collect feedback.
4. `P2` browser coverage did not prove the production package was zero-network. Closed by running desktop and mobile against the packaged static server while rejecting every non-local HTTP(S) request.
5. `P2` deterministic shot durations did not follow the selected target duration. Closed by deriving two equal shots from the target and adding unit coverage for 30, 60, and 90 seconds.

## Residual Risks

- Build artifacts must be staged outside the repository root so Wrangler cannot discover `functions/`.
- A future exported API function could bypass the public-demo guard; the browser zero-request E2E remains a required release gate.
- The deterministic app is weaker evidence than a live B2 judge path and must be paired with the exact approved video qualification.

## Decision

PASS local release candidate. Human publication approval remains required.
