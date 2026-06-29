# Project Workbench V4 Design Spec

Date: 2026-06-29
Owner: UEAgent
Reviewers: Product Agent, Test Agent, Architecture Agent
Mode: Agent Team OS UE redesign and planning slice

## Product Decision

Jingci should present itself as a projectized AI video creation workbench, not as a prompt form with accumulated result panels.

The primary user job:

```text
When I have a short-video idea,
I want to turn it into a reusable project with DirectorKit shots, execution status, platform-ready prompts, and feedback insight,
so I can iterate toward a better publishable video instead of losing context between generations.
```

## Scope

This planning slice upgrades the design direction and creates a concrete next implementation target.

In scope:
- project context as the first orientation layer
- stage-based creation workflow
- DirectorKit execution as the central work surface
- feedback insight as evidence for the next iteration
- explicit states for local/cloud sync and production API gaps
- a small engineering slice for the next loop

Out of scope:
- changing model generation behavior
- adding public Team OS UI to the product
- solving Cloudflare deploy credentials inside the frontend
- implementing the full redesign in one pass

## Primary Path

```text
Open app
  -> choose or create project
  -> see current project stage and latest DirectorKit status
  -> inspect or generate DirectorKit
  -> work through shots
  -> copy platform-ready prompts
  -> record feedback or review insight
  -> start next iteration from evidence
```

The UI should always answer:
- Which project am I in?
- Which stage am I in?
- What is the next useful action?
- What evidence do I have from previous outputs?
- Is this saved locally, synced to cloud, or blocked?

## Information Architecture

Desktop layout:

```text
Top Bar
  Project name / sync state / export / settings

Left Rail
  Project switcher
  Stage navigation
  Project brief
  Recent versions

Center Work Surface
  Stage-specific workspace
  DirectorKit shots
  selected shot detail
  platform prompt content

Right Rail
  next action
  execution checklist
  feedback insight
  risk and quality flags
  copy/export controls
```

Mobile layout:

```text
Top project header
Stage segmented control
Single work surface tab
Bottom action sheet for next action and copy/export
Project drawer for project list and versions
```

## Stage Model

| Stage | Purpose | Primary Action | Evidence |
| --- | --- | --- | --- |
| Idea | Capture source intent and constraints | Generate / refine input | source prompt, target platform, duration |
| Diagnosis | Show prompt risks and direction | Select improvement direction | risk flags, score, recommendation |
| DirectorKit | Produce reusable execution package | Inspect shots and copy prompts | shots, master prompt, platform advice |
| Execution | Track shot-by-shot progress | Mark shot status and notes | shot status, notes, result links |
| Feedback | Learn from reaction data | Apply insight to next iteration | likes/dislikes, failure reasons, quality flags |
| Archive | Preserve reusable project state | Export snapshot | version history, copied package |

## State Matrix

| Region | Empty | Loading | Success | Error | Partial / Blocked |
| --- | --- | --- | --- | --- | --- |
| Project Switcher | Empty project prompt | Loading local and cloud projects | Project list with active item | Local read error with recovery | Cloud unavailable but local projects visible |
| Sync State | Local only | Syncing | Cloud synced | Sync failed with retry | Backend Projects API 404 blocks cloud state |
| Stage Navigation | Idea active | Stage shows busy state | Completed stages show check state | Blocked stage explains reason | Future stages muted until prerequisite exists |
| DirectorKit Surface | No kit yet | Skeleton shots | Shots, prompts, advice visible | Generation failed with retry | Missing shot fields show fallback warnings |
| Execution Panel | Select shot hint | Saving status | Saved note/status | Save failed, local fallback kept | Cloud sync pending |
| Feedback Insight | No feedback yet | Loading insight | Recommendation and dimensions visible | Non-blocking analytics error | Sample too small warning |
| Export | Disabled before kit | Copy in progress | Copied / downloaded | Clipboard fallback | Partial export warns what is missing |

## Visual Direction

The product should feel like a focused production console:
- restrained density, not a marketing page
- clear stage hierarchy over decorative cards
- compact panels with 8px or smaller radii
- status chips for sync, stage, risk, and evidence
- one primary action per stage
- neutral foundation with restrained accent colors for status only

Avoid:
- nested cards
- large hero areas
- purple-gradient SaaS styling
- visible process text about Agent Team OS in end-user UI
- instructional copy that compensates for unclear controls

## Next Implementation Slice

Slice: `Project workbench shell`

Goal:
Turn the current project dashboard/workbench surface into a clearer project-oriented shell without changing generation behavior.

Expected user-visible changes:
- project header with title, stage, sync status, and primary next action
- stage navigation aligned to Idea / DirectorKit / Execution / Feedback / Archive
- right-side or bottom next-action region that shows DirectorKit and feedback summary
- empty/loading/error states for project and sync

Architecture boundaries to inspect before coding:
- current `ChatBox` responsibility
- project local persistence
- `lib/project-api-client.ts`
- feedback analytics client
- DirectorKit rendering/components

Acceptance criteria:
- User can identify active project and stage without reading help text.
- User can see whether project state is local, syncing, synced, or blocked.
- DirectorKit and feedback summary have a clear home in the shell.
- Mobile does not hide the primary next action.
- Existing tests still pass; new UI behavior has at least targeted component or E2E coverage.

## Capability Register

| Agent | Tool / Skill / MCP | Level | Available | Evidence it can provide | Limits | Reviewer |
| --- | --- | --- | --- | --- | --- | --- |
| Product Agent | project docs and existing PRD/design docs | C1 | yes | E2 product direction | no live user analytics | Hermes |
| UEAgent | Team OS UE principles and existing design pack | C1 | yes | E2 IA/state matrix | no fresh Figma artifact yet | Product Agent + Test Agent |
| Architecture Agent | repo inspection, ADR template | C1/C2 next loop | pending | E2/E3 boundary decision | not executed in this slice | Code Review Agent |
| Test Agent | existing test scripts and future Playwright/browser evidence | C2 next loop | pending | E3 validation | docs-only slice now | Hermes |

## Adversarial Review

Reviewer: Product Agent + Test Agent
Producer reviewed: UEAgent
Scope: Project Workbench V4 design plan
Strongest rejection reason: The plan could become another large redesign if Engineering does not reduce it to a shell slice.
Evidence checked: Existing V3 design pack, current cloud sync release blocker, Team OS evidence rules.
Findings:
- No blocker for planning.
- Implementation must start with shell orientation and sync states, not a full visual rewrite.
- Team OS task/evidence concepts should stay in internal docs, not in the user-facing creation UI.
Blocking level: PASS
Required repair: Architecture Agent must map current component boundaries before coding.
Owner: Architecture Agent
Close condition: next run produces architecture note for the smallest shell implementation slice.
Residual risk: No browser screenshot exists yet because this slice is design/documentation only.
