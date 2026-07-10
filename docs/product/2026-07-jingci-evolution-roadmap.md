# Jingci Product Evolution Roadmap

Date: 2026-07-10
Owner: Product Agent
Reviewers: UEAgent, Architecture Agent, Test Agent, Hermes Orchestrator
Horizon: July 2026 through 2027 H1

## Strategic Thesis

Jingci should become the operating workspace between a video idea and a publishable, learnable production result.

It should not compete as:
- a generic prompt improver
- a chat wrapper
- a catalog of model launch buttons
- a full video editor

Its durable advantage should be the structured context that model providers do not own:

```text
Creative intent
  -> DirectorKit plan
  -> shot execution evidence
  -> platform calibration
  -> audience feedback
  -> next project iteration
```

The product becomes more valuable as it remembers why a shot was designed, what was actually generated, where it was published, what failed, and what the creator should change next.

## Current Product Shape

Jingci already provides the foundation of a projectized AI video workbench:
- creative diagnosis and structured prompt reconstruction
- DirectorKit shot plans and platform guidance
- shot status, result notes, and handoff acceptance
- platform calibration evidence and feedback-derived next actions
- local/cloud project summaries, iterations, dashboard filters, and exports
- automated source, unit, build, desktop, and mobile browser evidence

The current constraint is no longer feature absence. It is continuity depth: the project summary can say a handoff is blocked, but cannot yet explain every missing item; cloud project persistence does not yet carry the full derived handoff model; and the main UI coordinator still owns too many concerns.

## North Star And Metrics

North-star behavior: a creator reopens a project, completes the next useful production action, and records evidence that improves the next iteration.

Primary metrics:
- time from idea to first executable DirectorKit
- percentage of projects reaching handoff-ready state
- median time from DirectorKit creation to first completed shot
- percentage of completed shots with usable result evidence
- percentage of projects that close the feedback-to-next-iteration loop
- 30-day project reopen and template reuse rate

Guardrail metrics:
- generation or provider cost per handoff-ready project
- failed sync and unrecoverable project rate
- manual corrections per DirectorKit
- browser-flow regression rate

Do not optimize for prompt count, panel count, or generated text volume.

## Evolution Stages

### Stage 1: Trustworthy Handoff (July-August 2026)

Goal: make every project understandable and recoverable by a creator or operator who did not produce it.

Ship:
- explicit `handoffBlockingReasons` in local and cloud summaries
- row-level dashboard guidance that names the next missing evidence
- Projects API parity for execution, calibration, iteration, and handoff summaries
- production smoke and rollback evidence for Projects API
- contract alignment for duration and target-type options
- first bounded extraction from `ChatBox`: project coordination state before visual decomposition

Exit criteria:
- a blocked project explains what to fix without opening every shot
- local and cloud summaries agree after round-trip persistence
- production Projects API has E5 smoke evidence
- no extraction changes generation behavior

### Stage 2: Shot Production Hub (Q3 2026)

Goal: move from planning shots to managing real outputs.

Ship:
- per-shot attempts and selected result
- asset links, provider/model metadata, cost, duration, and failure reason
- compare attempts without losing the approved shot intent
- provider-neutral execution contract
- manual import first; one approved provider adapter only after the contract is stable

Exit criteria:
- a creator can explain which attempt became the selected result and why
- failed attempts are reusable feedback rather than discarded text
- provider integration is replaceable without changing the DirectorKit domain

### Stage 3: Publish And Learning Loop (Q4 2026)

Goal: turn platform response into a disciplined creative experiment.

Ship:
- publish records per platform and version
- outcome capture for qualitative and quantitative signals
- hypothesis, changed variable, and expected outcome for each iteration
- comparable experiment history across versions
- evidence-based next action with confidence and sample-size limits

Exit criteria:
- a user can trace a recommendation back to shots, versions, and platform evidence
- the product never presents low-sample correlation as causal certainty
- at least one end-to-end project reaches idea -> publish -> feedback -> revised iteration

### Stage 4: Reusable Creative Operations (2027 Q1)

Goal: let individuals and small teams reuse successful production knowledge.

Ship:
- project templates and reusable DirectorKit patterns
- role-aware handoff for director, operator, reviewer, and client
- approvals, comments, and immutable delivery snapshots
- portfolio-level search across shots, failures, and platform learnings
- private-by-default project controls before collaboration expands

Exit criteria:
- a second creator can continue a project from its evidence packet
- reusable patterns reduce time to a handoff-ready package
- access and audit behavior are explicit before team sharing

### Stage 5: Agentic Creative Studio (2027 Q2)

Goal: let specialized Agents propose and execute bounded production loops while the human keeps creative and commercial authority.

Ship:
- Product/Director Agent proposes the next experiment
- Execution Agent prepares shot jobs within approved provider and budget limits
- Review Agent checks visual continuity and evidence completeness
- Operator Agent prepares publish packages and reports
- human approval for spend, publishing, rights-sensitive assets, and final creative acceptance

Exit criteria:
- every autonomous action is attributable, reversible, budget-bounded, and reviewed
- Agents improve cycle time without lowering handoff or test confidence
- the system can explain why it chose the next action

## Architecture Direction

Preserve five explicit domain boundaries:

```text
Project Workspace
  -> DirectorKit
  -> Shot Execution
  -> Platform Calibration
  -> Feedback And Iteration
```

Rules:
- derive summaries from validated domain records, not duplicated UI booleans
- keep external provider payloads behind adapters
- add a service or state framework only after a pure domain extraction cannot contain the pressure
- extract `ChatBox` in behavior-preserving slices: project coordination, generation orchestration, then view composition
- require migration, rollback, and compatibility notes for persisted project changes

## Hackathon Asset Strategy

Jingci is also the first reusable competition asset for Agent Team OS. Do not fork a new product for every event. Create track-specific demonstrations on top of the same core:
- AI/creator track: evidence-driven AI video production workspace
- agent track: bounded multi-Agent DirectorKit-to-publish workflow
- developer-tool track: provider-neutral execution and evaluation contract
- future-of-work track: auditable creative handoff between human and AI operators

Each competition variant must add one rule-compliant feature during the event, keep prior work disclosed, and return reusable improvements to the main product only after normal review.

## Next Three Delivery Slices

1. Add handoff blocking reasons to project summaries and dashboard rows.
2. Return the same handoff summary from the Projects API and verify local/cloud parity.
3. Extract project coordination from `ChatBox` behind tests without a visual rewrite.

These slices finish Stage 1 before new provider or collaboration features begin.
