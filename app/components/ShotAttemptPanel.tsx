'use client';

import { useState } from 'react';
import type {
  ShotApprovalReceipt,
  ShotGenerationAttempt,
  ShotGenerationAttemptInput,
  ShotGenerationAttemptStatus,
} from '@/lib/project-workspace';

const STATUS_LABELS: Record<ShotGenerationAttemptStatus, string> = {
  generated: '已生成',
  usable: '可用',
  failed: '失败',
};

export function ShotAttemptPanel({
  shotId,
  attempts,
  selectedAttemptId,
  approvalReceipt,
  onImport,
  onSelect,
  onApprove,
}: {
  shotId: number;
  attempts: ShotGenerationAttempt[];
  selectedAttemptId: string | null;
  approvalReceipt: ShotApprovalReceipt | null;
  onImport: (input: ShotGenerationAttemptInput) => void;
  onSelect: (shotId: number, attemptId: string) => void;
  onApprove: (shotId: number, decisionNote: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [provider, setProvider] = useState('');
  const [model, setModel] = useState('');
  const [status, setStatus] = useState<ShotGenerationAttemptStatus>('generated');
  const [assetRef, setAssetRef] = useState('');
  const [note, setNote] = useState('');
  const [costUsd, setCostUsd] = useState('');
  const [durationSeconds, setDurationSeconds] = useState('');
  const [error, setError] = useState('');
  const [approvalNote, setApprovalNote] = useState('');
  const [approvalError, setApprovalError] = useState('');
  const selectedAttempt = attempts.find((attempt) => attempt.id === selectedAttemptId) ?? null;
  const currentApproval = approvalReceipt?.attemptId === selectedAttemptId ? approvalReceipt : null;

  const submit = () => {
    try {
      onImport({
        shotId,
        provider,
        model,
        status,
        assetRef,
        note,
        costUsd: costUsd === '' ? null : Number(costUsd),
        durationSeconds: durationSeconds === '' ? null : Number(durationSeconds),
      });
      setAssetRef('');
      setNote('');
      setCostUsd('');
      setDurationSeconds('');
      setError('');
      setOpen(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '导入失败');
    }
  };

  const approve = () => {
    try {
      onApprove(shotId, approvalNote);
      setApprovalNote('');
      setApprovalError('');
    } catch (caught) {
      setApprovalError(caught instanceof Error ? caught.message : '审批失败');
    }
  };

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold text-gray-800 dark:text-gray-200">生成尝试</p>
          <p className="mt-0.5 text-[10px] text-gray-500 dark:text-gray-400">
            {attempts.length ? `${attempts.length} 个版本，保留最近 8 个` : '还没有导入结果'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-[11px] font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
          aria-expanded={open}
        >
          {open ? '取消' : '导入结果'}
        </button>
      </div>

      {open && (
        <div className="mt-3 grid gap-2 border-t border-gray-100 pt-3 dark:border-gray-800">
          <div className="grid grid-cols-2 gap-2">
            <input aria-label="生成平台" value={provider} onChange={(event) => setProvider(event.target.value)} placeholder="平台，如 Runway" className="rounded-md border border-gray-200 bg-white px-2.5 py-2 text-xs dark:border-gray-700 dark:bg-gray-950" />
            <input aria-label="模型版本" value={model} onChange={(event) => setModel(event.target.value)} placeholder="模型，如 Gen-4.5" className="rounded-md border border-gray-200 bg-white px-2.5 py-2 text-xs dark:border-gray-700 dark:bg-gray-950" />
          </div>
          <select aria-label="尝试结果" value={status} onChange={(event) => setStatus(event.target.value as ShotGenerationAttemptStatus)} className="rounded-md border border-gray-200 bg-white px-2.5 py-2 text-xs dark:border-gray-700 dark:bg-gray-950">
            <option value="generated">已生成</option>
            <option value="usable">可用</option>
            <option value="failed">失败</option>
          </select>
          <input aria-label="素材引用" value={assetRef} onChange={(event) => setAssetRef(event.target.value)} placeholder="素材链接或文件名" className="rounded-md border border-gray-200 bg-white px-2.5 py-2 text-xs dark:border-gray-700 dark:bg-gray-950" />
          <textarea aria-label="尝试备注" value={note} onChange={(event) => setNote(event.target.value)} placeholder={status === 'failed' ? '失败原因（必填）' : '主体、动作、画质等备注'} className="min-h-16 resize-y rounded-md border border-gray-200 bg-white px-2.5 py-2 text-xs dark:border-gray-700 dark:bg-gray-950" />
          <div className="grid grid-cols-2 gap-2">
            <input aria-label="生成成本" type="number" min="0" step="0.01" value={costUsd} onChange={(event) => setCostUsd(event.target.value)} placeholder="成本 USD" className="rounded-md border border-gray-200 bg-white px-2.5 py-2 text-xs dark:border-gray-700 dark:bg-gray-950" />
            <input aria-label="生成耗时" type="number" min="0" step="1" value={durationSeconds} onChange={(event) => setDurationSeconds(event.target.value)} placeholder="耗时 秒" className="rounded-md border border-gray-200 bg-white px-2.5 py-2 text-xs dark:border-gray-700 dark:bg-gray-950" />
          </div>
          {error && <p role="alert" className="text-[11px] text-red-600 dark:text-red-400">{error}</p>}
          <button type="button" onClick={submit} className="rounded-md bg-gray-950 px-3 py-2 text-xs font-semibold text-white dark:bg-gray-100 dark:text-gray-950">
            保存并选中
          </button>
        </div>
      )}

      {attempts.length > 0 && (
        <div className="mt-3 grid gap-2">
          {attempts.map((attempt, index) => {
            const selected = selectedAttemptId === attempt.id;
            return (
              <button
                key={attempt.id}
                type="button"
                onClick={() => onSelect(shotId, attempt.id)}
                aria-pressed={selected}
                className={`grid grid-cols-[auto_1fr] gap-2 rounded-md border p-2 text-left ${selected ? 'border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/20' : 'border-gray-200 dark:border-gray-800'}`}
              >
                <span className="text-[10px] font-semibold text-gray-400">#{attempts.length - index}</span>
                <span className="min-w-0">
                  <span className="flex items-center justify-between gap-2 text-[11px] font-medium text-gray-800 dark:text-gray-200">
                    <span className="truncate">{attempt.provider} · {attempt.model}</span>
                    <span className="shrink-0">{STATUS_LABELS[attempt.status]}</span>
                  </span>
                  <span className="mt-1 block truncate text-[10px] text-gray-500 dark:text-gray-400">{attempt.assetRef || attempt.note}</span>
                  {(attempt.costUsd !== null || attempt.durationSeconds !== null) && (
                    <span className="mt-1 block text-[10px] tabular-nums text-gray-400">
                      {attempt.costUsd !== null ? `$${attempt.costUsd.toFixed(2)}` : '成本未记录'}
                      {' · '}
                      {attempt.durationSeconds !== null ? `${attempt.durationSeconds}s` : '耗时未记录'}
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {currentApproval && (
        <div className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 p-2.5 dark:border-emerald-900 dark:bg-emerald-950/20">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-200">交付已批准</p>
            <time className="text-[10px] text-emerald-700/70 dark:text-emerald-300/70" dateTime={currentApproval.approvedAt}>
              {new Date(currentApproval.approvedAt).toLocaleString('zh-CN')}
            </time>
          </div>
          <p className="mt-1 text-[10px] text-emerald-800 dark:text-emerald-200">
            {currentApproval.provider} · {currentApproval.model}｜{currentApproval.decisionNote}
          </p>
          <p className="mt-1 text-[10px] text-emerald-700/70 dark:text-emerald-300/70">人工审批回执 · 非加密存证</p>
        </div>
      )}

      {!currentApproval && selectedAttempt?.status === 'usable' && (
        <div className="mt-3 grid gap-2 border-t border-gray-100 pt-3 dark:border-gray-800">
          <textarea
            aria-label="交付审批说明"
            value={approvalNote}
            onChange={(event) => setApprovalNote(event.target.value)}
            placeholder="说明为什么该版本可交付"
            className="min-h-16 resize-y rounded-md border border-gray-200 bg-white px-2.5 py-2 text-xs dark:border-gray-700 dark:bg-gray-950"
          />
          {approvalError && <p role="alert" className="text-[11px] text-red-600 dark:text-red-400">{approvalError}</p>}
          <button type="button" onClick={approve} className="rounded-md bg-emerald-700 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-800">
            批准为交付版本
          </button>
          <p className="text-[10px] text-gray-400">人工审批回执 · 非加密存证</p>
        </div>
      )}
    </section>
  );
}
