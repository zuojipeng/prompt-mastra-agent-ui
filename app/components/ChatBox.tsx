'use client';

import { useEffect, useState } from 'react';
import {
  createDirectorKit,
  DirectorKit,
  fetchFeedbackAnalytics,
  fetchFeedbackStats,
  fetchPromptHistory,
  fetchUserData,
  HistoryRecord,
  OptimizationResult,
  syncUserData,
  uploadFeedback,
} from '@/lib/api-client';
import type { FeedbackAnalytics } from '@/lib/api-client';
import {
  DIRECTOR_KIT_TARGET_DURATIONS,
  DIRECTOR_KIT_TARGET_TYPES,
  type DirectorKitTargetDuration,
  type DirectorKitTargetType,
} from '@/lib/director-kit-contract';
import {
  buildExecutionChecklist as buildDirectorKitExecutionChecklist,
  buildPlatformFeedPack as buildDirectorKitPlatformFeedPack,
  buildProjectSnapshot as buildDirectorKitProjectSnapshot,
  buildShotPrompt as buildDirectorKitShotPrompt,
  type DirectorKitExportContext,
  type ShotExecutionStatus,
} from '@/lib/director-kit-export';
import {
  clearLocalProjectWorkspace,
  createLocalProjectWorkspace,
  loadLocalProjectWorkspace,
  saveLocalProjectWorkspace,
  type LocalProjectWorkspace,
} from '@/lib/project-workspace';
import { DirectorKitExecutionPanel } from './DirectorKitExecutionPanel';
import { DirectorKitPlatformAdvicePanel } from './DirectorKitPlatformAdvicePanel';
import { DirectorKitShotInspector } from './DirectorKitShotInspector';
import { DirectorKitShotList } from './DirectorKitShotList';
import { FeedbackInsightPanel } from './FeedbackInsightPanel';
import { HistoryPanel } from './HistoryPanel';

const ONBOARDING_KEY = 'jingci-onboarding-done';

const MAX_INPUT_LENGTH = 2000;
function validateInput(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return '请输入视频创意';
  if (trimmed.length > MAX_INPUT_LENGTH)
    return `输入内容过长（最多 ${MAX_INPUT_LENGTH} 字）`;
  return null;
}

const FEEDBACK_KEY = 'prompt-feedback';

type FeedbackKey = string;
type FeedbackStatus = 'idle' | 'sending' | 'liked' | 'disliked' | 'error';
type FeedbackRating = 'like' | 'dislike';
type MobileWorkbenchTab = 'work' | 'execute' | 'feedback';
type WorkspaceStatus = 'idle' | 'saved' | 'restored' | 'cleared' | 'missing' | 'error';
type ShotCard = DirectorKit['shotCards'][number];
type PlatformAdvice = DirectorKit['platformAdvice'][number];

const FAILURE_REASONS = [
  '主体漂移',
  '动作太复杂',
  '平台不适配',
  'Prompt 太泛',
  '画面不稳定',
] as const;

const SHOT_EXECUTION_OPTIONS: Array<{
  status: ShotExecutionStatus;
  label: string;
  className: string;
}> = [
  {
    status: 'pending',
    label: '未生成',
    className: 'border-gray-200 bg-white text-gray-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300',
  },
  {
    status: 'generated',
    label: '已生成',
    className: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-300',
  },
  {
    status: 'failed',
    label: '翻车',
    className: 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300',
  },
  {
    status: 'usable',
    label: '可用',
    className: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300',
  },
];

async function copyTextToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return;
  } catch {}

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.left = '-9999px';
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  document.body.removeChild(textarea);
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

