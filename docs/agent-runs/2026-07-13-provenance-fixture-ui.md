# Agent Run: Provenance Fixture UI

## Goal

Turn the approved provenance contract into an honest, responsive selected-shot experience without implying live provider or B2 capability.

## Loop Board

Loop: 2
Current gate: Test
Decision: SHIP FIXTURE UI, CONTINUE TO LOCAL PYTHON HTTP BOUNDARY

| ID | From | To | Level | Request | Close Evidence | Status |
| --- | --- | --- | --- | --- | --- | --- |
| PF1 | UEAgent | Engineering Agent | BLOCKER | Keep provenance beside the selected shot and cover all states | UE handoff and component | CLOSED |
| PF2 | Code Review Agent | Engineering Agent | BLOCKER | Enforce first-run and retry parent invariants | Negative contract tests | CLOSED |
| PF3 | Product Agent | Engineering Agent | BLOCKER | Show asset and manifest locations, not hashes alone | Browser evidence | CLOSED |
| PF4 | Test Agent | Engineering Agent | BLOCKER | Exercise failure and recovery in a real browser | Desktop/mobile Playwright | CLOSED |
| PF5 | UEAgent | Engineering Agent | REWORK | Prevent the mobile fixed bar from hiding recovery action | Updated mobile screenshot | CLOSED |

## Capability Record

Capability: Selected-shot provenance fixture experience
Agent: UEAgent + Engineering Agent
Tool / Skill / MCP: Team OS UE rules, TypeScript, Vitest, Playwright Chromium and Pixel 5 emulation
Level: C2
Available: yes
Evidence it can provide: state specification, strict request/response validation, deterministic lifecycle, browser interactions, responsive screenshots
Limits: fixture URLs are non-routable; no provider API, B2 write, remote integrity, persistence, authentication, or deployment
Reviewer: Product Agent + Code Review Agent + Test Agent

## Result

- Added versioned request validation with strict parent/attempt lineage.
- Added deterministic queued, running, succeeded, and failed fixture transport.
- Added a standalone desktop panel and unframed mobile inspector section.
- Added verified asset and manifest evidence, explicit fixture disclosure, failure recovery, and retry lineage.
- Kept manual execution status and project persistence unchanged.

## Next Owner

Architecture Agent and Engineering Agent expose the existing deterministic Python Genblaze adapter behind the same contract using a local, credential-free HTTP boundary. Code Review and Test verify malformed payloads, cancellation/timeout behavior, and no secret or network drift.
