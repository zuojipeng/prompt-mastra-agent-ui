# 03 · Information Architecture

## V3 Workbench Regions

```text
┌─────────────────────────────────────────────────────────────┐
│ Top Bar: project title, health, save/export                 │
├───────────────┬────────────────────────────┬────────────────┤
│ Left Rail     │ Center Work Surface        │ Right Rail      │
│ Project       │ Current Stage Content      │ Execution       │
│ Stage         │ DirectorKit                │ Feedback        │
│ Source        │ Shot Detail                │ Export          │
└───────────────┴────────────────────────────┴────────────────┘
```

## Left Rail

Purpose: orientation.

Contains:
- project name
- creative brief
- target duration/type
- workflow stages
- progress summary
- recent project snapshots

Rules:
- Always visible on desktop.
- Collapses into a project drawer on mobile.
- Does not contain primary execution actions.

## Center Work Surface

Purpose: decision and editing.

Contains by stage:
- input and diagnosis
- reconstruction comparison
- story setting
- shot cards
- master prompt
- platform advice detail

Rules:
- Shows one dominant work mode at a time.
- Supports comparison only when comparison is the task.
- Avoids mixing analytics and export actions into the main reading flow.

## Right Rail

Purpose: next action and evidence.

Contains:
- execution progress
- selected shot status
- result note
- copy actions
- feedback buttons
- project snapshot export
- insight summary

Rules:
- Always answer "what should I do next?"
- Keep primary action sticky on desktop.
- Collapses into bottom action sheet on mobile.

## Information Priority

1. Current stage
2. Primary next action
3. Shot execution progress
4. Current shot risk and platform mode
5. Story and prompt context
6. Feedback/analytics
7. Export and archive

## Navigation Model

Use stage navigation, not page navigation:

```text
Idea
Diagnosis
Versions
DirectorKit
Execution
Feedback
Archive
```

The user should feel they are moving through a production pipeline.
