# ADR: Workbench V3 Layout Shell

Date: 2026-06-06

## Status

Accepted

## Context

UE Agent's Workbench V3 design defines Jingci as a production workbench, not a single-column prompt form.

The desired information architecture is:

- left rail: project context and stage orientation
- center surface: current product workflow and DirectorKit content
- right rail: execution progress, operations, feedback insight, and export actions

Previous slices extracted `DirectorKitShotList`, `DirectorKitExecutionPanel`, and `FeedbackInsightPanel`, making the layout migration possible without rewriting business logic.

## Decision

Implement the first production Workbench V3 layout shell in `ChatBox.tsx` and widen the page container in `app/page.tsx`.

The new shell includes:

- top workbench status bar
- left project/stage rail
- center workflow surface
- right operations rail

Moved into the right rail:

- sync operation
- feedback approval rate
- DirectorKit execution panel
- feedback insight panel

Kept in the center:

- onboarding
- creative input
- diagnosis
- version selection
- DirectorKit story, shot list, prompt, platform advice, post-production, and remediation
- history panel

## Consequences

Positive:

- The product now visually reads as a director workbench.
- Left rail gives users orientation across Idea, Diagnosis, Versions, DirectorKit, Execution, and Feedback.
- Right rail keeps next action and learning loop visible without competing with the main reading flow.

Trade-offs:

- Mobile currently becomes a stacked version of the shell, not the final tabbed mobile workflow.
- Platform advice is still inline in the center surface; a future slice should extract it.
- The right rail is a shell-level move; detailed visual polishing remains.

## Follow-Up

- Extract `DirectorKitPlatformAdvicePanel`.
- Add mobile `Work / Execute / Feedback` tabs once desktop shell stabilizes.
- Add a visual smoke test that captures screenshots through the Playwright runner, since `playwright screenshot` is unstable on this local headless shell.
