'use client';

import { useEffect, useState } from 'react';
import { optimizePrompt, OptimizationResult, PromptVersion, TimelineSegment } from '@/lib/api-client';
import { createNewSession, getSessionInfo } from '@/lib/session-manager';

const SCENARIOS = [
  { id: 'video' as const, label: 'AI 视频' },
  { id: 'image' as const, label: 'AI 绘画' },
  { id: 'code' as const, label: '编程' },
];

const STYLES = [
  { id: '', label: '默认' },
  { id: 'wong-kar-wai', label: '王家卫' },
  { id: 'wes-anderson', label: '韦斯·安德森' },
  { id: 'cyberpunk', label: '赛博朋克' },
  { id: 'epic', label: '史诗感' },
];

type ScenarioId = (typeof SCENARIOS)[number]['id'];
type SessionInfo = ReturnType<typeof getSessionInfo>;

const INITIAL_SESSION_INFO: SessionInfo = {
  userId: 'server-user',
  sessionId: null,
  hasSession: false,
};

export function ChatBox() {
  const [input, setInput] = useState('');
  const [scenario, setScenario] = useState<ScenarioId>('video');
  const [style, setStyle] = useState('');
  const [result, setResult] = useState<OptimizationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
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
        scenario,
        ...(scenario === 'video' && style ? { style } : {}),
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

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('已复制到剪贴板！');
  };

  const selectScenario = (nextScenario: ScenarioId) => {
    setScenario(nextScenario);
    if (nextScenario !== 'video') {
      setStyle('');
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      <div className="text-center space-y-3">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent">
          AI 视频创作 · 分镜提示词生成器
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          为 Runway、Kling、Pika 等视频工具生成 15 秒时间轴、镜头细节和完整 prompt
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
              className="px-3 py-1 rounded-md bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 transition-colors font-medium"
            >
              🔄 新建对话
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap justify-center gap-2">
        {SCENARIOS.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => selectScenario(s.id)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              scenario === s.id
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {scenario === 'video' && (
        <div className="flex flex-wrap justify-center gap-2">
          {STYLES.map((s) => (
            <button
              key={s.id || 'default'}
              type="button"
              onClick={() => setStyle(s.id)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                style === s.id
                  ? 'bg-purple-600 text-white'
                  : 'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="prompt" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            输入你的视频剧情或画面描述
          </label>
          <textarea
            id="prompt"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="例如：雨夜街头，一个女孩回头..."
            className="w-full min-h-[120px] px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
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
          className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
        >
          {loading ? '优化中...' : '✨ 优化提示词'}
        </button>
      </form>

      {result && (
        <div className="space-y-6">
          <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold mb-2">📊 分析</h3>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{result.analysis}</p>
          </div>

          {result.timeline.length > 0 && <TimelineView timeline={result.timeline} />}

          {result.fullPrompt && (
            <PromptBlock label="15秒完整 Positive Prompt" text={result.fullPrompt} onCopy={copyToClipboard} />
          )}

          {result.negativePrompt && (
            <PromptBlock label="Negative Prompt" text={result.negativePrompt} onCopy={copyToClipboard} negative />
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
            <div className="p-6 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
              <h3 className="font-semibold mb-4">📝 改进建议</h3>
              <ul className="space-y-3">
                {result.suggestions.map((suggestion, index) => (
                  <li key={index} className="flex gap-3">
                    <span className="w-6 h-6 rounded-full bg-green-500 text-white text-xs flex items-center justify-center shrink-0">
                      {index + 1}
                    </span>
                    <p className="text-gray-700 dark:text-gray-300">{suggestion}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <details className="p-4 rounded-lg bg-gray-50 dark:bg-gray-900 border">
            <summary className="cursor-pointer font-medium">📋 原始输入</summary>
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
      <h3 className="font-semibold text-lg mb-4 text-blue-600 dark:text-blue-400">15秒分镜时间轴</h3>
      <div className="space-y-4">
        {timeline.map((segment, index) => (
          <div key={`${segment.time}-${index}`} className="grid gap-3 md:grid-cols-[88px_1fr] border-t first:border-t-0 pt-4 first:pt-0">
            <div className="text-sm font-semibold text-blue-600 dark:text-blue-400">{segment.time}</div>
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
      <h3 className="font-semibold text-lg text-purple-600 dark:text-purple-400">✨ {version.style}</h3>
      <PromptBlock label="Positive Prompt" text={version.positive_prompt} onCopy={onCopy} />
      {version.negative_prompt ? (
        <PromptBlock label="Negative Prompt" text={version.negative_prompt} onCopy={onCopy} negative />
      ) : null}
      {version.reasoning ? (
        <p className="text-sm text-gray-600 dark:text-gray-400 border-t pt-3">💡 {version.reasoning}</p>
      ) : null}
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
        <button type="button" onClick={() => onCopy(text)} className="text-xs px-3 py-1 rounded-md bg-gray-100 dark:bg-gray-700">
          📋 复制
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
