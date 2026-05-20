'use client';

import { useEffect, useRef, useState } from 'react';
import {
  fetchPromptHistory,
  HistoryRecord,
  optimizePrompt,
  OptimizationResult,
  ProjectBible,
} from '@/lib/api-client';
import { createNewSession, getSessionInfo } from '@/lib/session-manager';
import { ProjectBiblePanel } from './ProjectBiblePanel';

const STYLES = [
  { id: '', label: '默认' },
  { id: 'wong-kar-wai', label: '王家卫' },
  { id: 'wes-anderson', label: '韦斯·安德森' },
  { id: 'cyberpunk', label: '赛博朋克' },
  { id: 'epic', label: '史诗感' },
];

const SHOT_COUNTS = [1, 3, 5];

const PLATFORM_TARGETS = [
  { id: 'xyq', label: '小云雀 (AI视频)', icon: '🎬' },
  { id: 'seedance', label: 'Seedance', icon: '🎞' },
  { id: 'kling', label: '可灵 Kling', icon: '🎥' },
  { id: 'runway', label: 'Runway Gen-3', icon: '🎬' },
  { id: 'pika', label: 'Pika', icon: '✨' },
  { id: 'sora', label: 'OpenAI Sora', icon: '🤖' },
  { id: 'clipboard_json', label: '复制结构化 JSON', icon: '📋' },
] as const;

function hasBibleValues(bible: ProjectBible): boolean {
  return !!(
    bible.protagonist ||
    bible.mission ||
    bible.world ||
    bible.lookAndFeel ||
    bible.shotIntent ||
    (bible.visualSymbols && bible.visualSymbols.length > 0) ||
    (bible.continuityRules && bible.continuityRules.length > 0)
  );
}

type SessionInfo = ReturnType<typeof getSessionInfo>;

const INITIAL_SESSION_INFO: SessionInfo = {
  userId: 'server-user',
  sessionId: null,
  hasSession: false,
};

