import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(
  join(process.cwd(), 'app/components/ProjectWorkbenchShell.tsx'),
  'utf8',
);

describe('ProjectWorkbenchShell source contract', () => {
  it('renders the project identity, sync state, metrics, and stage list from props', () => {
    expect(source).toContain('summary.title');
    expect(source).toContain('syncDisplay.label');
    expect(source).toContain('projectCount');
    expect(source).toContain('summary.stageLabel');
    expect(source).toContain('summary.healthLabel');
    expect(source).toContain('summary.shotProgressLabel');
    expect(source).toContain('stages.map');
  });
});
