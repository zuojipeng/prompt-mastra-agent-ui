'use client';

import { useEffect, useState } from 'react';
import { optimizePrompt, OptimizationResult, PlatformVariant, PromptVersion, TimelineSegment } from '@/lib/api-client';
import { createNewSession, getSessionInfo } from '@/lib/session-manager';

const STYLES = [
  { id: '', label: '默认' },
  { id: 'wong-kar-wai', label: '王家卫' },
  { id: 'wes-anderson', label: '韦斯·安德森' },
  { id: 'cyberpunk', label: '赛博朋克' },
  { id: 'epic', label: '史诗感' },
];

type SessionInfo = ReturnType<typeof getSessionInfo>;

const INITIAL_SESSION_INFO: SessionInfo = {
  userId: 'server-user',
  sessionId: null,
  hasSession: false,
};

export function ChatBox() {
  const [input, setInput] = useState('');
  const [style, setStyle] = useState('');
  const [result, setResult] = useState<OptimizationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copiedLabel, setCopiedLabel] = useState('');
  const [sessionInfo, setSessionInfo] = useState(INITIAL_SESSION_INFO);

  useEffect(() => {
    setSessionInfo(getSessionInfo());
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) {
      setError('请输入提示词');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const optimization = await optimizePrompt(input, {
        ...(style ? { style } : {}),
      });
      setResult(optimization);
      setSessionInfo(getSessionInfo());
    } catch (err) {
      setError(err instanceof Error ? err.message : '优化失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const handleNewSession = () => {
    createNewSession();
    setSessionInfo(getSessionInfo());
    setResult(null);
    setError('');
    setInput('');
  };

  const copyToClipboard = async (text: string, label = '内容') => {
    await navigator.clipboard.writeText(text);
    setCopiedLabel(label);
    window.setTimeout(() => setCopiedLabel(''), 1400);
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      <div className="text-center space-y-3">
        <h1 className="text-4xl font-bold text-gray-950 dark:text-gray-50">
          AI 视频分镜 Prompt 工作台
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          把一句创意拆成 15 秒时间轴、镜头细节、主 prompt、负向词和平台适配版本
        </p>

        <div className="flex items-center justify-center gap-4 text-xs flex-wrap">
          <span className="flex items-center gap-2 text-gray-500">
            <span className="inline-block w-2 h-2 bg-green-500 rounded-full" />
            已启用记忆功能
          </span>
          {sessionInfo.hasSession && (
            <button
              type="button"
              onClick={handleNewSession}
              className="px-3 py-1 rounded-md bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 transition-colors font-medium"
            >
              新建创作
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap justify-center gap-2">
        {STYLES.map((s) => (
          <button
            key={s.id || 'default'}
            type="button"
            onClick={() => setStyle(s.id)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              style === s.id
                ? 'bg-emerald-700 text-white'
                : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="prompt" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            输入你的视频剧情或画面描述
          </label>
          <textarea
            id="prompt"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="例如：雨夜街头，一个女孩停在霓虹招牌下，听见身后脚步声后缓慢回头..."
            className="w-full min-h-[120px] px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
            disabled={loading}
          />
        </div>

        {error && (
          <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full px-6 py-3 bg-emerald-700 hover:bg-emerald-800 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
        >
          {loading ? '生成中...' : '生成视频 Prompt 套件'}
        </button>
      </form>

      {copiedLabel && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
          已复制：{copiedLabel}
        </div>
      )}

      {result && (
        <div className="space-y-6">
          <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold mb-2">创意诊断</h3>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{result.analysis}</p>
          </div>

          {result.timeline.length > 0 && <TimelineView timeline={result.timeline} />}

          {result.fullPrompt && (
            <PromptBlock label="15秒完整 Positive Prompt" text={result.fullPrompt} onCopy={copyToClipboard} />
          )}

          {result.negativePrompt && (
            <PromptBlock label="Negative Prompt" text={result.negativePrompt} onCopy={copyToClipboard} negative />
          )}

          {result.platformVariants.length > 0 && (
            <PlatformVariantList variants={result.platformVariants} onCopy={copyToClipboard} />
          )}

          {result.versions.length > 0 && (
            <details className="p-4 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
              <summary className="cursor-pointer font-medium">兼容版 Prompt</summary>
              <div className="mt-4 space-y-4">
                {result.versions.map((version, index) => (
                  <VersionCard key={index} version={version} onCopy={copyToClipboard} />
                ))}
              </div>
            </details>
          )}

          {result.suggestions.length > 0 && (
            <div className="p-6 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900">
              <h3 className="font-semibold mb-4">下一步优化建议</h3>
              <ul className="space-y-3">
                {result.suggestions.map((suggestion, index) => (
                  <li key={index} className="flex gap-3">
                    <span className="w-6 h-6 rounded-full bg-amber-600 text-white text-xs flex items-center justify-center shrink-0">
                      {index + 1}
                    </span>
                    <p className="text-gray-700 dark:text-gray-300">{suggestion}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <details className="p-4 rounded-lg bg-gray-50 dark:bg-gray-900 border">
            <summary className="cursor-pointer font-medium">原始输入</summary>
            <p className="mt-4 italic text-gray-700 dark:text-gray-300">{result.originalPrompt}</p>
          </details>
        </div>
      )}
    </div>
  );
}

function TimelineView({ timeline }: { timeline: TimelineSegment[] }) {
  return (
    <div className="p-6 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg">
      <h3 className="font-semibold text-lg mb-4 text-emerald-700 dark:text-emerald-300">15秒分镜时间轴</h3>
      <div className="space-y-4">
        {timeline.map((segment, index) => (
          <div key={`${segment.time}-${index}`} className="grid gap-3 md:grid-cols-[88px_1fr] border-t first:border-t-0 pt-4 first:pt-0">
            <div className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">{segment.time}</div>
            <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
              <TimelineRow label="镜头" text={segment.shot} />
              <TimelineRow label="动作" text={segment.action} />
              <TimelineRow label="表情" text={segment.expression} />
              <TimelineRow label="声音" text={segment.audio} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TimelineRow({ label, text }: { label: string; text: string }) {
  return (
    <p className="leading-relaxed">
      <span className="font-medium text-gray-900 dark:text-gray-100">{label}：</span>
      {text}
    </p>
  );
}

function VersionCard({ version, onCopy }: { version: PromptVersion; onCopy: (t: string) => void }) {
  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-lg text-gray-900 dark:text-gray-100">{version.style}</h3>
      <PromptBlock label="Positive Prompt" text={version.positive_prompt} onCopy={onCopy} />
      {version.negative_prompt ? (
        <PromptBlock label="Negative Prompt" text={version.negative_prompt} onCopy={onCopy} negative />
      ) : null}
      {version.reasoning ? (
        <p className="text-sm text-gray-600 dark:text-gray-400 border-t pt-3">{version.reasoning}</p>
      ) : null}
    </div>
  );
}

function PlatformVariantList({
  variants,
  onCopy,
}: {
  variants: PlatformVariant[];
  onCopy: (text: string, label?: string) => void;
}) {
  return (
    <div className="p-6 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h3 className="font-semibold text-lg text-gray-900 dark:text-gray-100">平台适配版本</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            针对不同视频模型的 prompt、使用建议和限制提醒
          </p>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {variants.map((variant) => (
          <div key={variant.platform} className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h4 className="font-semibold text-gray-900 dark:text-gray-100">{variant.platform}</h4>
              <button
                type="button"
                onClick={() => onCopy(variant.prompt, `${variant.platform} Prompt`)}
                className="text-xs px-3 py-1 rounded-md bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600"
              >
                复制
              </button>
            </div>
            <p className="rounded-md bg-gray-50 dark:bg-gray-900 p-3 text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
              {variant.prompt}
            </p>
            <div className="space-y-2 text-xs text-gray-600 dark:text-gray-400">
              <p>
                <span className="font-medium text-gray-900 dark:text-gray-100">使用建议：</span>
                {variant.usage_notes}
              </p>
              <p>
                <span className="font-medium text-gray-900 dark:text-gray-100">限制提醒：</span>
                {variant.constraint_notes}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PromptBlock({
  label,
  text,
  onCopy,
  negative,
}: {
  label: string;
  text: string;
  onCopy: (t: string) => void;
  negative?: boolean;
}) {
  return (
    <div>
      <div className="flex justify-between mb-2">
        <span className="text-sm font-medium text-gray-500">{label}</span>
        <button
          type="button"
          onClick={() => onCopy(text, label)}
          className="text-xs px-3 py-1 rounded-md bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600"
        >
          复制
        </button>
      </div>
      <p
        className={`p-3 rounded-md text-sm whitespace-pre-wrap ${
          negative ? 'bg-red-50 dark:bg-red-900/20' : 'bg-gray-50 dark:bg-gray-900'
        }`}
      >
        {text}
      </p>
    </div>
  );
}
