'use client';

import { useEffect, useRef, useState } from 'react';
import {
  fetchFeedbackStats,
  fetchPromptHistory,
  fetchUserData,
  HistoryRecord,
  optimizePrompt,
  OptimizationResult,
  ProjectBible,
  syncUserData,
  uploadFeedback,
} from '@/lib/api-client';
import { createNewSession, getSessionInfo } from '@/lib/session-manager';
import { ProjectBiblePanel } from './ProjectBiblePanel';
import { HistoryPanel } from './HistoryPanel';

const STYLES = [
  { id: '', label: '默认' },
  { id: 'wong-kar-wai', label: '王家卫' },
  { id: 'wes-anderson', label: '韦斯·安德森' },
  { id: 'cyberpunk', label: '赛博朋克' },
  { id: 'epic', label: '史诗感' },
];

const SHOT_COUNTS = [1, 3, 5];
const MAX_INPUT_LENGTH = 2000;

function validateInput(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return '请输入视频创意';
  if (trimmed.length > MAX_INPUT_LENGTH)
    return `输入内容过长（最多 ${MAX_INPUT_LENGTH} 字）`;
  return null;
}

const PLATFORM_TARGETS = [
  { id: 'xyq', label: '小云雀 (AI视频)', icon: '🎬', url: 'https://xyq.jianying.com' },
  { id: 'seedance', label: 'Seedance', icon: '🎞', url: 'https://seedance.cn/create' },
  { id: 'kling', label: '可灵 Kling', icon: '🎥', url: 'https://klingai.com/create' },
  { id: 'runway', label: 'Runway Gen-3', icon: '🎬', url: 'https://app.runwayml.com/create' },
  { id: 'pika', label: 'Pika', icon: '✨', url: 'https://pika.art/create' },
  { id: 'sora', label: 'OpenAI Sora', icon: '🤖', url: 'https://sora.com/create' },
  { id: 'clipboard_json', label: '复制结构化 JSON', icon: '📋', url: null },
] as const;

const FEEDBACK_KEY = 'prompt-feedback';

interface PromptFeedback {
  id: string;
  timestamp: number;
  input: string;
  prompt: string;
  shotIndex: number;
  rating: 'like' | 'dislike' | null;
  comment: string;
}

