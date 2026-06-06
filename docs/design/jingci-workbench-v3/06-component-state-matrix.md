# 06 · Component State Matrix

| Component | Empty | Loading | Success | Error | Disabled | Mobile |
| --- | --- | --- | --- | --- | --- | --- |
| Creative Input | Placeholder plus target selectors | Submit disabled, input locked | Moves to diagnosis | Inline validation | Disabled during generation | Full width, target selectors wrap |
| Stage Rail | Shows Idea as current | Current stage shows spinner | Completed stages checkmarked | Stage can show blocked state | Future stages muted | Collapses into top progress dropdown |
| Diagnosis Panel | No diagnosis before submit | Skeleton score and risk rows | Score, risks, recommendation | Retry card | Continue disabled until diagnosis | Single stacked card |
| Version Cards | Hidden before diagnosis | Skeleton cards | Three comparable options | Retry reconstruction | Confirm disabled until selection | Horizontal scroll or stacked radios |
| DirectorKit Surface | Missing data fallback | Section skeletons | Story, shots, prompts | Partial data warning | Copy disabled if text missing | Work tab |
| Shot Card | Shows planned shot | Copy/status disabled during generation | Current selected shot highlighted | Risk/failure note visible | No status change before result | Full-width list item |
| Execution Panel | No selected shot hint | Action buttons disabled | Progress and note saved locally | Note save/copy failure visible | Copy disabled if missing prompt | Execute tab or bottom sheet |
| Feedback Panel | No sample summary | Loading insight | Shows top failure reasons | Non-blocking error | Feedback disabled after submit | Feed tab |
| Project Snapshot | Empty until DirectorKit exists | Copy disabled | Success toast | Copy fallback message | Disabled without DirectorKit | In overflow menu or Archive tab |

## Accessibility Requirements

- Stage rail uses text labels, not color alone.
- Buttons expose clear labels.
- Status controls use `aria-pressed` or radio semantics.
- Copy success must be announced with visible text.
- Error states must not block unrelated workflow steps.

## Validation Requirements

- Desktop screenshot at 1440px.
- Mobile screenshot at 390px.
- Keyboard path for selecting version and triggering primary action.
- Text should not overflow buttons or panels.
