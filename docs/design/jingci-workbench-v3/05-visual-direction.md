# 05 · Visual Direction

## Tone

Quiet production cockpit.

Not dark sci-fi, not SaaS marketing, not playful prompt toy.

## Visual Keywords

- precise
- calm
- editorial
- production-grade
- readable
- evidence-oriented

## Color System

Use a neutral interface with semantic accents:

| Role | Color Direction | Use |
| --- | --- | --- |
| Background | warm gray / near white | workspace calm |
| Primary | deep ink / charcoal | text and main controls |
| Success | emerald | usable/generated progress |
| Risk | amber/red | shot risk and failure |
| Info | blue | platform and analytics |
| Creative accent | muted teal or brass | selected stage and project identity |

Avoid dominant purple gradients and decorative color blobs.

## Typography

- Use compact headings.
- Use tabular numbers for progress and scores.
- Avoid hero-scale type inside the workbench.
- Keep labels short and scannable.

## Spacing and Density

Desktop:
- three stable regions
- compact cards
- 8px radius max for normal controls
- section padding should support scanning, not presentation drama

Mobile:
- one task per view
- sticky primary action
- fewer visible metrics

## Components

### Stage Rail

Vertical list with status dots:
- done
- current
- waiting
- blocked

### Shot Card

Compact repeated item:
- shot number / duration / mode
- purpose
- image description
- risk strip
- selected state

### Execution Panel

Right rail component:
- progress
- current shot status
- result note
- primary copy action
- feedback
- export

### Insight Strip

Small analytics summary:
- sample size
- dislike rate
- top failure reason
- warning when sample size is low

## Visual Anti-Patterns

- Do not place every section in a large standalone card.
- Do not make copy buttons visually equal to stage transitions.
- Do not hide risk detail below unrelated content.
- Do not make feedback analytics compete with shot execution.