function loadFeedback(): PromptFeedback[] {
  try {
    const raw = localStorage.getItem(FEEDBACK_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveFeedback(feedback: PromptFeedback[]) {
  try { localStorage.setItem(FEEDBACK_KEY, JSON.stringify(feedback)); } catch {}
}

function generateFeedbackId(): string {
  return `fb-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

const PROMPT_TEMPLATES = [
  {
    label: '🌧 雨中叙事',
    prompt: '雨夜街头，一个女孩停在霓虹招牌下，听见身后脚步声后缓慢回头',
    style: 'wong-kar-wai',
    shots: 3,
  },
  {
    label: '🏮 古风武侠',
    prompt: '竹林深处，一名白衣剑客立于风中，衣袂翻飞，剑尖指向远方的落日',
    style: 'epic',
    shots: 3,
  },
  {
    label: '🌃 赛博都市',
    prompt: '未来都市夜景，全息广告牌闪烁，一个穿雨衣的身影走在湿漉漉的天桥上',
    style: 'cyberpunk',
    shots: 3,
  },
  {
    label: '🏜 西部荒漠',
    prompt: '黄昏的荒漠小镇，一名牛仔策马而来，风滚草从马蹄前滚过',
    style: 'epic',
    shots: 1,
  },
  {
    label: '🎭 韦斯·安德森',
    prompt: '对称构图的酒店大堂，一个穿粉色套装的女孩在红色电话亭前打电话',
    style: 'wes-anderson',
    shots: 3,
  },
  {
    label: '🍜 美食诱惑',
    prompt: '深夜路边摊，一锅热气腾腾的拉面被端上桌，蒸汽与霓虹灯交织',
    style: '',
    shots: 1,
  },
] as const;

function formatForPlatform(platform: string, text: string): string {
  switch (platform) {
    case 'xyq':
      return text;
    case 'seedance':
      return `【中文提示词】${text}\n【翻译】${text.slice(0, 200)}`;
    case 'kling':
      return `Cinematic shot: ${text.slice(0, 300)}. 4K cinematic quality, professional lighting.`;
    case 'runway':
    case 'pika':
    case 'sora':
      return text;
    case 'clipboard_json':
      return JSON.stringify(
        { platform: 'video-prompt', prompts: [text], timestamp: Date.now() },
        null,
        2,
      );
    default:
      return text;
  }
}

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
  const [showMoreOpts, setShowMoreOpts] = useState(false);
  const [smartExtractLoading, setSmartExtractLoading] = useState(false);
  const [showBatchMenu, setShowBatchMenu] = useState(false);
  const batchExportRef = useRef<HTMLDivElement>(null);
  const [feedback, setFeedback] = useState<PromptFeedback[]>([]);
  const [feedbackLoaded, setFeedbackLoaded] = useState(false);
  const [showFeedbackPanel, setShowFeedbackPanel] = useState(false);
  const [cloudStats, setCloudStats] = useState<{
    total: number;
    likes: number;
    dislikes: number;
    ratio: string;
  } | null>(null);
  const [syncState, setSyncState] = useState<'idle' | 'syncing' | 'done' | 'error'>('idle');
  const [feedbackComment, setFeedbackComment] = useState<Record<string, string>>({});
  const [projectBible, setProjectBible] = useState<ProjectBible>({});
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState('');
  const [sessionInfo, setSessionInfo] = useState(INITIAL_SESSION_INFO);
  const [lastInput, setLastInput] = useState('');
  const [lastOptions, setLastOptions] = useState<{
    style?: string;
    shotCount?: number;
    projectBible?: ProjectBible;
  }>({});

  useEffect(() => {
    setSessionInfo(getSessionInfo());
    refreshHistory();
    fetchFeedbackStats().then(setCloudStats).catch(() => {});
    fetchUserData()
      .then((data) => {
        if (data?.feedback) {
          try {
            const parsed = JSON.parse(data.feedback as string);
            if (Array.isArray(parsed)) {
              setFeedback(parsed);
              localStorage.setItem(FEEDBACK_KEY, data.feedback as string);
            }
          } catch {}
        }
      })
      .catch(() => {});
  }, []);

  // Load feedback from localStorage on client only (hydration safety)
  useEffect(() => {
    setFeedback(loadFeedback());
    setFeedbackLoaded(true);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Ctrl/Cmd + Enter → submit form
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        // Don't submit if already loading
        if (!loading && input.trim() && !validateInput(input)) {
          // Simulate form submission by triggering handleSubmit
          // We need access to the form ref, so we'll dispatch from the submit button
          const submitBtn = document.querySelector<HTMLButtonElement>('button[type="submit"]');
          submitBtn?.click();
        }
      }
      // Escape → close refinement / bible panel
      if (e.key === 'Escape') {
        if (refiningIndex !== null) {
          cancelRefine();
        } else if (showBible) {
          setShowBible(false);
        } else if (showBatchMenu) {
          setShowBatchMenu(false);
        }
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [loading, input, refiningIndex, showBible, showBatchMenu]);

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

    const validationError = validateInput(input);
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    const options = {
      ...(style ? { style } : {}),
      ...(shotCount > 1 ? { shotCount } : {}),
      ...(hasBibleValues(projectBible) ? { projectBible } : {}),
    };
    setLastInput(input);
    setLastOptions(options);

    try {
      const optimization = await optimizePrompt(input, options);
      setResult(optimization);
      setSessionInfo(getSessionInfo());
      await refreshHistory();
    } catch (err) {
      const msg = err instanceof Error ? err.message : '优化失败，请重试';

      // Auto-retry on format errors: try up to 3 times with fallbacks
      if (msg.includes('格式异常')) {
        const fallbacks = [
          { ...options, shotCount: 1 },          // attempt 1: single shot
          { ...options, shotCount: 1, style: '' }, // attempt 2: single + no style
        ];
        let lastError = msg;
        for (const fallbackOpts of fallbacks) {
          try {
            const optimization = await optimizePrompt(input, fallbackOpts);
            setResult(optimization);
            setSessionInfo(getSessionInfo());
            await refreshHistory();
            return;
          } catch (retryErr) {
            lastError = retryErr instanceof Error ? retryErr.message : '重试失败';
          }
        }
        setError(`生成服务暂时不稳定，请稍后重试。${lastError}`);
        return;
      }

      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    if (lastInput) {
      setLoading(true);
      setError('');

      optimizePrompt(lastInput, lastOptions)
        .then((optimization) => {
          setResult(optimization);
          setSessionInfo(getSessionInfo());
          refreshHistory();
        })
        .catch((err) => {
          setError(err instanceof Error ? err.message : '重试失败，请稍后再试');
        })
        .finally(() => setLoading(false));
    }
  };

  // Close batch menu on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (batchExportRef.current && !batchExportRef.current.contains(e.target as Node)) {
        setShowBatchMenu(false);
      }
    };
    if (showBatchMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showBatchMenu]);

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

  const handlePlatformExport = (platform: string, text: string) => {
    const target = PLATFORM_TARGETS.find((p) => p.id === platform);
    const openInNewTab = (url: string) => window.open(url, '_blank', 'noopener');

    switch (platform) {
      case 'xyq': {
        const encoded = encodeURIComponent(text);
        openInNewTab(`https://xyq.jianying.com/?prompt=${encoded}`);
        break;
      }
      case 'seedance':
      case 'kling':
      case 'runway':
      case 'pika':
      case 'sora': {
        // Copy text first, then open platform page
        navigator.clipboard.writeText(text);
        if (target?.url) openInNewTab(target.url);
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

  const handleApplyTemplate = (template: (typeof PROMPT_TEMPLATES)[number]) => {
    setInput(template.prompt);
    setStyle(template.style);
    setShotCount(template.shots);
    setError('');
    setShowBible(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSmartExtract = async () => {
    if (!input.trim()) return;
    setSmartExtractLoading(true);
    try {
      const result = await optimizePrompt(
        `请从以下创意中提取导演模式信息，返回JSON格式：\n${input.trim()}\n\n格式：{"protagonist":"...","mission":"...","world":"...","lookAndFeel":"...","shotIntent":"...","visualSymbols":["..."],"continuityRules":["..."]}\n只输出JSON，不要Markdown。`,
        {},
      );
      const text = result.fullPrompt || result.prompts?.[0] || '';
      const jsonMatch = text.match(/\{[\s\S]*"protagonist"[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        setProjectBible((prev) => ({
          ...prev,
          protagonist: parsed.protagonist || prev.protagonist,
          mission: parsed.mission || prev.mission,
          world: parsed.world || prev.world,
          lookAndFeel: parsed.lookAndFeel || prev.lookAndFeel,
          shotIntent: parsed.shotIntent || prev.shotIntent,
          visualSymbols: parsed.visualSymbols?.length
            ? [...new Set([...(prev.visualSymbols ?? []), ...parsed.visualSymbols])]
            : prev.visualSymbols,
          continuityRules: parsed.continuityRules?.length
            ? [...new Set([...(prev.continuityRules ?? []), ...parsed.continuityRules])]
            : prev.continuityRules,
        }));
        setShowBible(true);
      }
    } catch {
      // silent fail — user can still fill manually
    } finally {
      setSmartExtractLoading(false);
    }
  };

  const handleBatchExport = (platform: string) => {
    if (!prompts.length) return;
    const formatted = prompts
      .map((prompt, i) => {
        const platformText = formatForPlatform(platform, prompt);
        return `【镜头 ${i + 1}】\n${platformText}`;
      })
      .join('\n\n---\n\n');
    navigator.clipboard.writeText(formatted);
    setCopiedIndex(-1);
    window.setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleFeedback = (shotIndex: number, promptText: string, rating: 'like' | 'dislike') => {
    const existing = feedback.find((f) => f.prompt === promptText && f.shotIndex === shotIndex);
    if (existing) {
      if (existing.rating === rating) {
        const updated = feedback.map((f) =>
          f.id === existing.id ? { ...f, rating: null as null } : f,
        );
        setFeedback(updated);
        saveFeedback(updated);
      } else {
        const updated = feedback.map((f) =>
          f.id === existing.id ? { ...f, rating } : f,
        );
        setFeedback(updated);
        saveFeedback(updated);
        uploadFeedback({ input, prompt: promptText, shotIndex, rating });
      }
    } else {
      const newEntry: PromptFeedback = {
        id: generateFeedbackId(),
        timestamp: Date.now(),
        input,
        prompt: promptText,
        shotIndex,
        rating,
        comment: '',
      };
      const updated = [...feedback, newEntry];
      setFeedback(updated);
      saveFeedback(updated);
      // Upload to backend (fire-and-forget)
      uploadFeedback({ input, prompt: promptText, shotIndex, rating });
    }
  };

  const handleFeedbackComment = (id: string, comment: string) => {
    const updated = feedback.map((f) => (f.id === id ? { ...f, comment } : f));
    setFeedback(updated);
    saveFeedback(updated);
  };

  const getFeedbackFor = (promptText: string, shotIdx: number): 'like' | 'dislike' | null =>
    feedback.find((f) => f.prompt === promptText && f.shotIndex === shotIdx)?.rating ?? null;

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

      // Replace the prompt with the refinement result
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
    <div className="w-full max-w-4xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Hero — minimal */}
      <div className="text-center">
        {!result && !loading && (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            输入创意，秒出画面描述
          </p>
        )}
      </div>

      {/* Onboarding guide — shown when no results */}
      {!result && !loading && (
        <div className="text-center py-8">
          <p className="text-sm text-gray-400 dark:text-gray-500 mb-1">
            输入你的视频创意，3 秒出中文画面描述
          </p>
          <p className="text-[11px] text-gray-300 dark:text-gray-600">
            可直接复制到小云雀、Seedance、可灵等平台使用
          </p>
        </div>
      )}

      {/* Sync button & cloud stats */}
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={async () => {
            setSyncState('syncing');
            try {
              const raw = localStorage.getItem(FEEDBACK_KEY);
              if (raw) {
                const ok = await syncUserData({ feedback: raw });
                setSyncState(ok ? 'done' : 'error');
              } else {
                setSyncState('done');
              }
              const stats = await fetchFeedbackStats();
              setCloudStats(stats);
            } catch {
              setSyncState('error');
            }
            setTimeout(() => setSyncState('idle'), 3000);
          }}
          disabled={syncState === 'syncing'}
          className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg font-medium transition-colors
            bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700
            text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700
            disabled:opacity-50"
        >
          <span className="text-sm">☁️</span>
          <span>同步</span>
          {syncState === 'syncing' && <span className="text-blue-500 ml-0.5">...</span>}
          {syncState === 'done' && <span className="text-emerald-500 ml-0.5">✓</span>}
          {syncState === 'error' && <span className="text-red-500 ml-0.5">✗</span>}
        </button>

        {/* Approval rate progress bar */}
        {cloudStats && (() => {
          const ratedTotal = cloudStats.total;
          const pct = ratedTotal > 0 ? Math.round((cloudStats.likes / ratedTotal) * 100) : 0;
          return (
            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
              <span className="whitespace-nowrap">☁️ 好评率</span>
              <div className="w-24 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: pct > 60 ? '#10b981' : pct > 30 ? '#f59e0b' : '#ef4444',
                  }}
                />
              </div>
              <span className="font-medium tabular-nums w-10 text-right">{pct}%</span>
              <span className="text-[10px] text-gray-400">({cloudStats.likes}/{ratedTotal})</span>
            </div>
          );
        })()}
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <textarea
            id="prompt"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="例如：雨夜街头，一个女孩回头..."
            className="w-full min-h-[100px] px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none text-sm"
            disabled={loading}
            maxLength={MAX_INPUT_LENGTH + 100}
          />
          <div className="flex justify-between items-center mt-1">
            <span className="text-[11px] text-gray-400">
              {input.length > 0
                ? `${input.length}/${MAX_INPUT_LENGTH}`
                : `按 Ctrl+Enter 快速提交`}
            </span>
            {input.length > MAX_INPUT_LENGTH && (
              <span className="text-[11px] text-red-500 font-medium">
                超出 {input.length - MAX_INPUT_LENGTH} 字
              </span>
            )}
          </div>
        </div>

        {/* Templates as inline suggestions */}
        {!input && !result && !loading && (
          <div className="flex flex-wrap gap-1.5">
            <span className="text-[11px] text-gray-400 leading-6">没想法？试试</span>
            {PROMPT_TEMPLATES.slice(0, 4).map((tmpl) => (
              <button
                key={tmpl.label}
                type="button"
                onClick={() => handleApplyTemplate(tmpl)}
                className="text-[11px] px-2 py-0.5 rounded-full bg-gray-50 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 transition-all"
              >
                {tmpl.label}
              </button>
            ))}
          </div>
        )}

        {/* Advanced options — collapsed by default */}
        {result && (
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setShowMoreOpts(!showMoreOpts)}
              className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              {showMoreOpts ? '▼' : '▶'} 更多方式
            </button>
            {showMoreOpts && (
              <div className="p-3 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 space-y-3">
                {/* Style + Shot count */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] text-gray-500">风格</span>
                  {STYLES.map((s) => (
                    <button
                      key={s.id || 'default'}
                      type="button"
                      onClick={() => setStyle(s.id)}
                      className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all ${
                        style === s.id
                          ? 'bg-emerald-600 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                  <span className="text-[11px] text-gray-500 ml-1">镜头</span>
                  {SHOT_COUNTS.map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setShotCount(n)}
                      className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all ${
                        shotCount === n
                          ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
                {/* Director mode toggle */}
                <button
                  type="button"
                  onClick={() => setShowBible(!showBible)}
                  className={`text-[11px] px-2.5 py-1 rounded-full font-medium transition-all ${
                    showBible || hasBibleValues(projectBible)
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400'
                  }`}
                >
                  {hasBibleValues(projectBible) ? '📖 导演模式 ✓' : '📖 导演模式'}
                </button>
              </div>
            )}
          </div>
        )}

        {showBible && (
          <ProjectBiblePanel
            bible={projectBible}
            onChange={setProjectBible}
            onSmartExtract={handleSmartExtract}
            smartExtractLoading={smartExtractLoading}
            creativeInput={input}
          />
        )}

        {error && (
          <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 flex items-start gap-3">
            <p className="text-sm text-red-600 dark:text-red-400 flex-1">{error}</p>
            {lastInput && (
              <button
                type="button"
                onClick={handleRetry}
                disabled={loading}
                className="text-xs px-3 py-1.5 rounded-md font-medium bg-red-100 text-red-700 hover:bg-red-200 disabled:opacity-50 dark:bg-red-900/40 dark:text-red-300 dark:hover:bg-red-800/50 transition-colors shrink-0"
              >
                重试
              </button>
            )}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full px-6 py-3 bg-emerald-700 hover:bg-emerald-800 disabled:bg-gray-400 text-white font-medium rounded-xl transition-colors duration-200 flex items-center justify-center gap-2 text-sm"
        >
          {loading ? (
            <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> 生成中</>
          ) : (
            <>{result ? '✨ 再来一次' : '✨ 生成'}</>
          )}
        </button>
      </form>

      {/* Skeleton loading cards */}
      {loading && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
              生成中
            </h2>
            <span className="inline-block w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          </div>
          {Array.from({ length: shotCount }, (_, i) => (
            <SkeletonCard key={i} index={i} />
          ))}
        </div>
      )}

      {/* Prompt cards */}
      {prompts.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
              生成结果
            </h2>
            <span className="text-xs text-gray-400">{prompts.length} 个镜头</span>
            <div className="ml-auto relative" ref={batchExportRef}>
              <button
                type="button"
                onClick={() => setShowBatchMenu(!showBatchMenu)}
                className="text-xs px-3 py-1.5 rounded-md font-medium bg-orange-100 text-orange-800 hover:bg-orange-200 dark:bg-orange-900/30 dark:text-orange-200 dark:hover:bg-orange-800/50 transition-colors flex items-center gap-1"
              >
                📦 批量导出 ▼
              </button>
              {showBatchMenu && (
                <div className="absolute right-0 top-full mt-1 z-20 w-48 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg py-1">
                  {PLATFORM_TARGETS.filter((p) => p.id !== 'clipboard_json').map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        handleBatchExport(p.id);
                        setShowBatchMenu(false);
                      }}
                      className="w-full text-left px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <span className="mr-1.5">{p.icon}</span>
                      全部导出到 {p.label.replace(/\(.*?\)/, '').trim()}
                    </button>
                  ))}
                </div>
              )}
            </div>
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
              onStartRefine={() => startRefine(index)}
              onCancelRefine={cancelRefine}
              onRefineInputChange={setRefineInput}
              onSubmitRefine={() => submitRefine(index)}
              onPlatformExport={handlePlatformExport}
              feedbackRating={getFeedbackFor(prompt, index)}
              onFeedback={(rating) => handleFeedback(index, prompt, rating)}
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

      {/* Feedback panel */}
      {showFeedbackPanel && feedback.length > 0 && (
        <section className="rounded-lg border border-amber-200 bg-amber-50/50 p-4 dark:border-amber-900/40 dark:bg-amber-950/10">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-amber-800 dark:text-amber-200">
              📊 你的反馈
            </h2>
            <span className="text-xs text-amber-500 dark:text-amber-400">
              {feedback.filter((f) => f.rating === 'like').length} 👍{' '}
              {feedback.filter((f) => f.rating === 'dislike').length} 👎
            </span>
          </div>
          <div className="grid gap-2 max-h-80 overflow-y-auto">
            {[...feedback].reverse().map((fb) => (
              <div
                key={fb.id}
                className="rounded-lg border border-amber-200/60 dark:border-amber-800/30 bg-white dark:bg-gray-900 p-3 space-y-1.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-gray-500">
                    {new Date(fb.timestamp).toLocaleString('zh-CN', {
                      month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
                    })}
                  </span>
                  <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                    fb.rating === 'like'
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                      : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                  }`}>
                    {fb.rating === 'like' ? '👍 满意' : '👎 不满意'}
                  </span>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
                  创意: {fb.input}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500 line-clamp-2">
                  提示词: {fb.prompt}
                </p>
                <div className="flex gap-2 items-center mt-1">
                  <input
                    type="text"
                    value={feedbackComment[fb.id] ?? fb.comment}
                    onChange={(e) => {
                      setFeedbackComment((prev) => ({ ...prev, [fb.id]: e.target.value }));
                    }}
                    onBlur={() => {
                      const val = feedbackComment[fb.id]?.trim();
                      if (val !== undefined) handleFeedbackComment(fb.id, val);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const val = (e.target as HTMLInputElement).value.trim();
                        handleFeedbackComment(fb.id, val);
                      }
                    }}
                    placeholder="有什么建议？告诉我们哪里不够好..."
                    className="flex-1 px-2 py-1 text-xs border border-gray-200 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:ring-1 focus:ring-amber-500 placeholder:text-gray-400"
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
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
  onStartRefine,
  onCancelRefine,
  onRefineInputChange,
  onSubmitRefine,
  onPlatformExport,
  feedbackRating,
  onFeedback,
}: {
  index: number;
  text: string;
  isCopied: boolean;
  isRefining: boolean;
  refiningLoading: boolean;
  refiningError: string;
  refineInput: string;
  onCopy: () => void;
  onStartRefine: () => void;
  onCancelRefine: () => void;
  onRefineInputChange: (value: string) => void;
  onSubmitRefine: () => void;
  onPlatformExport: (platform: string, text: string) => void;
  feedbackRating: 'like' | 'dislike' | null;
  onFeedback: (rating: 'like' | 'dislike') => void;
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
        <div className="flex gap-1 sm:gap-2 flex-wrap">
          <button
            type="button"
            onClick={onCopy}
            className={`text-xs px-2 sm:px-3 py-1.5 rounded-md font-medium transition-colors ${
              isCopied
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200'
                : 'bg-gray-100 hover:bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            {isCopied ? '✓ 已复制' : '复制'}
          </button>
          {/* Platform export dropdown — consolidated */}
          <div className="relative" ref={platformMenuRef}>
            <button
              type="button"
              onClick={() => setShowPlatformMenu(!showPlatformMenu)}
              className="text-xs px-2 sm:px-3 py-1.5 rounded-md font-medium bg-orange-50 text-orange-800 hover:bg-orange-100 dark:bg-orange-950/40 dark:text-orange-200 dark:hover:bg-orange-900/50 transition-colors"
            >
              导出 ▼
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
              className="text-xs px-2 sm:px-3 py-1.5 rounded-md font-medium bg-purple-50 text-purple-800 hover:bg-purple-100 dark:bg-purple-950/40 dark:text-purple-200 dark:hover:bg-purple-900/50 transition-colors"
            >
              优化
            </button>
          )}
        </div>
      </div>
      <p className="text-base sm:text-lg leading-relaxed text-gray-900 dark:text-gray-100 whitespace-pre-wrap break-words">
        {text}
      </p>

      {/* Feedback: like/dislike */}
      <div className="flex items-center gap-1.5 pt-1">
        <button
          type="button"
          onClick={() => onFeedback('like')}
          className={`text-xs px-2 py-1 rounded font-medium transition-colors ${
            feedbackRating === 'like'
              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
              : 'text-gray-400 hover:text-emerald-600 hover:bg-gray-100 dark:hover:bg-gray-800'
          }`}
          title="生成效果好"
        >
          👍 {feedbackRating === 'like' && <span className="ml-0.5 text-[10px] opacity-70">已赞</span>}
        </button>
        <button
          type="button"
          onClick={() => onFeedback('dislike')}
          className={`text-xs px-2 py-1 rounded font-medium transition-colors ${
            feedbackRating === 'dislike'
              ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
              : 'text-gray-400 hover:text-red-600 hover:bg-gray-100 dark:hover:bg-gray-800'
          }`}
          title="生成效果不好"
        >
          👎 {feedbackRating === 'dislike' && <span className="ml-0.5 text-[10px] opacity-70">已踩</span>}
        </button>
        {feedbackRating && (
          <span className="text-[10px] text-gray-400 ml-1">
            你的反馈帮助我们改进
          </span>
        )}
      </div>

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

function SkeletonCard({ index }: { index: number }) {
  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 space-y-3 animate-pulse">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded" />
        <div className="flex gap-2">
          <div className="h-7 w-14 bg-gray-200 dark:bg-gray-700 rounded-md" />
          <div className="h-7 w-20 bg-gray-200 dark:bg-gray-700 rounded-md" />
          <div className="h-7 w-20 bg-gray-200 dark:bg-gray-700 rounded-md" />
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full" />
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6" />
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-4/6" />
      </div>
    </div>
  );
}
