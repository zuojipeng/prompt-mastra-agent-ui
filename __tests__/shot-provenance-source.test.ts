import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const panelSource = readFileSync('app/components/ShotProvenancePanel.tsx', 'utf8');
const inspectorSource = readFileSync('app/components/DirectorKitShotInspector.tsx', 'utf8');
const chatBoxSource = readFileSync('app/components/ChatBox.tsx', 'utf8');

describe('shot provenance UI source contract', () => {
  it('makes fixture evidence and lifecycle state explicit', () => {
    expect(panelSource).toContain('Fixture');
    expect(panelSource).toContain('Local adapter');
    expect(panelSource).toContain('Protected preview');
    expect(panelSource).toContain('未调用外部服务或写入真实存储');
    expect(panelSource).toContain('不代表真实 B2');
    expect(panelSource).toContain('失败或未响应时不得宣称 B2 存证成功');
    expect(panelSource).toContain('本次操作不调用 Runway 或 Genblaze');
    expect(panelSource).toContain('pre-generated source');
    expect(panelSource).toContain('Private B2 object');
    expect(panelSource).toContain('Private B2 manifest');
    expect(panelSource).toContain('role="status"');
    expect(panelSource).toContain('role="alert"');
    expect(panelSource).toContain('aria-busy={busy}');
  });

  it('keeps verified evidence and retry lineage visible', () => {
    expect(panelSource).toContain('Asset evidence');
    expect(panelSource).toContain('Manifest evidence');
    expect(panelSource).toContain('Fixture contract verified');
    expect(panelSource).toContain('Local integration verified');
    expect(panelSource).toContain('Retained-source manifest verified');
    expect(panelSource).toContain('run.parent_job_id');
    expect(panelSource).toContain('重试并保留来源');
  });

  it('reuses an unframed provenance section inside the mobile shot inspector', () => {
    expect(inspectorSource).toContain('<ShotProvenancePanel');
    expect(inspectorSource).toContain('embedded');
  });

  it('keeps full runs in session state and persists only sanitized project receipts', () => {
    expect(chatBoxSource).toContain('Record<number, ProvenanceRun>');
    expect(chatBoxSource).toContain('[card.shotId]: run');
    expect(chatBoxSource).toContain("provenanceTransportMode !== 'fixture'");
    expect(chatBoxSource).toContain('createProjectProvenanceReceipt');
    expect(panelSource).toContain('项目存证回执');
    expect(panelSource).toContain('已保存非秘密摘要');
    expect(chatBoxSource).not.toContain('provenanceRuns,\n      },\n      workspace');
  });
});
