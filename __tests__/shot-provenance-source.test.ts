import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const panelSource = readFileSync('app/components/ShotProvenancePanel.tsx', 'utf8');
const inspectorSource = readFileSync('app/components/DirectorKitShotInspector.tsx', 'utf8');
const chatBoxSource = readFileSync('app/components/ChatBox.tsx', 'utf8');

describe('shot provenance UI source contract', () => {
  it('makes fixture evidence and lifecycle state explicit', () => {
    expect(panelSource).toContain('Fixture');
    expect(panelSource).toContain('Local adapter');
    expect(panelSource).toContain('未写入真实存储');
    expect(panelSource).toContain('role="status"');
    expect(panelSource).toContain('role="alert"');
    expect(panelSource).toContain('aria-busy={busy}');
  });

  it('keeps verified evidence and retry lineage visible', () => {
    expect(panelSource).toContain('Asset evidence');
    expect(panelSource).toContain('Manifest evidence');
    expect(panelSource).toContain('run.parent_job_id');
    expect(panelSource).toContain('重试并保留来源');
  });

  it('reuses an unframed provenance section inside the mobile shot inspector', () => {
    expect(inspectorSource).toContain('<ShotProvenancePanel');
    expect(inspectorSource).toContain('embedded');
  });

  it('keeps provenance state separate per shot and out of project persistence', () => {
    expect(chatBoxSource).toContain('Record<number, ProvenanceRun>');
    expect(chatBoxSource).toContain('[card.shotId]: run');
    expect(chatBoxSource).toContain("provenanceTransportMode === 'local'");
    expect(chatBoxSource).not.toContain('provenanceRuns,\n      },\n      workspace');
  });
});