export function ChatBox() {
  const [input, setInput] = useState('');
  const [cloudStats, setCloudStats] = useState<{
    total: number;
    likes: number;
    dislikes: number;
    ratio: string;
  } | null>(null);
  const [feedbackAnalytics, setFeedbackAnalytics] = useState<FeedbackAnalytics | null>(null);
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const [analyticsState, setAnalyticsState] = useState<'idle' | 'loading' | 'error'>('idle');
  const [syncState, setSyncState] = useState<'idle' | 'syncing' | 'done' | 'error'>('idle');
  const [feedbackStatus, setFeedbackStatus] = useState<Record<FeedbackKey, FeedbackStatus>>({});
  const [onboardingStep, setOnboardingStep] = useState<number | null>(null);
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState('');
  const [result, setResult] = useState<OptimizationResult | null>(null);

  // ===== V2 状态 =====
  const [v2State, setV2State] = useState<'input' | 'diagnosis' | 'reconstruct' | 'result'>('input');
  const [directorKit, setDirectorKit] = useState<DirectorKit | null>(null);
  const [targetDuration, setTargetDuration] = useState<DirectorKitTargetDuration>('30s');
  const [targetType, setTargetType] = useState<DirectorKitTargetType>('wasteland');
  const [selectedVersionIndex, setSelectedVersionIndex] = useState<number | null>(null);
  const [v2Loading, setV2Loading] = useState(false);
  const [v2Error, setV2Error] = useState('');
  const [shotExecutionStatus, setShotExecutionStatus] = useState<Record<number, ShotExecutionStatus>>({});
  const [shotResultNotes, setShotResultNotes] = useState<Record<number, string>>({});
  const [mobileTab, setMobileTab] = useState<MobileWorkbenchTab>('work');
  const [selectedShotId, setSelectedShotId] = useState<number | null>(null);
  const [workspace, setWorkspace] = useState<LocalProjectWorkspace | null>(null);
  const [workspaceStatus, setWorkspaceStatus] = useState<WorkspaceStatus>('idle');
  const [copiedShotId, setCopiedShotId] = useState<number | null>(null);
  const [copiedChecklist, setCopiedChecklist] = useState(false);
  const [copiedSnapshot, setCopiedSnapshot] = useState(false);
  const [copiedPlatform, setCopiedPlatform] = useState<string | null>(null);

  const shotCards = directorKit?.shotCards ?? [];
  const executionSummary = shotCards.reduce(
    (summary, card) => {
      const status = shotExecutionStatus[card.shotId] ?? 'pending';
      summary[status] += 1;
      return summary;
    },
    { pending: 0, generated: 0, failed: 0, usable: 0 } satisfies Record<ShotExecutionStatus, number>,
  );
  const trackedShotCount = shotCards.length;
  const completedShotCount = executionSummary.generated + executionSummary.failed + executionSummary.usable;
  const executionProgress = trackedShotCount > 0 ? Math.round((completedShotCount / trackedShotCount) * 100) : 0;
  const selectedShot = shotCards.find((card) => card.shotId === selectedShotId) ?? shotCards[0] ?? null;

  const refreshFeedbackAnalytics = async () => {
    setAnalyticsState('loading');
    const analytics = await fetchFeedbackAnalytics({ days: 30, source: 'v2', limit: 5 });
    if (analytics) {
      setFeedbackAnalytics(analytics);
      setAnalyticsState('idle');
    } else {
      setAnalyticsState('error');
    }
  };

  useEffect(() => {
    refreshHistory();
    fetchFeedbackStats().then(setCloudStats).catch(() => {});
    refreshFeedbackAnalytics().catch(() => setAnalyticsState('error'));
    fetchUserData()
      .then((data) => {
        if (data?.feedback) {
          try {
            const parsed = JSON.parse(data.feedback as string);
            if (Array.isArray(parsed)) {
              localStorage.setItem(FEEDBACK_KEY, data.feedback as string);
            }
          } catch {}
        }
      })
      .catch(() => {});
    // Onboarding: show guide on first visit
    if (!localStorage.getItem(ONBOARDING_KEY)) {
      setOnboardingStep(0);
    }

    const savedWorkspace = loadLocalProjectWorkspace();
    if (savedWorkspace) {
      applyProjectWorkspace(savedWorkspace);
      setWorkspace(savedWorkspace);
      setWorkspaceStatus('restored');
    }
  }, []);

  // Onboarding: advance to step 2 when results appear
  useEffect(() => {
    if (onboardingStep !== null && result !== null && !v2Loading) {
      setOnboardingStep(2);
    }
  }, [result, v2Loading, onboardingStep]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Ctrl/Cmd + Enter → submit form
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        // Don't submit if already loading
        if (!v2Loading && input.trim() && !validateInput(input)) {
          const submitBtn = document.querySelector<HTMLButtonElement>('button[type="submit"]');
          submitBtn?.click();
        }
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [v2Loading, input]);

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

  const continueFromHistory = (record: HistoryRecord) => {
    setInput(record.userPrompt);
    if (record.result) {
      setResult(record.result);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleApplyTemplate = (template: (typeof PROMPT_TEMPLATES)[number]) => {
    setInput(template.prompt);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const submitV2Feedback = async ({
    key,
    rating,
    eventType,
    prompt,
    comment,
    shotIndex = 0,
    platform,
    generationMode,
    riskLevel,
    riskTags,
    failureReasons,
  }: {
    key: FeedbackKey;
    rating: FeedbackRating;
    eventType: 'director_kit' | 'shot_card' | 'platform_advice';
    prompt: string;
    comment?: string;
    shotIndex?: number;
    platform?: string;
    generationMode?: 'text-to-video' | 'image-to-video' | 'reference-image';
    riskLevel?: 'low' | 'medium' | 'high';
    riskTags?: string[];
    failureReasons?: string[];
  }) => {
    setFeedbackStatus((prev) => ({ ...prev, [key]: 'sending' }));
    try {
      await uploadFeedback({
        input,
        prompt,
        shotIndex,
        rating,
        comment,
        eventType,
        source: 'v2',
        targetDuration,
        targetType,
        selectedVersionType: directorKit?.selectedVersion?.versionType,
        platform,
        generationMode,
        riskLevel,
        riskTags,
        failureReasons,
      });
      setFeedbackStatus((prev) => ({ ...prev, [key]: rating === 'like' ? 'liked' : 'disliked' }));
      fetchFeedbackStats().then(setCloudStats).catch(() => {});
      refreshFeedbackAnalytics().catch(() => setAnalyticsState('error'));
    } catch {
      setFeedbackStatus((prev) => ({ ...prev, [key]: 'error' }));
    }
  };

  const renderFeedbackButtons = ({
    feedbackKey,
    onRate,
  }: {
    feedbackKey: FeedbackKey;
    onRate: (rating: FeedbackRating, failureReasons?: string[]) => void;
  }) => {
    const status = feedbackStatus[feedbackKey] ?? 'idle';
    const disabled = status === 'sending';

    return (
      <div className="flex flex-wrap items-center gap-2 pt-1">
        <button
          type="button"
          disabled={disabled}
          onClick={() => onRate('like')}
          className="rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700 hover:bg-emerald-100 disabled:opacity-60 dark:border-emerald-900/60 dark:bg-emerald-950/20 dark:text-emerald-300"
        >
          有用
        </button>
        {FAILURE_REASONS.map((reason) => (
          <button
            key={reason}
            type="button"
            disabled={disabled}
            onClick={() => onRate('dislike', [reason])}
            className="rounded-md border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            {reason}
          </button>
        ))}
        {status === 'sending' && <span className="text-[11px] text-blue-500">记录中...</span>}
        {status === 'liked' && <span className="text-[11px] text-emerald-600 dark:text-emerald-300">已记录有用</span>}
        {status === 'disliked' && <span className="text-[11px] text-amber-600 dark:text-amber-300">已记录问题</span>}
        {status === 'error' && <span className="text-[11px] text-red-500">未同步，不影响继续使用</span>}
      </div>
    );
  };

  const handleShotExecutionStatusChange = (shotId: number, status: ShotExecutionStatus) => {
    setShotExecutionStatus((prev) => ({ ...prev, [shotId]: status }));
  };

  const handleShotResultNoteChange = (shotId: number, value: string) => {
    setShotResultNotes((prev) => ({ ...prev, [shotId]: value }));
  };

  const applyProjectWorkspace = (nextWorkspace: LocalProjectWorkspace) => {
    setInput(nextWorkspace.creativeInput);
    setTargetDuration(nextWorkspace.targetDuration);
    setTargetType(nextWorkspace.targetType);
    setV2State(nextWorkspace.v2State);
    setDirectorKit(nextWorkspace.directorKit);
    setSelectedVersionIndex(nextWorkspace.selectedVersionIndex);
    setSelectedShotId(nextWorkspace.selectedShotId ?? nextWorkspace.directorKit?.shotCards?.[0]?.shotId ?? null);
    setShotExecutionStatus(nextWorkspace.shotExecutionStatus);
    setShotResultNotes(nextWorkspace.shotResultNotes);
    setCopiedShotId(null);
    setCopiedChecklist(false);
    setCopiedSnapshot(false);
    setCopiedPlatform(null);
    setV2Error('');
    setMobileTab('work');
  };

  const handleSaveWorkspace = () => {
    try {
      const nextWorkspace = createLocalProjectWorkspace(
        {
          creativeInput: input,
          targetDuration,
          targetType,
          v2State,
          directorKit,
          selectedVersionIndex,
          selectedShotId,
          shotExecutionStatus,
          shotResultNotes,
        },
        workspace,
      );
      saveLocalProjectWorkspace(nextWorkspace);
      setWorkspace(nextWorkspace);
      setWorkspaceStatus('saved');
    } catch {
      setWorkspaceStatus('error');
    }
  };

  const handleRestoreWorkspace = () => {
    const savedWorkspace = loadLocalProjectWorkspace();
    if (!savedWorkspace) {
      setWorkspaceStatus('missing');
      return;
    }
    applyProjectWorkspace(savedWorkspace);
    setWorkspace(savedWorkspace);
    setWorkspaceStatus('restored');
  };

  const getDirectorKitExportContext = (generatedAt?: string): DirectorKitExportContext => ({
    creativeInput: input,
    targetDuration,
    targetType,
    shotExecutionStatus,
    shotResultNotes,
    generatedAt,
  });

  const buildShotPrompt = (card: ShotCard) => {
    if (!directorKit) return '';
    return buildDirectorKitShotPrompt(directorKit, card);
  };

  const handleCopyShotPrompt = async (card: ShotCard) => {
    await copyTextToClipboard(buildShotPrompt(card));
    setCopiedShotId(card.shotId);
    setTimeout(() => setCopiedShotId((current) => (current === card.shotId ? null : current)), 2000);
  };

  const buildExecutionChecklist = () => {
    if (!directorKit) return '';
    return buildDirectorKitExecutionChecklist(directorKit, getDirectorKitExportContext());
  };

  const handleCopyExecutionChecklist = async () => {
    await copyTextToClipboard(buildExecutionChecklist());
    setCopiedChecklist(true);
    setTimeout(() => setCopiedChecklist(false), 2000);
  };

  const buildProjectSnapshot = () => {
    if (!directorKit) return '';
    return buildDirectorKitProjectSnapshot(directorKit, getDirectorKitExportContext(new Date().toISOString()));
  };

  const handleCopyProjectSnapshot = async () => {
    await copyTextToClipboard(buildProjectSnapshot());
    setCopiedSnapshot(true);
    setTimeout(() => setCopiedSnapshot(false), 2000);
  };

  const buildPlatformFeedPack = (advice: PlatformAdvice) => {
    if (!directorKit) return '';
    return buildDirectorKitPlatformFeedPack(directorKit, advice);
  };

  const handleCopyPlatformFeedPack = async (advice: PlatformAdvice) => {
    await copyTextToClipboard(buildPlatformFeedPack(advice));
    setCopiedPlatform(advice.platform);
    setTimeout(() => setCopiedPlatform((current) => (current === advice.platform ? null : current)), 2000);
  };

  // ===== V2 处理函数 =====

  const handleDirectorKitSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await submitDirectorKit();
  };

  const submitDirectorKit = async () => {
    const validationError = validateInput(input);
    if (validationError) {
      setV2Error(validationError);
      return;
    }
    setV2Loading(true);
    setV2Error('');
    setDirectorKit(null);
    setSelectedVersionIndex(null);
    setShotExecutionStatus({});
    setShotResultNotes({});
    setSelectedShotId(null);
    setCopiedShotId(null);
    setCopiedChecklist(false);
    setCopiedSnapshot(false);
    setCopiedPlatform(null);
    try {
      const kit = await createDirectorKit({
        message: input,
        targetDuration,
        targetType,
      });
      setDirectorKit(kit);
      setSelectedShotId(kit.shotCards?.[0]?.shotId ?? null);
      setV2State('diagnosis');
    } catch (err) {
      setV2Error(err instanceof Error ? err.message : '创意体检失败，请重试');
    } finally {
      setV2Loading(false);
    }
  };

  const handleRetryDirectorKit = async () => {
    await submitDirectorKit();
  };

  const handleSelectVersion = (index: number) => {
    setSelectedVersionIndex(index);
  };

  const handleConfirmVersion = () => {
    if (selectedVersionIndex === null || !directorKit) return;
    const updated: DirectorKit = {
      ...directorKit,
      selectedVersion: directorKit.versions[selectedVersionIndex],
    };
    setDirectorKit(updated);
    setV2State('result');
  };

  const handleResetV2 = () => {
    setV2State('input');
    setDirectorKit(null);
    setSelectedVersionIndex(null);
    setShotExecutionStatus({});
    setShotResultNotes({});
    setSelectedShotId(null);
    setCopiedShotId(null);
    setCopiedChecklist(false);
    setCopiedSnapshot(false);
    setCopiedPlatform(null);
    setV2Error('');
    setInput('');
    setTargetDuration('30s');
    setTargetType('wasteland');
  };

  const handleClearWorkspace = () => {
    clearLocalProjectWorkspace();
    setWorkspace(null);
    setWorkspaceStatus('cleared');
    handleResetV2();
  };

  const handleReturnToEdit = () => {
    setV2State('input');
    setDirectorKit(null);
    setSelectedVersionIndex(null);
    setShotExecutionStatus({});
    setShotResultNotes({});
    setSelectedShotId(null);
    setCopiedShotId(null);
    setCopiedChecklist(false);
    setCopiedSnapshot(false);
    setCopiedPlatform(null);
    setV2Error('');
  };

  const handleSyncFeedback = async () => {
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
      await refreshFeedbackAnalytics();
    } catch {
      setSyncState('error');
    }
    setTimeout(() => setSyncState('idle'), 3000);
  };

  const targetTypeLabel = DIRECTOR_KIT_TARGET_TYPES.find((type) => type.id === targetType)?.label ?? targetType;
  const projectTitle = input.trim() ? input.trim().slice(0, 18) : '未命名短片';
  const workspaceUpdatedAt = workspace?.updatedAt
    ? new Intl.DateTimeFormat('zh-CN', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(workspace.updatedAt))
    : null;
  const workspaceStatusLabel =
    workspaceStatus === 'saved'
      ? '项目已保存'
      : workspaceStatus === 'restored'
        ? '已恢复最近项目'
        : workspaceStatus === 'cleared'
          ? '项目已清空'
          : workspaceStatus === 'missing'
            ? '没有可恢复的项目'
            : workspaceStatus === 'error'
              ? '项目保存失败'
              : workspaceUpdatedAt
                ? `最近保存 ${workspaceUpdatedAt}`
                : '本地项目尚未保存';
  const stageItems = [
    { id: 'idea', label: 'Idea', done: !!input.trim(), active: v2State === 'input' },
    { id: 'diagnosis', label: 'Diagnosis', done: !!directorKit, active: v2State === 'diagnosis' },
    { id: 'versions', label: 'Versions', done: !!directorKit?.selectedVersion, active: v2State === 'reconstruct' },
    { id: 'director', label: 'DirectorKit', done: v2State === 'result', active: v2State === 'result' },
    { id: 'execution', label: 'Execution', done: completedShotCount > 0, active: v2State === 'result' && completedShotCount < trackedShotCount },
    { id: 'feedback', label: 'Feedback', done: !!feedbackAnalytics?.total, active: analyticsOpen },
  ];
  const currentStageLabel = stageItems.find((stage) => stage.active)?.label ?? 'Idea';
  const mobileTabs: Array<{ id: MobileWorkbenchTab; label: string; value: string }> = [
    { id: 'work', label: 'Work', value: currentStageLabel },
    { id: 'execute', label: 'Execute', value: trackedShotCount ? `${completedShotCount}/${trackedShotCount}` : '0/0' },
    { id: 'feedback', label: 'Feedback', value: feedbackAnalytics?.total ? `${feedbackAnalytics.total}` : '--' },
  ];
  const diagnosisScore = directorKit?.diagnosis.feasibilityScore;
  const diagnosisRiskLabel =
    directorKit?.diagnosis.riskLevel === 'low'
      ? '低风险'
      : directorKit?.diagnosis.riskLevel === 'medium'
        ? '中风险'
        : directorKit?.diagnosis.riskLevel === 'high'
          ? '高风险'
          : '待体检';

  return (
    <div className="w-full max-w-[1680px] mx-auto pb-20 animate-in fade-in duration-300 lg:pb-0">
      <div className="mb-4 rounded-lg border border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-900">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-gray-400">Jingci Workbench</p>
            <h1 className="mt-1 truncate text-base font-semibold text-gray-950 dark:text-gray-50">{projectTitle}</h1>
          </div>
          <div className="grid grid-cols-3 gap-2 text-xs sm:flex sm:items-center">
            <div className="rounded-md bg-gray-50 px-3 py-2 dark:bg-gray-800">
              <p className="text-[10px] text-gray-400">Stage</p>
              <p className="mt-0.5 font-semibold text-gray-800 dark:text-gray-100">{currentStageLabel}</p>
            </div>
            <div className="rounded-md bg-gray-50 px-3 py-2 dark:bg-gray-800">
              <p className="text-[10px] text-gray-400">Health</p>
              <p className="mt-0.5 font-semibold tabular-nums text-gray-800 dark:text-gray-100">
                {diagnosisScore ?? '--'}
              </p>
            </div>
            <div className="rounded-md bg-gray-50 px-3 py-2 dark:bg-gray-800">
              <p className="text-[10px] text-gray-400">Progress</p>
              <p className="mt-0.5 font-semibold tabular-nums text-gray-800 dark:text-gray-100">
                {trackedShotCount ? `${completedShotCount}/${trackedShotCount}` : '0/0'}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-3 gap-1 rounded-lg border border-gray-200 bg-white p-1 dark:border-gray-800 dark:bg-gray-900 lg:hidden">
        {mobileTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setMobileTab(tab.id)}
            className={`rounded-md px-2 py-2 text-left transition-colors ${
              mobileTab === tab.id
                ? 'bg-gray-950 text-white dark:bg-gray-100 dark:text-gray-950'
                : 'text-gray-500 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-800'
            }`}
          >
            <span className="block text-xs font-semibold">{tab.label}</span>
            <span className="mt-0.5 block truncate text-[10px] opacity-70">{tab.value}</span>
          </button>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[240px_minmax(0,1fr)_320px] lg:grid-cols-[220px_minmax(0,1fr)]">
        <aside className={`${mobileTab === 'work' ? 'block' : 'hidden'} space-y-4 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900 lg:sticky lg:top-20 lg:block lg:self-start`}>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-400">Project</p>
            <p className="mt-2 line-clamp-3 text-sm font-medium text-gray-900 dark:text-gray-100">
              {input.trim() || '输入创意后生成项目上下文'}
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <span className="rounded bg-gray-100 px-2 py-1 text-[11px] font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                {targetDuration}
              </span>
              <span className="rounded bg-gray-100 px-2 py-1 text-[11px] font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                {targetTypeLabel}
              </span>
              <span className="rounded bg-gray-100 px-2 py-1 text-[11px] font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                {diagnosisRiskLabel}
              </span>
            </div>
          </div>

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-400">Stages</p>
            <div className="mt-3 grid gap-2">
              {stageItems.map((stage) => (
                <div key={stage.id} className="flex items-center gap-2 text-xs">
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${
                      stage.done
                        ? 'bg-emerald-500'
                        : stage.active
                          ? 'bg-cyan-600 ring-4 ring-cyan-100 dark:ring-cyan-950'
                          : 'bg-gray-200 dark:bg-gray-700'
                    }`}
                  />
                  <span
                    className={
                      stage.active
                        ? 'font-semibold text-gray-900 dark:text-gray-100'
                        : 'text-gray-500 dark:text-gray-400'
                    }
                  >
                    {stage.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-md bg-gray-50 p-3 dark:bg-gray-800/70">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] font-semibold text-gray-700 dark:text-gray-300">Snapshot</p>
              <span
                className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                  workspaceStatus === 'error'
                    ? 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300'
                    : workspaceStatus === 'saved' || workspaceStatus === 'restored'
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                      : 'bg-gray-100 text-gray-500 dark:bg-gray-900 dark:text-gray-400'
                }`}
              >
                {workspaceStatusLabel}
              </span>
            </div>
            <p className="mt-1 text-[11px] leading-5 text-gray-500 dark:text-gray-400">
              {directorKit?.selectedVersion?.label ?? '选择重构版本后形成导演执行包。'}
            </p>
            <div className="mt-3 grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={handleSaveWorkspace}
                disabled={!input.trim() && !directorKit}
                className="rounded-md border border-gray-200 bg-white px-2 py-1.5 text-[11px] font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                保存
              </button>
              <button
                type="button"
                onClick={handleRestoreWorkspace}
                className="rounded-md border border-gray-200 bg-white px-2 py-1.5 text-[11px] font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                恢复
              </button>
              <button
                type="button"
                onClick={handleClearWorkspace}
                className="rounded-md border border-gray-200 bg-white px-2 py-1.5 text-[11px] font-medium text-gray-500 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800"
              >
                清空
              </button>
            </div>
          </div>
        </aside>

        <section className={`${mobileTab === 'work' ? 'block' : 'hidden'} min-w-0 space-y-6 lg:block`}>
      {/* Onboarding guide — first visit only, progressive steps */}
      {onboardingStep !== null && (
        <div className={`rounded-xl border border-emerald-200 dark:border-emerald-800/40 bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-950/20 dark:to-gray-900 p-5 space-y-4 ${
          onboardingStep >= 2 ? 'opacity-80 scale-[0.98]' : ''
        }`}>
          <div className="flex items-center gap-3">
            <span className="text-2xl">🎬</span>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
                三步上手
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {onboardingStep === 0 && '输入视频创意，开始你的第一个作品'}
                {onboardingStep === 1 && '正在生成画面描述...'}
                {onboardingStep === 2 && '复制提示词到视频平台，一键创作！'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                localStorage.setItem(ONBOARDING_KEY, '1');
                setOnboardingStep(null);
              }}
              className="text-xs px-3 py-1.5 rounded-md font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 transition-colors shrink-0"
            >
              跳过
            </button>
          </div>
          <div className="flex gap-2">
            {[
              { num: 0, label: '输入创意', desc: '' },
              { num: 1, label: '生成描述', desc: '' },
              { num: 2, label: '复制到平台', desc: '' },
            ].map((step) => {
              const isDone = onboardingStep > step.num;
              const isActive = onboardingStep === step.num;
              return (
                <div
                  key={step.num}
                  className={`flex-1 rounded-lg p-2.5 text-center transition-all duration-300 ${
                    isDone
                      ? 'bg-emerald-100 dark:bg-emerald-900/30'
                      : isActive
                        ? 'bg-emerald-100 dark:bg-emerald-900/30 ring-1 ring-emerald-300 dark:ring-emerald-700'
                        : 'bg-gray-50 dark:bg-gray-800/50'
                  }`}
                >
                  <div className={`text-lg font-bold ${
                    isDone
                      ? 'text-emerald-500 dark:text-emerald-400'
                      : isActive
                        ? 'text-emerald-600 dark:text-emerald-300'
                        : 'text-gray-300 dark:text-gray-600'
                  }`}>
                    {isDone ? '✓' : step.num + 1}
                  </div>
                  <div className={`text-[11px] mt-0.5 ${
                    isDone
                      ? 'text-emerald-600 dark:text-emerald-300 font-medium'
                      : isActive
                        ? 'text-emerald-700 dark:text-emerald-200 font-medium'
                        : 'text-gray-400 dark:text-gray-500'
                  }`}>
                    {step.label}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Hero — minimal */}
      <div className="text-center">
        {!result && !v2Loading && (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            输入创意，秒出画面描述
          </p>
        )}
      </div>

      {/* Empty state hint — only when onboarding is not active */}
      {!result && !v2Loading && onboardingStep === null && (
        <div className="text-center py-8">
          <p className="text-sm text-gray-400 dark:text-gray-500 mb-1">
            输入你的视频创意，3 秒出中文画面描述
          </p>
          <p className="text-[11px] text-gray-300 dark:text-gray-600">
            可直接复制到小云雀、Seedance、可灵等平台使用
          </p>
        </div>
      )}

      <form onSubmit={handleDirectorKitSubmit} className="space-y-3">
        <div>
          <textarea
            id="prompt"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="例如：雨夜街头，一个女孩回头..."
            className="w-full min-h-[100px] px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none text-sm"
            disabled={v2Loading}
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

        {/* 目标时长选择器 */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-gray-500">目标时长</span>
          {DIRECTOR_KIT_TARGET_DURATIONS.map((d) => (
            <button
              key={d}
              type="button"
              disabled={v2Loading}
              onClick={() => setTargetDuration(d)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                targetDuration === d
                  ? 'bg-emerald-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400'
              }`}
            >
              {d}
            </button>
          ))}
        </div>

        {/* 类型偏好选择器 */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-gray-500">类型偏好</span>
          {DIRECTOR_KIT_TARGET_TYPES.map((t) => (
            <button
              key={t.id}
              type="button"
              disabled={v2Loading}
              onClick={() => setTargetType(t.id)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                targetType === t.id
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Templates as inline suggestions */}
        {!input && !directorKit && !v2Loading && (
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

        {/* V2 错误提示 */}
        {v2Error && (
          <div
            role="alert"
            className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 flex flex-col gap-3 sm:flex-row sm:items-center"
          >
            <p className="text-sm text-red-600 dark:text-red-400 flex-1">{v2Error}</p>
            <button
              type="button"
              onClick={handleRetryDirectorKit}
              disabled={v2Loading || !!validateInput(input)}
              className="px-3 py-1.5 rounded-md text-xs font-medium bg-red-600 text-white hover:bg-red-700 disabled:bg-gray-300 disabled:text-gray-500 dark:disabled:bg-gray-700 dark:disabled:text-gray-400 transition-colors"
            >
              重试生成
            </button>
          </div>
        )}

        {v2Loading && (
          <div
            aria-live="polite"
            className="rounded-xl border border-emerald-200 dark:border-emerald-800/50 bg-emerald-50 dark:bg-emerald-950/20 p-4"
          >
            <div className="flex items-center gap-3">
              <span className="w-4 h-4 border-2 border-emerald-500/30 border-t-emerald-600 rounded-full animate-spin shrink-0" />
              <div>
                <p className="text-sm font-medium text-emerald-800 dark:text-emerald-200">
                  正在生成导演执行包
                </p>
                <p className="text-xs text-emerald-700/80 dark:text-emerald-300/80 mt-0.5">
                  正在体检创意、重构版本并拆解分镜策略，请保持当前页面。
                </p>
              </div>
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={v2Loading}
          className="w-full px-6 py-3 bg-emerald-700 hover:bg-emerald-800 disabled:bg-gray-400 text-white font-medium rounded-xl transition-colors duration-200 flex items-center justify-center gap-2 text-sm"
        >
          {v2Loading ? (
            <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> 体检中</>
          ) : (
            <>🩺 先做创意体检</>
          )}
        </button>
      </form>

      {/* ===== V2 创意体检（诊断区） ===== */}
      {v2State === 'diagnosis' && directorKit && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* 诊断结果 */}
          <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                🩺 创意体检报告
              </h2>
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                directorKit.diagnosis.riskLevel === 'low'
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                  : directorKit.diagnosis.riskLevel === 'medium'
                    ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300'
                    : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
              }`}>
                {directorKit.diagnosis.riskLevel === 'low' ? '低风险' : directorKit.diagnosis.riskLevel === 'medium' ? '中风险' : '高风险'}
              </span>
            </div>

            {/* 可拍性评分 */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">可拍性评分</span>
                <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{directorKit.diagnosis.feasibilityScore}/100</span>
              </div>
              <div className="w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${directorKit.diagnosis.feasibilityScore}%`,
                    backgroundColor:
                      directorKit.diagnosis.feasibilityScore >= 70
                        ? '#10b981'
                        : directorKit.diagnosis.feasibilityScore >= 40
                          ? '#f59e0b'
                          : '#ef4444',
                  }}
                />
              </div>
            </div>

            {/* 风险标签 */}
            {(directorKit.diagnosis.keyRisks ?? []).length > 0 && (
              <div className="space-y-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">⚠️ 关键风险</span>
                <div className="flex flex-wrap gap-2">
                  {(directorKit.diagnosis.keyRisks ?? []).map((risk, i) => (
                    <span
                      key={i}
                      className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                        directorKit.diagnosis.riskLevel === 'high'
                          ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                          : directorKit.diagnosis.riskLevel === 'medium'
                            ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300'
                            : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                      }`}
                    >
                      {risk}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* 改造建议 */}
            {(directorKit.diagnosis.suggestedAdjustments ?? []).length > 0 && (
              <div className="space-y-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">🔧 改造建议</span>
                <ul className="space-y-1.5">
                  {(directorKit.diagnosis.suggestedAdjustments ?? []).map((adj, i) => (
                    <li key={i} className="text-sm text-gray-600 dark:text-gray-400 flex items-start gap-2">
                      <span className="text-emerald-500 mt-0.5">•</span>
                      {adj}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* 推荐方向 */}
            {directorKit.diagnosis.recommendedDirection && (
              <div className="p-4 rounded-lg bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-800/40">
                <span className="text-sm font-medium text-indigo-700 dark:text-indigo-300">🎯 推荐方向</span>
                <p className="text-sm text-indigo-600 dark:text-indigo-400 mt-1">{directorKit.diagnosis.recommendedDirection}</p>
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setV2State('reconstruct')}
              className="flex-1 px-6 py-3 bg-indigo-700 hover:bg-indigo-800 text-white font-medium rounded-xl transition-colors text-sm"
            >
              查看重构版本 →
            </button>
            <button
              type="button"
              onClick={handleReturnToEdit}
              className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 font-medium rounded-xl transition-colors text-sm"
            >
              返回修改
            </button>
          </div>
        </div>
      )}

      {/* ===== V2 重构选择 ===== */}
      {v2State === 'reconstruct' && directorKit && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
            🎨 选择重构版本
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">选择一个版本，生成完整的导演执行包</p>
          <div className="grid gap-4 md:grid-cols-3" role="radiogroup" aria-label="重构版本">
            {directorKit.versions.map((version, i) => (
              <div
                key={i}
                role="radio"
                aria-checked={selectedVersionIndex === i}
                tabIndex={0}
                onClick={() => handleSelectVersion(i)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    handleSelectVersion(i);
                  }
                  if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
                    event.preventDefault();
                    handleSelectVersion((i + 1) % directorKit.versions.length);
                  }
                  if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
                    event.preventDefault();
                    handleSelectVersion((i - 1 + directorKit.versions.length) % directorKit.versions.length);
                  }
                }}
                className={`rounded-xl border-2 p-5 cursor-pointer transition-all space-y-3 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 dark:focus:ring-offset-gray-950 ${
                  selectedVersionIndex === i
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/20 dark:border-emerald-600 shadow-md'
                    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-bold px-2 py-1 rounded ${
                    version.versionType === 'safest'
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                      : version.versionType === 'stylish'
                        ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
                        : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                  }`}>
                    {version.versionType === 'safest' ? '🛡 最稳妥' : version.versionType === 'stylish' ? '✨ 最风格化' : '🎬 最电影感'}
                  </span>
                  {selectedVersionIndex === i && <span className="text-emerald-600 text-lg">✓</span>}
                </div>
                <h3 className="font-bold text-gray-900 dark:text-gray-100">{version.label}</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-3">{version.summary}</p>
                <div className="text-xs text-gray-600 dark:text-gray-300 space-y-1">
                  <p><span className="font-medium">为什么有效：</span>{version.whyThisWorks}</p>
                  <p><span className="font-medium">最佳适用：</span>{version.bestFor}</p>
                </div>
                {version.reducedRisks.length > 0 && (
                  <div className="space-y-1">
                    <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">降低的风险：</span>
                    <ul className="text-[11px] text-gray-500 dark:text-gray-400 space-y-0.5">
                      {version.reducedRisks.map((risk, ri) => (
                        <li key={ri} className="flex items-start gap-1">• {risk}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <p className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 p-3 rounded-lg italic line-clamp-3">
                  &ldquo;{version.rewrittenIdea}&rdquo;
                </p>
              </div>
            ))}
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleConfirmVersion}
              disabled={selectedVersionIndex === null}
              className="flex-1 px-6 py-3 bg-emerald-700 hover:bg-emerald-800 disabled:bg-gray-400 text-white font-medium rounded-xl transition-colors text-sm"
            >
              {selectedVersionIndex !== null ? '用此版本生成执行包 →' : '请选择一个版本'}
            </button>
            <button
              type="button"
              onClick={() => setV2State('diagnosis')}
              className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 font-medium rounded-xl transition-colors text-sm"
            >
              返回诊断
            </button>
          </div>
        </div>
      )}

      {/* ===== V2 结果页（导演执行包） ===== */}
      {v2State === 'result' && directorKit && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
              🎬 导演执行包
            </h2>
            <button
              type="button"
              onClick={handleResetV2}
              className="text-xs px-3 py-1.5 rounded-md font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors"
            >
              重新开始
            </button>
          </div>
          {renderFeedbackButtons({
            feedbackKey: 'director-kit',
            onRate: (rating, failureReasons) =>
              submitV2Feedback({
                key: 'director-kit',
                rating,
                eventType: 'director_kit',
                prompt: directorKit.masterPrompt,
                comment: rating === 'like' ? '导演执行包整体有用' : '导演执行包整体存在问题',
                failureReasons,
              }),
          })}
          {(!(directorKit.shotCards ?? []).length || !directorKit.masterPrompt) && (
            <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20 p-4">
              <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                执行包内容不完整
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                当前结果缺少关键分镜或主 Prompt，可返回修改创意后重新生成。
              </p>
            </div>
          )}

          {/* 故事设定 */}
          {directorKit.storySetting && (
            <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 space-y-3">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">📖 故事设定</h3>
              <div className="grid gap-2 text-sm">
                <p><span className="font-medium text-gray-500 dark:text-gray-400">核心梗概：</span>{directorKit.storySetting.logline}</p>
                <p><span className="font-medium text-gray-500 dark:text-gray-400">导演意图：</span>{directorKit.storySetting.directorIntent}</p>
                <p><span className="font-medium text-gray-500 dark:text-gray-400">主角：</span>{directorKit.storySetting.protagonist}</p>
                <p><span className="font-medium text-gray-500 dark:text-gray-400">世界观：</span>{directorKit.storySetting.worldSetting}</p>
                <p><span className="font-medium text-gray-500 dark:text-gray-400">视觉主题：</span>{directorKit.storySetting.visualMotif}</p>
              </div>
            </div>
          )}

          {/* 分镜卡片 */}
          <DirectorKitShotList
            shotCards={directorKit.shotCards ?? []}
            copiedShotId={copiedShotId}
            shotExecutionStatus={shotExecutionStatus}
            shotExecutionOptions={SHOT_EXECUTION_OPTIONS}
            shotResultNotes={shotResultNotes}
            selectedShotId={selectedShot?.shotId ?? null}
            onCopyShotPrompt={handleCopyShotPrompt}
            onStatusChange={handleShotExecutionStatusChange}
            onShotResultNoteChange={handleShotResultNoteChange}
            onSelectShot={(card) => {
              setSelectedShotId(card.shotId);
              setMobileTab('execute');
            }}
            renderFeedback={(card) =>
              renderFeedbackButtons({
                feedbackKey: `shot-${card.shotId}`,
                onRate: (rating, failureReasons) =>
                  submitV2Feedback({
                    key: `shot-${card.shotId}`,
                    rating,
                    eventType: 'shot_card',
                    prompt: `${card.description}\n${card.action}`,
                    comment: rating === 'like' ? '分镜建议有用' : '分镜生成存在问题',
                    shotIndex: card.shotId,
                    generationMode: card.generationMode,
                    riskLevel: card.riskLevel,
                    riskTags: card.riskTags,
                    failureReasons,
                  }),
              })
            }
          />

          {/* 主 Prompt */}
          {directorKit.masterPrompt && (
            <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 space-y-2">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">📝 主 Prompt</h3>
              <p className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap break-words">{directorKit.masterPrompt}</p>
              {directorKit.negativePrompt && (
                <>
                  <h4 className="font-medium text-sm text-gray-500 dark:text-gray-400 mt-3">Negative Prompt</h4>
                  <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words">{directorKit.negativePrompt}</p>
                </>
              )}
            </div>
          )}

          <DirectorKitPlatformAdvicePanel
            platformAdvice={directorKit.platformAdvice ?? []}
            copiedPlatform={copiedPlatform}
            onCopyPlatformFeedPack={handleCopyPlatformFeedPack}
            renderFeedback={(advice) =>
              renderFeedbackButtons({
                feedbackKey: `platform-${advice.platform}`,
                onRate: (rating, failureReasons) =>
                  submitV2Feedback({
                    key: `platform-${advice.platform}`,
                    rating,
                    eventType: 'platform_advice',
                    prompt: advice.note,
                    comment: rating === 'like' ? '平台建议有用' : '平台建议不适配',
                    platform: advice.platform,
                    failureReasons,
                  }),
              })
            }
          />

          {/* 后期建议 */}
          {directorKit.postProductionAdvice && (
            <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 space-y-3">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">✂️ 后期制作建议</h3>
              <div className="grid gap-3 text-sm">
                <p><span className="font-medium text-gray-500 dark:text-gray-400">剪辑节奏：</span>{directorKit.postProductionAdvice.editingRhythm}</p>
                <p><span className="font-medium text-gray-500 dark:text-gray-400">音效：</span>{(directorKit.postProductionAdvice.soundEffects ?? []).join('、')}</p>
                <p><span className="font-medium text-gray-500 dark:text-gray-400">配乐：</span>{directorKit.postProductionAdvice.music}</p>
                <p><span className="font-medium text-gray-500 dark:text-gray-400">字幕：</span>{directorKit.postProductionAdvice.subtitles}</p>
              </div>
            </div>
          )}

          {/* 风险补救 */}
          {directorKit.riskRemediation && (
            <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 space-y-3">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">⚠️ 风险补救</h3>
              <div className="space-y-3 text-sm">
                <div>
                  <span className="font-medium text-gray-500 dark:text-gray-400">首要风险</span>
                  <ul className="mt-1 space-y-1">
                    {(directorKit.riskRemediation.topRisks ?? []).map((risk, i) => (
                      <li key={i} className="text-gray-600 dark:text-gray-400 flex items-start gap-2">
                        <span className="text-red-500 mt-0.5">•</span>{risk}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <span className="font-medium text-gray-500 dark:text-gray-400">替代镜头方案</span>
                  <ul className="mt-1 space-y-1">
                    {(directorKit.riskRemediation.alternativeShots ?? []).map((alt, i) => (
                      <li key={i} className="text-gray-600 dark:text-gray-400 flex items-start gap-2">
                        <span className="text-amber-500 mt-0.5">•</span>{alt}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <span className="font-medium text-gray-500 dark:text-gray-400">备用策略</span>
                  <ul className="mt-1 space-y-1">
                    {(directorKit.riskRemediation.backupStrategies ?? []).map((strategy, i) => (
                      <li key={i} className="text-gray-600 dark:text-gray-400 flex items-start gap-2">
                        <span className="text-emerald-500 mt-0.5">•</span>{strategy}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* 选中的重构版本摘要 */}
          {directorKit.selectedVersion && (
            <div className="rounded-xl border border-emerald-200 dark:border-emerald-800/40 bg-emerald-50 dark:bg-emerald-950/20 p-5 space-y-2">
              <h3 className="font-semibold text-emerald-700 dark:text-emerald-300">✅ 选中的重构版本</h3>
              <p className="font-medium text-gray-900 dark:text-gray-100">{directorKit.selectedVersion.label}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">{directorKit.selectedVersion.summary}</p>
            </div>
          )}
        </div>
      )}

      <HistoryPanel
        history={history}
        loading={historyLoading}
        error={historyError}
        onRefresh={refreshHistory}
        onContinue={continueFromHistory}
        onCopy={(text) => {
          copyTextToClipboard(text).catch(() => {});
        }}
      />

        </section>

        <aside className={`${mobileTab === 'execute' || mobileTab === 'feedback' ? 'block' : 'hidden'} space-y-4 lg:col-span-2 lg:block xl:col-span-1 xl:sticky xl:top-20 xl:self-start`}>
          <div className={`${mobileTab === 'feedback' ? 'hidden' : 'block'} rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900 lg:block`}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-400">Operations</p>
                <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-gray-100">下一步</p>
              </div>
              <button
                type="button"
                onClick={handleSyncFeedback}
                disabled={syncState === 'syncing'}
                className="rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                同步
                {syncState === 'syncing' && <span className="ml-1 text-blue-500">...</span>}
                {syncState === 'done' && <span className="ml-1 text-emerald-500">✓</span>}
                {syncState === 'error' && <span className="ml-1 text-red-500">✗</span>}
              </button>
            </div>

            {cloudStats && (() => {
              const ratedTotal = cloudStats.total;
              const pct = ratedTotal > 0 ? Math.round((cloudStats.likes / ratedTotal) * 100) : 0;
              return (
                <div className="mt-4 rounded-md bg-gray-50 p-3 dark:bg-gray-800/70">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500 dark:text-gray-400">反馈好评率</span>
                    <span className="font-semibold tabular-nums text-gray-900 dark:text-gray-100">{pct}%</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: pct > 60 ? '#10b981' : pct > 30 ? '#f59e0b' : '#ef4444',
                      }}
                    />
                  </div>
                  <p className="mt-2 text-[10px] text-gray-400">{cloudStats.likes}/{ratedTotal} 条有效反馈</p>
                </div>
              );
            })()}
          </div>

          <div className={mobileTab === 'feedback' ? 'hidden lg:block' : 'block'}>
            <DirectorKitExecutionPanel
              completedShotCount={completedShotCount}
              trackedShotCount={trackedShotCount}
              executionProgress={executionProgress}
              executionSummary={executionSummary}
              shotExecutionOptions={SHOT_EXECUTION_OPTIONS}
              copiedChecklist={copiedChecklist}
              copiedSnapshot={copiedSnapshot}
              onCopyExecutionChecklist={handleCopyExecutionChecklist}
              onCopyProjectSnapshot={handleCopyProjectSnapshot}
            />
          </div>

          <div className={mobileTab === 'execute' ? 'block lg:hidden' : 'hidden'}>
            <DirectorKitShotInspector
              shot={selectedShot}
              copiedShotId={copiedShotId}
              currentStatus={selectedShot ? shotExecutionStatus[selectedShot.shotId] ?? 'pending' : 'pending'}
              shotExecutionOptions={SHOT_EXECUTION_OPTIONS}
              resultNote={selectedShot ? shotResultNotes[selectedShot.shotId] ?? '' : ''}
              onCopyShotPrompt={handleCopyShotPrompt}
              onStatusChange={handleShotExecutionStatusChange}
              onShotResultNoteChange={handleShotResultNoteChange}
              renderFeedback={(card) =>
                renderFeedbackButtons({
                  feedbackKey: `shot-${card.shotId}`,
                  onRate: (rating, failureReasons) =>
                    submitV2Feedback({
                      key: `shot-${card.shotId}`,
                      rating,
                      eventType: 'shot_card',
                      prompt: `${card.description}\n${card.action}`,
                      comment: rating === 'like' ? '分镜建议有用' : '分镜生成存在问题',
                      shotIndex: card.shotId,
                      generationMode: card.generationMode,
                      riskLevel: card.riskLevel,
                      riskTags: card.riskTags,
                      failureReasons,
                    }),
                })
              }
            />
          </div>

          <div className={`${mobileTab === 'execute' ? 'hidden' : 'block'} rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900 lg:block`}>
            <button
              type="button"
              onClick={() => setAnalyticsOpen((open) => !open)}
              className="flex w-full items-center justify-between rounded-md border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
              aria-expanded={analyticsOpen}
            >
              <span>反馈洞察</span>
              <span>{analyticsOpen ? '收起' : '展开'}</span>
            </button>
            <div className="mt-3">
              <FeedbackInsightPanel open={analyticsOpen} state={analyticsState} analytics={feedbackAnalytics} />
            </div>
          </div>
        </aside>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-gray-200 bg-white/95 px-4 py-3 backdrop-blur dark:border-gray-800 dark:bg-gray-950/95 lg:hidden">
        {mobileTab === 'work' && (
          <button
            type="button"
            onClick={() => {
              if (v2State === 'result') {
                setMobileTab('execute');
              } else {
                submitDirectorKit().catch(() => {});
              }
            }}
            disabled={v2Loading || (v2State !== 'result' && !!validateInput(input))}
            className="w-full rounded-lg bg-gray-950 px-4 py-3 text-sm font-semibold text-white disabled:bg-gray-300 disabled:text-gray-500 dark:bg-gray-100 dark:text-gray-950 dark:disabled:bg-gray-800 dark:disabled:text-gray-500"
          >
            {v2State === 'result' ? '进入执行视图' : v2Loading ? '生成中...' : '提交创意'}
          </button>
        )}
        {mobileTab === 'execute' && (
          <button
            type="button"
            onClick={handleCopyExecutionChecklist}
            disabled={!trackedShotCount}
            className="w-full rounded-lg bg-gray-950 px-4 py-3 text-sm font-semibold text-white disabled:bg-gray-300 disabled:text-gray-500 dark:bg-gray-100 dark:text-gray-950 dark:disabled:bg-gray-800 dark:disabled:text-gray-500"
          >
            复制清单
          </button>
        )}
        {mobileTab === 'feedback' && (
          <button
            type="button"
            onClick={() => {
              setAnalyticsOpen(true);
              refreshFeedbackAnalytics().catch(() => setAnalyticsState('error'));
            }}
            className="w-full rounded-lg bg-gray-950 px-4 py-3 text-sm font-semibold text-white dark:bg-gray-100 dark:text-gray-950"
          >
            刷新洞察
          </button>
        )}
      </div>
    </div>
  );
}
