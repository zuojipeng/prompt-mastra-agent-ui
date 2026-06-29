# Agent Run: Project Workbench V4 Planning

Date: 2026-06-29
Owner: Hermes Orchestrator
Scope: connect Agent Team OS trust protocols to Jingci and define the next projectized workbench slice.

## Capability Register

| Agent | Tool / Skill / MCP | Level | Available | Evidence it can provide | Limits | Reviewer |
| --- | --- | --- | --- | --- | --- | --- |
| Hermes Orchestrator | Agent Team OS docs | C1 | yes | E2 routing and gate decision | no production deploy authority | Human owner |
| Product Agent | project docs and prior design pack | C1 | yes | E2 user job and scope | no live analytics read | UEAgent + Test Agent |
| UEAgent | UE principles, V3 design pack | C1 | yes | E2 IA/state matrix/spec | no new Figma artifact | Product Agent + Test Agent |
| Architecture Agent | repo inspection | C1 | deferred | E2 boundary decision next loop | no code read in this slice beyond docs | Code Review Agent |
| Test Agent | `git diff --check` | C2 | yes | E3 doc diff validation | no browser evidence for docs-only slice | Hermes |

## Evidence Index

| Evidence ID | Claim | Level | Source / Command / Tool | Result | Owner | Reviewer |
| --- | --- | --- | --- | --- | --- | --- |
| EV-JC-001 | V3 design pack already defines workbench baseline | E2 | `docs/design/jingci-workbench-v3/*` | Reused for v4 planning | UEAgent | Product Agent |
| EV-JC-002 | Project task ledger now exists | E2 | `docs/team-os/task-ledger.md` | Added | Hermes | Test Agent |
| EV-JC-003 | V4 design spec defines next implementation slice | E2 | `docs/design/project-workbench-v4/README.md` | Added | UEAgent | Product Agent + Test Agent |
| EV-JC-004 | Docs diff has no whitespace errors | E3 | `git diff --check` | PASS | Test Agent | Hermes |

## Loop Board

Loop: 1
Goal: make Jingci resumable under Agent Team OS and define the next product/UI slice.
Current gate: UE
Decision: CONTINUE

| ID | From | To | Blocking Level | Request | Evidence Required | Status |
| --- | --- | --- | --- | --- | --- | --- |
| L1 | Hermes | UEAgent | REWORK | Convert V3 workbench direction into a projectized v4 shell slice | E2 design spec with states and next implementation slice | CLOSED |
| L2 | UEAgent | Architecture Agent | IMPROVEMENT | Map current frontend component boundaries before coding shell | Architecture note referencing current files | OPEN |
| L3 | Test Agent | Engineering Agent | IMPROVEMENT | Add UI validation after shell implementation | Component/E2E evidence and browser screenshot | OPEN |

## Product Agent

Status: PASS
Output: The next product upgrade should focus on projectized creation orientation, not more result-panel accumulation.
Assignments raised: Architecture Agent should preserve the current generation flow while improving workspace shell clarity.

## UEAgent

Status: PASS
Output: Added Project Workbench V4 spec with primary path, IA, stage model, state matrix, visual direction, and next slice.
Assignments raised: Architecture Agent must map `ChatBox`, project persistence, DirectorKit, and feedback regions before implementation.

## Architecture Agent

Status: PENDING
Output: Not executed in this docs-first slice.
Assignments raised: Next loop should produce an architecture note for the smallest shell implementation slice.

## Engineering Agent

Status: PENDING
Output: No production code changed.
Assignments raised: Wait for architecture note before implementation.

## Code Review Agent

Status: PASS
Output: Planning docs are scoped and do not claim shipped UI behavior.
Assignments raised: None.

## Test Agent

Status: PASS
Output: Docs-only validation uses `git diff --check`; implementation validation is deferred until code changes.
Assignments raised: Engineering must provide browser/component evidence after UI shell work.

## DevOps Agent

Status: BLOCKED
Output: Production Projects API release remains a separate blocker tracked in the task ledger.
Assignments raised: Human owner or environment must provide non-interactive Cloudflare deploy capability for Codex-led deploys.

## Operator Agent

Status: PASS
Output: Next action is clear for future heartbeat runs: architecture note before UI coding.
Assignments raised: None.

## Hermes Decision

Decision: CONTINUE
Next owner: Architecture Agent
Next smallest action: inspect current frontend component/module boundaries and write an architecture note for implementing the Project Workbench shell.
Task ledger update: `docs/team-os/task-ledger.md`
Residual risk: No browser/Figma evidence yet; this slice intentionally stops at planning and continuity.
