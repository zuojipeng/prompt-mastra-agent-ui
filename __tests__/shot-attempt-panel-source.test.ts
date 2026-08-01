import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(join(process.cwd(), 'app/components/ShotAttemptPanel.tsx'), 'utf8');

describe('ShotAttemptPanel source contract', () => {
  it('exposes provider-neutral manual import fields', () => {
    expect(source).toContain('aria-label="生成平台"');
    expect(source).toContain('aria-label="模型版本"');
    expect(source).toContain('aria-label="尝试结果"');
    expect(source).toContain('aria-label="素材引用"');
    expect(source).toContain('aria-label="生成成本"');
    expect(source).toContain('aria-label="生成耗时"');
    expect(source).toContain('保存并选中');
    expect(source).toContain('attempt.costUsd.toFixed(2)');
    expect(source).toContain('attempt.durationSeconds');
  });

  it('keeps attempt selection explicit and accessible', () => {
    expect(source).toContain('aria-pressed={selected}');
    expect(source).toContain('onSelect(shotId, attempt.id)');
    expect(source).toContain('保留最近 8 个');
  });
});
