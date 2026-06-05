# UE Taste Principles

Purpose: define how UEAgent evaluates product experience before UI implementation.

UE means user experience, information architecture, interaction quality, visual hierarchy, and product behavior. It is broader than UI styling.

## 1. Experience Comes Before Components

Do not start by choosing cards, gradients, or icons. Start by mapping:

```text
User intent
  -> Information needed
  -> Decision to make
  -> Action to take
  -> System feedback
  -> Recovery path
```

Only then choose layout and components.

## 2. Design The Primary Path First

Every screen needs a primary path.

For each screen:
- One dominant user goal
- One primary action
- Clear secondary actions
- Visible status
- Recoverable failure state

If a screen has many equal-weight actions, the design has not made a decision.

## 3. Information Hierarchy Beats Visual Decoration

Professional interfaces rely on hierarchy, not ornament.

Use:
- Position
- Spacing
- Typography scale
- Contrast
- Grouping
- State indicators
- Progressive disclosure

Avoid:
- Decorative cards inside cards
- Emoji as the only status signal
- Overlarge hero text inside tool surfaces
- One-note color palettes
- Explanatory copy that compensates for unclear UI

## 4. Match Density To The Product Shape

Jingci is a professional creation workbench. Its interface should be:
- Dense but breathable
- Structured around workflow stages
- Strong at comparing and scanning
- Stable under repeated use
- Calm enough for production work

It should not feel like:
- A prompt toy
- A landing page
- A template gallery pretending to be a product
- A decorative dashboard with weak actions

## 5. State Design Is Mandatory

Every key interaction must define:
- Empty state
- Loading state
- Success state
- Error state
- Partial data state
- Disabled state
- Retry or recovery path
- Mobile behavior

UE specs without state design are incomplete.

## 6. Layout Principles

Prefer stable regions:
- Left: project, navigation, stages, source material
- Center: primary work surface
- Right: inspection, status, feedback, export, next action

For smaller screens:
- Collapse secondary regions behind tabs or drawers
- Keep the current task visible
- Do not require horizontal scanning for core actions

## 7. Interaction Principles

Controls should match intent:
- Icon buttons for frequent tool actions
- Text buttons for clear commands
- Segmented controls for modes
- Toggles for binary settings
- Tabs for peer views
- Menus for secondary option sets
- Inline fields for immediate capture

Do not invent unfamiliar controls unless the workflow demands it.

## 8. Visual Taste Rules

Default product tone:
- Quiet, precise, durable
- More editorial craft than SaaS gloss
- More production cockpit than AI demo

Typography:
- No viewport-based font scaling
- No negative letter spacing
- Short headings inside panels
- Hero-scale type only for true hero areas

Color:
- Use color to encode state, risk, recommendation, and progress.
- Avoid dominant purple-blue gradients, beige/tan, dark slate-only, and single-hue themes.
- Maintain contrast and accessibility.

Surfaces:
- Do not nest cards.
- Use full-width bands or unframed layouts for sections.
- Use cards only for repeated items, modals, or genuinely framed tools.

## 9. UE Review Checklist

Before engineering:
- The core path is visible without instruction text.
- The next action is obvious.
- Secondary actions do not compete with the primary action.
- All key states are specified.
- Mobile and desktop rules are explicit.
- Text fits in realistic containers.
- The interface matches the product shape.
- The design removes cognitive load instead of adding chrome.

## 10. Reference Base

Use these as stable foundations:
- Nielsen Norman Group: usability heuristics, recognition over recall, feedback
- Apple Human Interface Guidelines: clarity, deference, feedback, direct manipulation
- Material Design: state, component behavior, layout consistency
- WCAG: contrast, keyboard access, readable structure
- Don Norman: affordance, mapping, constraints, feedback