export function ChatBox() {
  const [input, setInput] = useState('');
  const [style, setStyle] = useState('');
  const [shotCount, setShotCount] = useState(1);
  const [result, setResult] = useState<OptimizationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [refiningIndex, setRefiningIndex] = useState<number | null>(null);
  const [refineInput, setRefineInput] = useState('');
  const [refiningLoading, setRefiningLoading] = useState(false);
  const [refiningError, setRefiningError] = useState('');
  const [showBible, setShowBible] = useState(false);
  const [projectBible, setProjectBible] = useState<ProjectBible>({});
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState('');
  const [sessionInfo, setSessionInfo] = useState(INITIAL_SESSION_INFO);

  useEffect(() => {
    setSessionInfo(getSessionInfo());
    refreshHistory();
  }, []);

  const refreshHistory = async () => {
    setHistoryLoading(true);
    setHistoryError('');

    try {
      setHistory(await fetchPromptHistory());
    } catch (err) {
      setHistoryError(err instanceof Error ? err.message : '历史记录读取失败');
    } finally {
      setHistoryLoading(false);
    }
  };

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
        ...(shotCount > 1 ? { shotCount } : {}),
        ...(hasBibleValues(projectBible) ? { projectBible } : {}),
      });
      setResult(optimization);
      setSessionInfo(getSessionInfo());
      await refreshHistory();
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
    setHistory([]);
  };

  const copyToClipboard = async (text: string, index: number) => {
    await navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    window.setTimeout(() => setCopiedIndex(null), 2000);
  };

  const continueFromHistory = (record: HistoryRecord) => {
    setInput(record.userPrompt);
    setResult(record.result);
    setError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openInXiaoYunQue = (text: string) => {
    const encoded = encodeURIComponent(text);
    window.open(`https://xyq.jianying.com/?prompt=${encoded}`, '_blank');
  };

  const handlePlatformExport = (platform: string, text: string) => {
    switch (platform) {
      case 'xyq':
        openInXiaoYunQue(text);
        break;
      case 'seedance': {
        const seedanceText = `【中文提示词】${text}\n【翻译】${text.slice(0, 200)}`;
        navigator.clipboard.writeText(seedanceText);
        setCopiedIndex(-1);
        window.setTimeout(() => setCopiedIndex(null), 2000);
        break;
      }
      case 'kling': {
        const klingPrompt = `Cinematic shot, ${text.slice(0, 300)}. 4K, high quality, cinematic lighting.`;
        navigator.clipboard.writeText(klingPrompt);
        setCopiedIndex(-1);
        window.setTimeout(() => setCopiedIndex(null), 2000);
        break;
      }
      case 'runway':
      case 'pika':
      case 'sora': {
        // Open text+prompt preparation page
        navigator.clipboard.writeText(text);
        setCopiedIndex(-1);
        window.setTimeout(() => setCopiedIndex(null), 2000);
        break;
      }
      case 'clipboard_json': {
        const jsonBlob = JSON.stringify(
          { platform: 'video-prompt', shotIndex: -1, prompt: text, timestamp: Date.now() },
          null,
          2,
        );
        navigator.clipboard.writeText(jsonBlob);
        setCopiedIndex(-1);
        window.setTimeout(() => setCopiedIndex(null), 2000);
        break;
      }
    }
  };

  const startRefine = (index: number) => {
    setRefiningIndex(index);
    setRefineInput('');
    setRefiningError('');
  };

  const cancelRefine = () => {
    setRefiningIndex(null);
    setRefineInput('');
    setRefiningError('');
  };

  const submitRefine = async (index: number) => {
    if (!result || !refineInput.trim()) {
      setRefiningError('请输入优化要求');
      return;
    }

    const originalPrompt = prompts[index];
    if (!originalPrompt) return;

    setRefiningLoading(true);
    setRefiningError('');

    try {
      const refinementResult = await optimizePrompt(refineInput.trim(), {
        refinement: {
          targetType: 'full_prompt',
          label: `镜头 ${index + 1}`,
          content: originalPrompt,
        },
      });

      // Replace the refined shot in the prompts array
      const updatedPrompts = [...prompts];
      updatedPrompts[index] = refinementResult.prompts?.[0] ?? refinementResult.fullPrompt;
      if (!updatedPrompts[index]) {
        throw new Error('优化结果为空');
      }

      setResult((prev) =>
        prev
          ? {
              ...prev,
              prompts: updatedPrompts,
              fullPrompt: updatedPrompts[0],
            }
          : prev,
      );
      setRefiningIndex(null);
      setRefineInput('');
      await refreshHistory();
    } catch (err) {
      setRefiningError(err instanceof Error ? err.message : '优化失败，请重试');
    } finally {
      setRefiningLoading(false);
    }
  };

  // Get prompts from result: prefer new prompts array, fallback to fullPrompt
  const getPrompts = (res: OptimizationResult): string[] => {
    if (res.prompts && res.prompts.length > 0) {
      return res.prompts;
    }
    if (res.fullPrompt) {
      return [res.fullPrompt];
    }
    return [];
  };

  const prompts = result ? getPrompts(result) : [];

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Hero */}
      <div className="text-center space-y-3">
        <p className="text-lg text-gray-600 dark:text-gray-400">
          把一句创意拆成可直接复制到小云雀的中文画面描述
        </p>
        {sessionInfo.hasSession && (
          <button
            type="button"
            onClick={handleNewSession}
            className="px-3 py-1.5 rounded-md bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 transition-colors text-xs font-medium"
          >
            新建创作
          </button>
        )}
      </div>

      {/* Onboarding guide — shown when no results */}
      {!result && !loading && (
        <div className="grid md:grid-cols-3 gap-3 text-sm">
          <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
            <div className="font-medium text-gray-900 dark:text-gray-100 mb-2">
              💡 输入你的视频创意
            </div>
            <p className="text-gray-600 dark:text-gray-400">
              一句画面描述即可，比如雨夜街头、角色动作、情绪氛围。
            </p>
          </div>
          <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
            <div className="font-medium text-gray-900 dark:text-gray-100 mb-2">
              ✨ 秒出中文画面描述
            </div>
            <p className="text-gray-600 dark:text-gray-400">
              自动生成可直接复制到小云雀、Seedance 的中文提示词。
            </p>
          </div>
          <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
            <div className="font-medium text-gray-900 dark:text-gray-100 mb-2">
              🎬 多镜头连续叙事
            </div>
            <p className="text-gray-600 dark:text-gray-400">
              一个创意拆成 1/3/5 个连续镜头，保持角色和风格一致。
            </p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Style + Shot Count toolbar */}
        <div className="flex flex-wrap items-center justify-center gap-3">
          <span className="text-sm text-gray-500 dark:text-gray-400">风格</span>
          {STYLES.map((s) => (
            <button
              key={s.id || 'default'}
              type="button"
              onClick={() => setStyle(s.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
                style === s.id
                  ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-300 dark:ring-emerald-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'
              }`}
            >
              {s.label}
            </button>
          ))}
          <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">镜头</span>
          {SHOT_COUNTS.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setShotCount(n)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
                shotCount === n
                  ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'
              }`}
            >
              {n} 镜
            </button>
          ))}
          <button
            type="button"
            onClick={() => setShowBible(!showBible)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
              showBible || hasBibleValues(projectBible)
                ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-300 dark:ring-indigo-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'
            }`}
          >
            {hasBibleValues(projectBible) ? '📖 导演模式 ✓' : '📖 导演模式'}
          </button>
        </div>
        {showBible && (
          <ProjectBiblePanel bible={projectBible} onChange={setProjectBible} />
        )}
        <div>
          <label htmlFor="prompt" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            输入你的视频创意
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
          {loading ? '生成中...' : '生成提示词'}
        </button>
      </form>

      {/* Prompt cards */}
      {prompts.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
              生成结果
            </h2>
            <span className="text-xs text-gray-400">{prompts.length} 个镜头</span>
          </div>
          {prompts.map((prompt, index) => (
            <PromptCard
              key={index}
              index={index}
              text={prompt}
              isCopied={copiedIndex === index}
              isRefining={refiningIndex === index}
              refiningLoading={refiningLoading}
              refiningError={refiningError}
              refineInput={refineInput}
              onCopy={() => copyToClipboard(prompt, index)}
              onOpenInXYQ={() => openInXiaoYunQue(prompt)}
              onStartRefine={() => startRefine(index)}
              onCancelRefine={cancelRefine}
              onRefineInputChange={setRefineInput}
              onSubmitRefine={() => submitRefine(index)}
              onPlatformExport={handlePlatformExport}
            />
          ))}
        </div>
      )}

      <HistoryPanel
        history={history}
        loading={historyLoading}
        error={historyError}
        onRefresh={refreshHistory}
        onContinue={continueFromHistory}
        onCopy={(text) => {
          navigator.clipboard.writeText(text);
          setCopiedIndex(-1);
          window.setTimeout(() => setCopiedIndex(null), 2000);
        }}
      />
    </div>
  );
}

function PromptCard({
  index,
  text,
  isCopied,
  isRefining,
  refiningLoading,
  refiningError,
  refineInput,
  onCopy,
  onOpenInXYQ,
  onStartRefine,
  onCancelRefine,
  onRefineInputChange,
  onSubmitRefine,
  onPlatformExport,
}: {
  index: number;
  text: string;
  isCopied: boolean;
  isRefining: boolean;
  refiningLoading: boolean;
  refiningError: string;
  refineInput: string;
  onCopy: () => void;
  onOpenInXYQ: () => void;
  onStartRefine: () => void;
  onCancelRefine: () => void;
  onRefineInputChange: (value: string) => void;
  onSubmitRefine: () => void;
  onPlatformExport: (platform: string, text: string) => void;
}) {
  const [showPlatformMenu, setShowPlatformMenu] = useState(false);
  const platformMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (platformMenuRef.current && !platformMenuRef.current.contains(e.target as Node)) {
        setShowPlatformMenu(false);
      }
    };
    if (showPlatformMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showPlatformMenu]);

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400">
          镜头 {index + 1}
        </h3>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCopy}
            className={`text-xs px-3 py-1.5 rounded-md font-medium transition-colors ${
              isCopied
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200'
                : 'bg-gray-100 hover:bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            {isCopied ? '已复制' : '复制'}
          </button>
          <button
            type="button"
            onClick={onOpenInXYQ}
            className="text-xs px-3 py-1.5 rounded-md font-medium bg-emerald-50 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-200 dark:hover:bg-emerald-900/50 transition-colors"
          >
            在小云雀打开
          </button>
          {/* Platform export dropdown */}
          <div className="relative" ref={platformMenuRef}>
            <button
              type="button"
              onClick={() => setShowPlatformMenu(!showPlatformMenu)}
              className="text-xs px-3 py-1.5 rounded-md font-medium bg-orange-50 text-orange-800 hover:bg-orange-100 dark:bg-orange-950/40 dark:text-orange-200 dark:hover:bg-orange-900/50 transition-colors"
            >
              导出到 ▼
            </button>
            {showPlatformMenu && (
              <div className="absolute right-0 top-full mt-1 z-20 w-44 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg py-1">
                {PLATFORM_TARGETS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      onPlatformExport(p.id, text);
                      setShowPlatformMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <span className="mr-1.5">{p.icon}</span>
                    {p.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          {!isRefining && (
            <button
              type="button"
              onClick={onStartRefine}
              className="text-xs px-3 py-1.5 rounded-md font-medium bg-purple-50 text-purple-800 hover:bg-purple-100 dark:bg-purple-950/40 dark:text-purple-200 dark:hover:bg-purple-900/50 transition-colors"
            >
              优化此镜头
            </button>
          )}
        </div>
      </div>
      <p className="text-base sm:text-lg leading-relaxed text-gray-900 dark:text-gray-100 whitespace-pre-wrap break-words">
        {text}
      </p>
      {isRefining && (
        <div className="space-y-3 pt-2 border-t border-gray-100 dark:border-gray-800">
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
              输入优化要求（如：加强光影对比、改为白天场景）
            </label>
            <textarea
              value={refineInput}
              onChange={(e) => onRefineInputChange(e.target.value)}
              placeholder="例如：加强光影对比，把环境改为黄昏，强化雨滴反光..."
              className="w-full min-h-[80px] px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none text-sm"
              disabled={refiningLoading}
            />
          </div>
          {refiningError && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <p className="text-xs text-red-600 dark:text-red-400">{refiningError}</p>
            </div>
          )}
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={onCancelRefine}
              disabled={refiningLoading}
              className="text-xs px-3 py-1.5 rounded-md font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
            >
              取消
            </button>
            <button
              type="button"
              onClick={onSubmitRefine}
              disabled={refiningLoading || !refineInput.trim()}
              className="text-xs px-4 py-1.5 rounded-md font-medium bg-purple-700 text-white hover:bg-purple-800 disabled:bg-gray-400 transition-colors flex items-center gap-1.5"
            >
              {refiningLoading ? (
                <>
                  <span className="inline-block w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  优化中...
                </>
              ) : (
                '确认优化'
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function HistoryPanel({
  history,
  loading,
  error,
  onRefresh,
  onContinue,
  onCopy,
}: {
  history: HistoryRecord[];
  loading: boolean;
  error: string;
  onRefresh: () => void;
  onContinue: (record: HistoryRecord) => void;
  onCopy: (text: string, label?: string) => void;
}) {
  return (
    <section className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold text-gray-900 dark:text-gray-100">历史记录</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            查看最近生成记录，复制结果或带回输入区。
          </p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className="rounded-md bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-60 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
        >
          {loading ? '读取中...' : '刷新'}
        </button>
      </div>

      {error && (
        <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200">
          {error}
        </p>
      )}

      {!loading && history.length === 0 && !error && (
        <p className="mt-4 rounded-md bg-gray-50 px-3 py-4 text-sm text-gray-500 dark:bg-gray-950 dark:text-gray-400">
          当前会话还没有历史记录。生成一次提示词后，这里会显示最近结果。
        </p>
      )}

      {history.length > 0 && (
        <div className="mt-4 grid gap-3">
          {history.slice(0, 5).map((record) => (
            <article
              key={record.timestamp}
              className="rounded-lg border border-gray-200 p-3 dark:border-gray-800"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="text-xs text-gray-500">
                    {new Date(record.timestamp).toLocaleString()}
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm font-medium text-gray-900 dark:text-gray-100">
                    {record.userPrompt || '未识别到原始输入'}
                  </p>
                  {record.result ? (
                    <p className="mt-1 text-xs text-gray-500">
                      {record.result.prompts?.length || (record.result.fullPrompt ? 1 : 0)} 条提示词
                    </p>
                  ) : (
                    <p className="mt-1 text-xs text-amber-600 dark:text-amber-300">
                      旧记录无法解析结构化结果
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => onContinue(record)}
                    className="rounded-md bg-emerald-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-800"
                  >
                    继续
                  </button>
                  {record.result?.fullPrompt ? (
                    <button
                      type="button"
                      onClick={() =>
                        onCopy(record.result?.fullPrompt ?? '', '历史 Prompt')
                      }
                      className="rounded-md bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                    >
                      复制
                    </button>
                  ) : null}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
