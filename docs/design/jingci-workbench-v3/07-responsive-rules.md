# 07 · Responsive Rules

## Breakpoints

| Width | Layout |
| --- | --- |
| 1280px+ | Three-region workbench |
| 900-1279px | Left rail compact, right rail collapsible |
| 640-899px | Two-column: stage/context top, work + action panel |
| <640px | Tabbed mobile workflow |

## Desktop

Use:

```text
240px left rail
minmax(0, 1fr) center
320px right rail
```

Rules:
- Left rail and right rail stay visible.
- Center scrolls independently when needed.
- Primary next action sits in right rail.
- Stage rail remains visible.

## Tablet

Rules:
- Left rail becomes compact.
- Right rail can become an inspector drawer.
- Center retains DirectorKit reading flow.

## Mobile

Rules:
- Top header shows project, stage, progress.
- Use tabs: `Work`, `Execute`, `Feedback`.
- Sticky bottom action shows only the current primary action.
- Project context opens as drawer.
- Avoid side-by-side comparison unless cards can scroll horizontally with clear snap points.

## Content Rules

- Long prompt text should collapse with copy action visible.
- Shot cards should show summary first, detail second.
- Feedback insight should never push execution action below the fold on mobile.
