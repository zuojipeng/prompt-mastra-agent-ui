# Jingci Agent Team OKR Cascade

Project: Jingci AI Video Prompt Workbench
Cycle: 2026 product operating plan, Q3 execution focus, July implementation cycle
Hermes owner: Hermes Orchestrator
Primary slice: Project Workbench shell

## North Star

Help creators turn a short-video idea into a reusable DirectorKit project, execute shots, learn from feedback, and iterate without losing context.

## 2026 Annual Direction

Jingci should become a projectized AI video creation workbench:
- not a one-off prompt optimizer
- not a generic chat UI
- not a feature pile

The product should own the loop:

```text
Idea -> Diagnosis -> DirectorKit -> Shot execution -> Platform feed -> Feedback insight -> Next iteration
```

## Q3 2026 Objectives

### O1: Make projectized creation the default product shape.

Key results:
- KR1: A user can create, reopen, and continue at least 12 local/cloud project workspaces.
- KR2: The main UI exposes active project, stage, sync state, DirectorKit status, and next action without help text.
- KR3: Project workspace shell has desktop and mobile validation evidence.

### O2: Close the DirectorKit-to-feedback loop.

Key results:
- KR1: Each DirectorKit project can track shot execution status and notes.
- KR2: Feedback insight can identify weak platform, risk, or failure dimensions for the next iteration.
- KR3: The product exposes at least one next-iteration action informed by feedback evidence.

### O3: Make release and quality evidence routine.

Key results:
- KR1: Frontend slices include code review, test report, and browser or targeted test evidence when UI changes.
- KR2: Backend Projects API production smoke passes for `/api/projects` list/save/get/delete.
- KR3: Task ledger records active tasks, owner, reviewer, evidence level, blocker, and next action for every meaningful slice.

## July 2026 Objectives

### O1: Ship Project Workbench shell.

Key results:
- KR1: Architecture note identifies current boundaries and the smallest UI shell slice.
- KR2: UI implementation adds project header, stage navigation, sync state, and next-action region without changing generation behavior.
- KR3: Unit/component or E2E evidence covers project shell states.

### O2: Stabilize cloud project continuity.

Key results:
- KR1: Production Projects API release blocker is either resolved with E5 smoke evidence or explicitly escalated with owner action.
- KR2: UI clearly distinguishes local-only, syncing, synced, and failed cloud states.

### O3: Keep Agent Team OS operating as a real delivery team.

Key results:
- KR1: Each weekly loop updates `docs/team-os/task-ledger.md`.
- KR2: Each implementation loop produces agent run, review, and test artifacts.
- KR3: Repeated lessons are promoted to Team OS only when they are reusable beyond Jingci.

## Current Month Slice

Slice: `Project Workbench shell`

Scope:
- Use existing `ChatBox` state and existing extracted panels.
- Add or extract only the layout/state boundary needed to make the shell readable.
- Do not rewrite the generation flow.
- Do not expose Agent Team OS language in the user-facing UI.

Acceptance criteria:
- User can identify active project and stage at first glance.
- User can tell whether the project is local, syncing, synced, or cloud-blocked.
- DirectorKit and feedback summary have clear regions.
- Mobile exposes the primary next action.
- Tests and browser evidence are captured after code implementation.

## Agent OKRs

### Product Agent

Objective: Keep the product focused on projectized short-video creation.

Key results:
- Define user job and non-goals for every new visible workflow.
- Reject features that do not strengthen the creation-to-feedback loop.
- Convert product claims into testable acceptance criteria.

### UEAgent

Objective: Make the workbench feel like a professional production console.

Key results:
- Maintain IA, state matrix, mobile behavior, and accessibility notes before UI implementation.
- Keep one primary action per stage.
- Prevent Team OS process language from leaking into the end-user product.

### Architecture Agent

Objective: Reduce `ChatBox` pressure without adding premature architecture.

Key results:
- Identify shell, workspace, DirectorKit, feedback, and release boundaries.
- Recommend one reversible extraction per implementation loop.
- Document rejected abstractions before code changes.

### Engineering Agent

Objective: Implement the Project Workbench shell in small, tested slices.

Key results:
- Preserve existing generation and persistence behavior.
- Avoid broad rewrites.
- Add tests around new derived shell state or visible UI behavior.

### Code Review Agent

Objective: Block regressions and over-design.

Key results:
- Review diffs for behavior changes outside scope.
- Require file/line findings for blockers.
- Reject wrappers or abstractions that do not remove real complexity.

### Test Agent

Objective: Make acceptance criteria provable.

Key results:
- Map project shell states to test cases.
- Run targeted unit/component/E2E validation.
- Require browser evidence for user-facing UI changes.

### DevOps Agent

Objective: Make production continuity verifiable.

Key results:
- Resolve or escalate the Projects API production release blocker.
- Maintain smoke and rollback evidence.
- Avoid production deploy claims without E5 evidence.

### Operator Agent

Objective: Keep demos and handoff honest.

Key results:
- Update demo path after shell implementation.
- Document known limitations.
- Summarize what is shipped versus planned.

## Non-Goals

- Full rewrite of the frontend.
- Public Agent Team OS dashboard inside Jingci user UI.
- New billing, auth, or collaboration system.
- Full production deploy without explicit credentials and smoke evidence.

## Loop Board

| ID | From | To | Blocking Level | Request | Evidence Required | Status |
| --- | --- | --- | --- | --- | --- | --- |
| OKR-1 | Hermes | Architecture Agent | REWORK | Map Workbench shell boundaries before coding | E2 architecture note with current file references and next implementation slice | OPEN |
| OKR-2 | DevOps Agent | Human/Codex environment | BLOCKER | Enable non-interactive Cloudflare deploy or run release command manually | E5 production Projects API smoke | OPEN |
| OKR-3 | Test Agent | Engineering Agent | IMPROVEMENT | Add validation for Project Workbench shell after implementation | E3 tests plus browser evidence | PENDING |

## Hermes Decision

Decision: CONTINUE

Evidence:
- E2 `docs/design/project-workbench-v4/README.md`
- E2 current code boundary read from `app/components/ChatBox.tsx`, `lib/project-workspace.ts`, and `lib/project-api-client.ts`
- E2 this OKR cascade

Next owner: Architecture Agent
