# Agent Run: Provenance Local Browser E2E

## Goal

Prove that the selected-shot UI can call the real loopback Python adapter from a browser and render its verified memory-backed asset and manifest evidence.

## Loop Board

Loop: 5
Current gate: Test / Ops
Decision: SHIP LOCAL INTEGRATION EVIDENCE, ESCALATE LIVE B2 GATE

| ID | From | To | Level | Request | Close Evidence | Status |
| --- | --- | --- | --- | --- | --- | --- |
| PB1 | Test Agent | Engineering Agent | BLOCKER | Start Python and Next.js through one repeatable test entrypoint | Dedicated Playwright config and npm command | CLOSED |
| PB2 | Code Review Agent | Test Agent | BLOCKER | Prove the response is real HTTP, not only rendered copy | Browser response status and payload assertions | CLOSED |
| PB3 | UEAgent | Test Agent | REWORK | Cover the selected-shot panel on desktop and mobile | Two passing projects and screenshots | CLOSED |
| PB4 | DevOps Agent | Test Agent | BLOCKER | Prevent an unrelated existing local process from satisfying the test | Both web servers disable process reuse | CLOSED |
| PB5 | Claims Review Agent | Hermes | BLOCKER | Keep memory evidence separate from B2 claims | Explicit local labels and residual-risk record | CLOSED |

## Result

- Added a two-process Playwright configuration for the Python adapter and Next.js.
- Added a dedicated npm entrypoint that runs only the local integration scenario.
- Verified the browser POST response, provider identity, asset URI, manifest URI, and verified flag.
- Verified the selected-shot panel on desktop and mobile Chromium.
- Preserved the default Fixture regression path and did not authorize B2 credentials or deployment.

## Next Owner

Human owner and DevOps Agent must close account/terms and credential gates before C-008 can run. Until then, the campaign has reached the strongest credential-free evidence available.
