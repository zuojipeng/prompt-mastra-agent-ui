# Jingci Workbench V3 Design Pack

Date: 2026-06-06
Owner: UEAgent
Mode: Agent Team OS UE Redesign Sprint

## Goal

Define the next experience direction for Jingci before more feature work is added to the current long result page.

Jingci should become a professional AI short-film director workbench:

```text
Project context
  -> DirectorKit work surface
  -> Shot execution and feedback loop
```

## Files

- `01-product-shape.md`: product type, user job, and design principles.
- `02-user-journey.md`: creation journey and key decisions.
- `03-information-architecture.md`: screen regions and hierarchy.
- `04-low-fi-wireframes.md`: desktop and mobile wireframes.
- `05-visual-direction.md`: tone, typography, color, density, and component direction.
- `06-component-state-matrix.md`: required states before implementation.
- `07-responsive-rules.md`: desktop, tablet, and mobile behavior.
- `08-implementation-slices.md`: engineering migration plan.
- `prototype.html`: static visual design draft for review.

## Design Decision

Do not add more actions to the existing single vertical result page until the workbench structure is defined.

Next implementation should start with architecture extraction:

```text
DirectorKit export builders
  -> tested domain module
  -> result sections become easier to move into workbench regions
```
