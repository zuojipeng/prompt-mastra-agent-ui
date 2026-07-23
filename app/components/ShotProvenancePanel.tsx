'use client';

import type { ProvenanceRun } from '@/lib/provenance-run-contract';
import type { ProvenanceTransportMode } from '@/lib/provenance-http-client';
import type { ProjectProvenanceReceipt } from '@/lib/project-workspace';

const STATUS_COPY = {
  queued: { label: '已排队', tone: 'bg-gray-400' },
  running: { label: '生成与存证中', tone: 'bg-cyan-600' },
  failed: { label: '执行失败', tone: 'bg-red-500' },
} as const;

const MODE_COPY: Record<ProvenanceTransportMode, {
  label: string;
  description: string;
  emptyCopy: string;
  runLabel: string;
  runningLabel: string;
  successLabel: string;
  verifiedLabel: string;
}> = {
  fixture: {
    label: 'Fixture',
    description: '离线契约演示，未调用外部服务或写入真实存储',
    emptyCopy: '验证界面状态、重试血缘与 manifest 契约，不代表真实生成或 B2 上传。',
    runLabel: '运行离线契约演示',
    runningLabel: '离线契约验证中',
    successLabel: '离线契约已验证',
    verifiedLabel: 'Fixture contract verified',
  },
  local: {
    label: 'Local adapter',
    description: '本机 Genblaze adapter，使用内存存储且不代表真实 B2',
    emptyCopy: '验证浏览器到本机适配器的集成边界，不代表云端存证或 Provider 可靠性。',
    runLabel: '运行本地集成验证',
    runningLabel: '本地集成验证中',
    successLabel: '本地集成已验证',
    verifiedLabel: 'Local integration verified',
  },
  preview: {
    label: 'Protected preview',
    description: '读取预先生成的私有 Runway 素材；本次操作不调用 Runway 或 Genblaze',
    emptyCopy: '检查保留素材摘要与 manifest 回读；失败或未响应时不得宣称 B2 存证成功。',
    runLabel: '验证保留素材存证',
    runningLabel: '保留素材存证检查中',
    successLabel: '素材摘要与 manifest 回读已验证',
    verifiedLabel: 'Retained-source manifest verified',
  },
};

function compactHash(value: string) {
  return `${value.slice(0, 10)}...${value.slice(-8)}`;
}

