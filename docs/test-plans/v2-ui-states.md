# Test Plan · V2 UI States

Owner: Test Agent
Scope: Slice 2 UI state recovery

## Acceptance Criteria Mapping

| Requirement | Test |
| --- | --- |
| Loading is visible beyond the submit button | Static smoke string + manual/browser check |
| Generation error offers retry | Static smoke string + manual/browser check |
| Retry preserves input and target controls | Manual/browser check |
| Reconstruct cards are keyboard selectable | TypeScript + manual/browser check |
| Result page has fallback for incomplete data | Static smoke string + manual/browser check |
| Validation errors are announced | Source test + manual/browser check |
| Target controls cannot drift during loading | Source test + manual/browser check |

## Automated Cases

TC-UI-001: Smoke strings
- Given a production build
- When `npm run test:smoke` scans the bundle
- Then V2 recovery strings are present: `正在生成导演执行包`, `重试生成`, `执行包内容不完整`

TC-UI-002: TypeScript
- Given the keyboard handlers and ARIA attributes
- When `npx tsc --noEmit` runs
- Then no type errors occur

TC-UI-003: Unit regression
- Given existing unit tests
- When `npm test` runs
- Then all V2 contract tests still pass

TC-UI-004: Source-level state guards
- Given `ChatBox.tsx`
- When `chatbox-v2-source.test.ts` scans the source
- Then retry, loading, keyboard, disabled-loading, and incomplete-result guards are present

TC-UI-005: Validation error marker
- Given `ChatBox.tsx`
- When source tests scan the error panel
- Then `role="alert"` and `重试生成` are present

## Manual / Browser Cases

ME-UI-001: Loading
- Enter a valid creative.
- Submit.
- Confirm loading panel appears with progress copy.

ME-UI-002: Recoverable error
- Force API failure by pointing `NEXT_PUBLIC_API_URL` at an invalid endpoint or blocking network.
- Submit.
- Confirm input remains.
- Confirm `重试生成` is visible.
- Click retry.
- Confirm request is attempted again.

ME-UI-003: Keyboard selection
- Generate a DirectorKit.
- Tab to reconstruct cards.
- Use Enter, Space, or arrow keys to select a card.
- Confirm selection highlight and confirm button enable.

ME-UI-004: Validation error
- Submit an empty input.
- Confirm validation error is announced in the alert panel.

ME-UI-005: Loading target lock
- Submit a valid input.
- While loading, confirm duration/type controls are disabled.

ME-UI-006: Mobile layout
- Open mobile viewport.
- Confirm target selectors wrap.
- Confirm reconstruct cards stack.
- Confirm result text wraps.

## Exit Criteria

- Automated checks pass.
- Browser/manual notes are captured in the test report.
- Any untested path is documented as a risk with owner.
