# 08 · Implementation Slices

## Slice 1: DirectorKit Export Builders

Owner: Architecture Agent + Engineering Agent

Goal:
- Reduce `ChatBox.tsx` pressure before moving UI sections.

Scope:
- Extract `buildShotPrompt`
- Extract `buildExecutionChecklist`
- Extract `buildPlatformFeedPack`
- Extract `buildProjectSnapshot`
- Add unit tests for exported builders

Non-goals:
- No UI redesign yet
- No persistence
- No new dependencies

## Slice 2: Result Section Components

Owner: Engineering Agent

Goal:
- Create seams for workbench layout.

Candidate components:
- `DirectorKitExecutionPanel`
- `DirectorKitShotList`
- `DirectorKitPlatformAdvice`
- `FeedbackInsightPanel`

Rule:
- Extract only sections touched by active work. Do not refactor the whole page at once.

## Slice 3: Workbench Static Route or Preview

Owner: UEAgent + Engineering Agent

Goal:
- Implement a non-production preview of the V3 workbench layout using mocked DirectorKit data.

Validation:
- Desktop screenshot
- Mobile screenshot
- No text overlap
- Primary action visible

## Slice 4: Project Workspace MVP

Owner: Product Agent + Architecture Agent

Goal:
- Define durable project entity.

Candidate data:
- project id
- creative brief
- target duration/type
- selected version
- DirectorKit
- shot execution status
- shot result notes
- feedback links
- snapshots

Non-goals:
- Collaboration
- Billing
- Template marketplace

## Slice 5: Production Migration

Owner: Engineering Agent + Test Agent

Goal:
- Move current result page into V3 workbench regions gradually.

Gate:
- Browser E2E must pass after each slice.
- Mobile screenshot required for layout changes.
