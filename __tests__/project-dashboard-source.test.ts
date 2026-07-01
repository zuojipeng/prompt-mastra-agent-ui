import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('project dashboard source contract', () => {
  const source = readFileSync('app/components/ProjectDashboardPanel.tsx', 'utf8');

  it('surfaces feedback iteration evidence in the project dashboard', () => {
    expect(source).toContain('project.latestIterationFocus');
    expect(source).toContain('最近改写：');
    expect(source).toContain('Revisions');
    expect(source).toContain('project.iterationCount');
  });
});