export function ShotProvenancePanel({
  shotId,
  run,
  receipt,
  busy,
  mode,
  embedded = false,
  onRun,
}: {
  shotId: number;
  run: ProvenanceRun | null;
  receipt: ProjectProvenanceReceipt | null;
  busy: boolean;
  mode: ProvenanceTransportMode;
  embedded?: boolean;
  onRun: (outcome?: 'succeeded' | 'failed') => void;
}) {
  const modeCopy = MODE_COPY[mode];
  const status = run
    ? run.status === 'succeeded'
      ? { label: modeCopy.successLabel, tone: 'bg-emerald-500' }
      : run.status === 'running'
        ? { label: modeCopy.runningLabel, tone: STATUS_COPY.running.tone }
      : STATUS_COPY[run.status]
    : null;
  const canRetry = run?.status === 'succeeded' || run?.status === 'failed';

  return (
    <section
      aria-label={`镜头 ${shotId} 生成存证`}
      className={embedded ? 'border-t border-gray-200 pt-3 dark:border-gray-700' : 'rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900'}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">生成存证</h3>
            <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-500 dark:bg-gray-800 dark:text-gray-400">
              {modeCopy.label}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
            {modeCopy.description}
          </p>
        </div>
        {status && (
          <div role="status" aria-live="polite" className="flex items-center gap-2 text-xs font-medium text-gray-700 dark:text-gray-300">
            <span className={`h-2 w-2 rounded-full ${status.tone} ${run?.status === 'running' ? 'animate-pulse' : ''}`} />
            {status.label}
          </div>
        )}
      </div>

      {!run && (
        <p className="mt-3 text-xs leading-5 text-gray-600 dark:text-gray-400">
          {modeCopy.emptyCopy}
        </p>
      )}

      {run && (
        <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-[11px]">
          <div>
            <dt className="text-gray-400">{mode === 'preview' ? 'Source attribution' : 'Provider / Model'}</dt>
            <dd className="mt-0.5 break-words font-medium text-gray-700 dark:text-gray-300">
              {run.provider} / {run.model}{mode === 'preview' ? ' · pre-generated source' : ''}
            </dd>
          </div>
          <div>
            <dt className="text-gray-400">Attempt</dt>
            <dd className="mt-0.5 font-medium tabular-nums text-gray-700 dark:text-gray-300">{run.attempt}</dd>
          </div>
          {run.parent_job_id && (
            <div className="col-span-2">
              <dt className="text-gray-400">Parent run</dt>
              <dd className="mt-0.5 break-all font-mono text-gray-700 dark:text-gray-300">{run.parent_job_id}</dd>
            </div>
          )}
        </dl>
      )}

      {run?.status === 'succeeded' && run.result && (
        <div className="mt-3 border-t border-gray-100 pt-3 text-[11px] dark:border-gray-800">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <p className="font-semibold text-gray-700 dark:text-gray-300">Asset evidence</p>
              <p className="mt-1 text-gray-500 dark:text-gray-400">{run.result.asset.media_type} · {(run.result.asset.size_bytes / 1_048_576).toFixed(1)} MB</p>
              <p className="mt-1 break-all font-mono text-gray-600 dark:text-gray-400" title={run.result.asset.sha256}>
                SHA {compactHash(run.result.asset.sha256)}
              </p>
              <p className="mt-1 break-all font-mono text-gray-500 dark:text-gray-500">
                {mode === 'preview' ? 'Private B2 object' : run.result.asset.url}
              </p>
            </div>
            <div>
              <p className="font-semibold text-gray-700 dark:text-gray-300">Manifest evidence</p>
              <p className="mt-1 font-medium text-emerald-700 dark:text-emerald-300">{modeCopy.verifiedLabel}</p>
              <p className="mt-1 break-all font-mono text-gray-600 dark:text-gray-400" title={run.result.manifest.canonical_hash}>
                Hash {compactHash(run.result.manifest.canonical_hash)}
              </p>
              <p className="mt-1 break-all font-mono text-gray-500 dark:text-gray-500">
                {mode === 'preview' ? 'Private B2 manifest' : run.result.manifest.uri}
              </p>
            </div>
          </div>
        </div>
      )}

      {run?.status === 'failed' && (
        <p role="alert" className="mt-3 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-950/30 dark:text-red-300">
          {run.error}
        </p>
      )}

      {receipt && (
        <div className="mt-3 rounded-md border border-emerald-200 bg-emerald-50/60 p-3 text-[11px] dark:border-emerald-900 dark:bg-emerald-950/20">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-semibold text-emerald-900 dark:text-emerald-200">项目存证回执</p>
            <span className="font-medium text-emerald-700 dark:text-emerald-300">
              {MODE_COPY[receipt.mode].label}
            </span>
          </div>
          <p className="mt-1 text-emerald-800 dark:text-emerald-300">
            {receipt.provider} / {receipt.model} · Attempt {receipt.attempt}
          </p>
          {receipt.parentJobId && (
            <p className="mt-1 break-all font-mono text-emerald-700 dark:text-emerald-400">
              Parent {receipt.parentJobId}
            </p>
          )}
          <div className="mt-2 grid gap-1 font-mono text-emerald-800 dark:text-emerald-300 sm:grid-cols-2">
            <p>Asset {compactHash(receipt.assetSha256)}</p>
            <p>Manifest {compactHash(receipt.manifestHash)}</p>
          </div>
          <p className="mt-2 text-emerald-700 dark:text-emerald-400">
            已保存非秘密摘要 · {new Date(receipt.verifiedAt).toLocaleString('zh-CN')}
          </p>
        </div>
      )}

      {!busy && mode === 'fixture' && (
        <button
          type="button"
          onClick={() => onRun('failed')}
          title="使用离线 fixture 模拟 Provider timeout"
          className="mt-3 w-full px-3 py-1.5 text-[11px] font-medium text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-300"
        >
          验证失败恢复
        </button>
      )}
      <button
        type="button"
        onClick={() => onRun('succeeded')}
        disabled={busy}
        aria-busy={busy}
        className={`${busy ? 'mt-3' : 'mt-1'} w-full rounded-md bg-gray-950 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-gray-800 disabled:cursor-wait disabled:bg-gray-300 disabled:text-gray-500 dark:bg-gray-100 dark:text-gray-950 dark:hover:bg-white dark:disabled:bg-gray-800 dark:disabled:text-gray-500`}
      >
        {busy ? '执行中...' : canRetry ? '重试并保留来源' : modeCopy.runLabel}
      </button>
    </section>
  );
}
