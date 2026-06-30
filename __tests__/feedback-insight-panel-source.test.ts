import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(
  join(process.cwd(), 'app/components/FeedbackInsightPanel.tsx'),
  'utf8',
);

describe('FeedbackInsightPanel next-action source contract', () => {
  it('renders a feedback-informed next iteration recommendation', () => {
    expect(source).toContain('deriveFeedbackNextAction');
    expect(source).toContain('下一轮建议');
    expect(source).toContain('nextAction.recommendation');
    expect(source).toContain('nextAction.promptHint');
    expect(source).toContain('buildFeedbackPromptRevision');
    expect(source).toContain('应用到下一轮创意');
    expect(source).toContain('onApplyPromptRevision');
  });
});
