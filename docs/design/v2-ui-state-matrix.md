# Design Spec · V2 UI State Matrix

Owner: UI Agent
Scope: V2 DirectorKit flow

## Flow

```text
Input
  -> Loading
  -> Diagnosis
  -> Reconstruct
  -> Result
```

## Screen: Input

Purpose:
- Capture a creative idea and target constraints.

Primary actions:
- Submit creative for diagnosis.

Secondary actions:
- Apply template.
- Sync feedback data.

States:
- Default: empty textarea, target duration/type selectors, template shortcuts.
- Filled: character counter visible.
- Validation error: error panel shows the local validation message and input remains editable.
- Loading: textarea disabled, submit button shows spinner, progress panel explains generation stage.

Validation and errors:
- Empty input: show `请输入视频创意`.
- Over limit: show max-length message and prevent submit.

Responsive behavior:
- Selectors wrap into multiple rows.
- Primary submit button stays full width.

Accessibility notes:
- Error panel should use `role="alert"`.
- Loading panel should use `aria-live="polite"`.

## Screen: Diagnosis

Purpose:
- Let the user judge whether the idea is worth producing and what needs adjustment.

Primary actions:
- Continue to reconstruction.

Secondary actions:
- Return to edit.

States:
- Success: feasibility score, risk tags, adjustments, direction.
- Partial data: hide missing optional sections but keep the report container.
- Error recovery: if generation failed before diagnosis, show retry panel in input area.

Responsive behavior:
- Score and risk labels must not overflow.

Accessibility notes:
- Score text must remain visible without color reliance.

## Screen: Reconstruct

Purpose:
- Let the user choose one of three production directions.

Primary actions:
- Confirm selected version.

Secondary actions:
- Return to diagnosis.

States:
- Default: three selectable cards.
- Selected: selected card has visual highlight and checkmark.
- Disabled confirm: confirm button explains selection requirement.
- Keyboard: cards are focusable and selectable with Enter/Space.

Responsive behavior:
- Desktop: 3-column grid.
- Mobile: single-column stack.

Accessibility notes:
- Cards should behave as radio options.
- Selection should be exposed with `aria-checked`.

## Screen: Result

Purpose:
- Present the executable director package.

Primary actions:
- Restart.

Secondary actions:
- Copy/export actions in later slices.

States:
- Success: story setting, shot cards, master prompt, platform advice, post-production advice, risk remediation.
- Empty result fallback: if critical sections are missing, show a non-blocking warning instead of rendering a blank page.
- Long content: text wraps and does not overflow.

Responsive behavior:
- Shot cards stack vertically.
- Two-column details collapse to one column on mobile.

Accessibility notes:
- Section headings should be descriptive.

## Cross-Cutting Error Rules

- Network/model/schema failure must not clear the user's input.
- A failed generation must expose a retry action.
- Retry must reuse the current input, target duration, and target type.
- History/feedback/sync failures must not block the V2 creation flow.

