# UE Handoff: Selected Shot Provenance

Owner: UEAgent
Reviewer: Product Agent + Test Agent
Gate evidence: E2; browser evidence required after implementation

## Product Shape

This is an operational workbench, not a media gallery. Provenance belongs beside the selected shot's execution controls as evidence for a decision: run, inspect, retry, or continue manually.

## Primary Path

```text
Select shot
  -> Run provenance demo
  -> Queued
  -> Running
  -> Verified result
  -> Inspect asset and manifest evidence
  -> Retry while preserving parent lineage when needed
```

Manual shot status and notes remain available before, during, and after this path.

## Information Hierarchy

1. Current lifecycle state and offline/live mode.
2. One primary run or retry action.
3. Provider, model, attempt, and parent lineage.
4. Verified asset and manifest evidence after success.
5. Recoverable error and retry after failure.

Full hashes use monospace and wrap; the panel does not widen the workbench.

## State Matrix

| State | Visible feedback | Primary action | Recovery |
| --- | --- | --- | --- |
| Empty | No run for selected shot; fixture mode is explicit | Run provenance demo | Continue manual execution |
| Queued | Status dot, queued label, disabled action | Disabled | Manual controls remain usable |
| Running | Animated status dot, running label, disabled action | Disabled | Manual controls remain usable |
| Success | Verified label, provider/model, attempt, asset and manifest evidence | Retry with lineage | Open evidence links when live URLs exist |
| Failure | Error label and reason | Retry | Continue manual execution or update shot prompt |
| Invalid response | Fail-closed error copy; no verified evidence | Retry | Report contract failure; do not trust payload |
| Shot switch | Each shot retains its current in-session run | Run or retry selected shot | Return to previous shot without losing state |

## Responsive Rules

- Desktop: one standalone panel below execution progress in the right operations rail.
- Mobile: an unframed section inside Current Shot; no card inside card.
- Actions stack to full width on narrow screens.
- Hashes and URLs wrap; labels never force horizontal scrolling.
- No fixed mobile action is added, preserving the existing Execute tab controls.

## Accessibility

- Lifecycle feedback uses `role=status` and text, never color alone.
- Busy actions use `aria-busy` and disabled state.
- Evidence links have descriptive names.
- Status animation respects the existing reduced-motion browser behavior.

## Visual Tone

Use the workbench's neutral gray structure, cyan for active execution, emerald for verified evidence, and red only for failure. Avoid nested cards, gradients, decorative illustration, and competing primary buttons.

## Review Risks

- The fixture must never look like a live B2 proof.
- Provenance lifecycle must not overwrite the creator's manual `generated/failed/usable` judgment.
- Long hashes, provider names, and errors must remain readable at 393px mobile width.
