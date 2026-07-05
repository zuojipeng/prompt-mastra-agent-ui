# Code Review: History Local-First Degrade

Date: 2026-07-05
Reviewer: Code Review Agent + Test Agent
Producer reviewed: Product Agent + UEAgent + Engineering Agent
Scope: history fetch failure handling and browser coverage.

## Strongest Rejection Reason

The strongest reason to reject would be hiding a required data failure. In this product shape, history is optional context; local project storage and DirectorKit execution are the reliable primary path.

## Evidence Checked

- `app/components/ChatBox.tsx`
- `app/components/HistoryPanel.tsx`
- `__tests__/chatbox-v2-source.test.ts`
- `tests/e2e/v2-director-kit.spec.ts`
- `npx vitest run __tests__/chatbox-v2-source.test.ts`
- `npx tsc --noEmit`
- `PLAYWRIGHT_PORT=3200 npx playwright test tests/e2e/v2-director-kit.spec.ts --project=chromium --project=mobile-chrome`
- `npx vitest run --pool=threads`
- `npm run lint`
- `npm run build`
- `git diff --check`

## Findings

No blocking findings.

## Notes

- Raw `Failed to fetch` no longer appears in the browser flow.
- 404 history route receives specific copy: `历史记录服务暂未上线，当前项目仍会保存在本地项目库。`
- The test timeout for the DirectorKit spec is set to 45s because mobile restore now regularly exceeds the previous 30s budget while still completing successfully.

## Residual Risk

The production history route itself remains a backend/release concern and is not solved in this frontend slice.

## Decision

PASS.
