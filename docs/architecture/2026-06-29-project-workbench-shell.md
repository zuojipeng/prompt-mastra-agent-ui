# Architecture Review: Project Workbench Shell

Date: 2026-06-29
Owner: Architecture Agent
Reviewers: Engineering Agent, Code Review Agent, Test Agent
Scope: smallest sufficient boundary for Project Workbench V4 shell implementation.

## Current Design Reading

The frontend already has several useful domain modules and extracted panels:

- `lib/project-workspace.ts` owns local project persistence, schema validation, project summaries, and workspace library limits.
- `lib/project-api-client.ts` owns cloud project sync/list/get/delete over the backend Projects API.
- `lib/director-kit-contract.ts` owns DirectorKit data contracts.
- `lib/director-kit-export.ts` owns export builders for shot prompts, execution checklist, project snapshot, and platform feed pack.
- `app/components/ProjectDashboardPanel.tsx` owns searchable/filterable project dashboard UI.
- `app/components/DirectorKitExecutionPanel.tsx` owns execution summary UI.
- `app/components/FeedbackInsightPanel.tsx` owns feedback analytics display.

`app/components/ChatBox.tsx` is still the main orchestration surface. It currently owns:
- input and legacy prompt/result state
- DirectorKit generation state
- project workspace state and local/cloud sync state
- feedback submission and analytics state
- history state
- workbench layout, project rail, mobile tabs, operations rail
- handlers for copy/export, shot status, project persistence, and feedback

This is workable for current behavior, but it creates pressure before the Project Workbench shell implementation because layout, workflow state, persistence, and side effects are mixed in one component.

## Complexity Hotspots

### Hotspot 1: `ChatBox` mixes derived shell state with side effects.

Examples:
- stage items and current stage are derived near the render body.
- workspace status labels and cloud sync labels are derived near layout code.
- project summary merge logic lives inside `ChatBox`.

Impact:
- The shell UI is hard to test without rendering the full component.
- Small layout changes risk touching persistence/generation behavior.

### Hotspot 2: product stages differ from persisted workspace stages.

Current persisted stages:

```ts
'input' | 'diagnosis' | 'reconstruct' | 'result'
```

Workbench V4 product stages:

```text
Idea / Diagnosis / DirectorKit / Execution / Feedback / Archive
```

Impact:
- We should not migrate storage just to display V4 stage labels.
- The next slice should use a view-model mapping layer, not change persistence.

### Hotspot 3: project sync failures are stateful but not domain-modeled.

Current UI uses:

```ts
'idle' | 'syncing' | 'synced' | 'error'
```

Impact:
- Good enough for UI, but the shell should centralize label/tone/blocked-copy derivation so the wording stays consistent.

## Smallest Sufficient Design

Do not introduce a full state manager, repository class, or app-wide shell framework.

Instead, add one small domain/view helper and one presentational shell component in the next implementation loop:

```text
lib/workbench-shell.ts
  deriveWorkbenchStage(...)
  deriveProjectSyncDisplay(...)
  deriveProjectShellSummary(...)

app/components/ProjectWorkbenchShell.tsx
  receives derived shell props
  renders project header, stage navigation, and next-action summary
```

Keep `ChatBox` as the orchestrator for now:
- it owns side effects
- it owns generation handlers
- it passes existing state into the shell
- it keeps existing DirectorKit panels in place

This creates a testable boundary without forcing a risky rewrite.

## Proposed Data Contracts

### WorkbenchStage

```ts
type WorkbenchStageId =
  | 'idea'
  | 'diagnosis'
  | 'directorKit'
  | 'execution'
  | 'feedback'
  | 'archive';

type WorkbenchStage = {
  id: WorkbenchStageId;
  label: string;
  done: boolean;
  active: boolean;
  blocked?: boolean;
  value?: string;
};
```

### ProjectSyncDisplay

```ts
type ProjectSyncDisplay = {
  label: string;
  tone: 'neutral' | 'loading' | 'success' | 'warning' | 'error';
  blocked: boolean;
};
```

### ProjectShellSummary

```ts
type ProjectShellSummary = {
  title: string;
  stageLabel: string;
  targetDuration: string;
  targetTypeLabel: string;
  shotProgressLabel: string;
  healthLabel: string;
  primaryActionLabel: string;
  primaryActionDisabled: boolean;
};
```

## Next Implementation Slice

Slice: `Project workbench shell state`

Files likely touched:
- `lib/workbench-shell.ts` new
- `__tests__/workbench-shell.test.ts` new
- `app/components/ProjectWorkbenchShell.tsx` new or staged component
- `app/components/ChatBox.tsx` minimal integration only

Implementation order:
1. Add `lib/workbench-shell.ts` with pure derivation functions.
2. Add tests for stage mapping, sync display, and primary action label.
3. Add `ProjectWorkbenchShell` only if the pure functions are stable.
4. Replace the current top summary/stage block in `ChatBox` with the shell component.
5. Run unit tests, lint/typecheck, then browser evidence.

## Rejected Alternatives

### Extract a full `useProjectWorkspace` hook now.

Rejected for this slice. It may be useful later, but the current pressure is shell clarity, not side-effect reuse. Extracting the hook now would touch persistence, cloud sync, and restore behavior in one step.

### Add Zustand/Redux or a global state machine.

Rejected. Existing state is local to one workbench surface, and current test pressure can be handled with pure derivation functions.

### Migrate persisted stage schema to V4 stages.

Rejected. This would introduce storage migration risk without improving the immediate user experience. Use view mapping first.

### Rewrite `ChatBox` into separate pages.

Rejected. Too broad for the current monthly slice and likely to create regressions in generation, feedback, and export behavior.

## Test Implications

Required in the implementation loop:
- unit tests for `deriveWorkbenchStage`
- unit tests for sync display label/tone
- unit tests for project shell summary primary action
- existing `npm test`
- `npm run lint` or project equivalent
- browser screenshot or Playwright evidence after visible UI change

## Migration / Rollback

Migration:
- No storage migration.
- No backend API change.
- No generation behavior change.

Rollback:
- Revert the shell component integration.
- Keep pure derivation tests if still useful, or revert them with the slice.

## Decision

CONTINUE.

The next owner is Engineering Agent. Implement `lib/workbench-shell.ts` and tests first. Do not start a broad UI rewrite until the shell state derivation is covered.
