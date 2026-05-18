'use client';

import { useEffect, useState } from 'react';
import {
  fetchPromptHistory,
  ContinuityPlan,
  HistoryRecord,
  optimizePrompt,
  OptimizationResult,
  PlatformVariant,
  ProjectBible,
  PromptVersion,
  RefinementRequest,
  RefinementTargetType,
  TimelineSegment,
} from '@/lib/api-client';
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

function splitList(value: string): string[] | undefined {
  const items = value
    .split(/[,，、\n]/)
    .map((item) => item.trim())
    .filter(Boolean);

  return items.length ? items : undefined;
}

function buildProjectBible(values: typeof EMPTY_PROJECT_BIBLE): ProjectBible | undefined {
  const projectBible: ProjectBible = {
    ...(values.protagonist.trim() ? { protagonist: values.protagonist.trim() } : {}),
    ...(values.mission.trim() ? { mission: values.mission.trim() } : {}),
    ...(values.world.trim() ? { world: values.world.trim() } : {}),
    ...(splitList(values.visualSymbols) ? { visualSymbols: splitList(values.visualSymbols) } : {}),
    ...(values.lookAndFeel.trim() ? { lookAndFeel: values.lookAndFeel.trim() } : {}),
    ...(splitList(values.continuityRules) ? { continuityRules: splitList(values.continuityRules) } : {}),
    ...(values.shotIntent.trim() ? { shotIntent: values.shotIntent.trim() } : {}),
  };

  return Object.keys(projectBible).length ? projectBible : undefined;
}

const EMPTY_PROJECT_BIBLE: Required<Record<keyof ProjectBible, string>> = {
  protagonist: '',
  mission: '',
  world: '',
  visualSymbols: '',
  lookAndFeel: '',
  continuityRules: '',
  shotIntent: '',
};

export function ChatBox() {
  const [input, setInput] = useState('');
  const [style, setStyle] = useState('');
  const [result, setResult] = useState<OptimizationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copiedLabel, setCopiedLabel] = useState('');
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState('');
  const [pendingRefinement, setPendingRefinement] = useState<RefinementRequest | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [projectBibleForm, setProjectBibleForm] = useState(EMPTY_PROJECT_BIBLE);
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

    const projectBible = buildProjectBible(projectBibleForm);

    try {
      const optimization = await optimizePrompt(input, {
        ...(style ? { style } : {}),
        ...(projectBible ? { projectBible } : {}),
        ...(pendingRefinement ? { refinement: pendingRefinement } : {}),
      });
      setResult(optimization);
      setPendingRefinement(null);
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
    setPendingRefinement(null);
    setHistory([]);
  };

  const updateProjectBible = (key: keyof typeof projectBibleForm, value: string) => {
    setProjectBibleForm((current) => ({ ...current, [key]: value }));
  };

  const copyToClipboard = async (text: string, label = '内容') => {
    await navigator.clipboard.writeText(text);
    setCopiedLabel(label);
    window.setTimeout(() => setCopiedLabel(''), 1400);
  };

  const continueFromHistory = (record: HistoryRecord) => {
    setInput(record.userPrompt);
    setResult(record.result);
    setPendingRefinement(null);
    setError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const refineArtifact = (targetType: RefinementTargetType, label: string, text: string) => {
    setInput(`继续优化${label}，保留原始创意，但让它更适合 AI 视频生成。`);
    setPendingRefinement({
      targetType,
      label,
      content: text,
      instruction: '保留原始创意，增强可生成性、镜头清晰度和视频平台适配性。',
    });
    setError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
        {pendingRefinement && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-100">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span>
                正在局部优化：<strong>{pendingRefinement.label}</strong>
              </span>
              <button
                type="button"
                onClick={() => setPendingRefinement(null)}
                className="rounded-md bg-white/70 px-2 py-1 text-xs font-medium text-emerald-900 hover:bg-white dark:bg-emerald-900/60 dark:text-emerald-100"
              >
                取消局部优化
              </button>
            </div>
          </div>
        )}
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

        <AdvancedDirectorPanel
          open={showAdvanced}
          values={projectBibleForm}
          onToggle={() => setShowAdvanced((current) => !current)}
          onChange={updateProjectBible}
        />

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

      <HistoryPanel
        history={history}
        loading={historyLoading}
        error={historyError}
        onRefresh={refreshHistory}
        onContinue={continueFromHistory}
        onCopy={copyToClipboard}
      />

      {result && (
        <div className="space-y-6">
          <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold mb-2">创意诊断</h3>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{result.analysis}</p>
          </div>

          {result.continuityPlan && <ContinuityPlanView plan={result.continuityPlan} />}

          {result.timeline.length > 0 && <TimelineView timeline={result.timeline} onRefine={refineArtifact} />}

          {result.fullPrompt && (
            <PromptBlock
              label="15秒完整 Positive Prompt"
              text={result.fullPrompt}
              targetType="full_prompt"
              onCopy={copyToClipboard}
              onRefine={refineArtifact}
            />
          )}

          {result.negativePrompt && (
            <PromptBlock
              label="Negative Prompt"
              text={result.negativePrompt}
              targetType="negative_prompt"
              onCopy={copyToClipboard}
              onRefine={refineArtifact}
              negative
            />
          )}

          {result.platformVariants.length > 0 && (
            <PlatformVariantList variants={result.platformVariants} onCopy={copyToClipboard} onRefine={refineArtifact} />
          )}

          {result.versions.length > 0 && (
            <details className="p-4 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
              <summary className="cursor-pointer font-medium">兼容版 Prompt</summary>
              <div className="mt-4 space-y-4">
                {result.versions.map((version, index) => (
                  <VersionCard key={index} version={version} onCopy={copyToClipboard} onRefine={refineArtifact} />
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

function TimelineView({
  timeline,
  onRefine,
}: {
  timeline: TimelineSegment[];
  onRefine: (targetType: RefinementTargetType, label: string, text: string) => void;
}) {
  return (
    <div className="p-6 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg">
      <h3 className="font-semibold text-lg mb-4 text-emerald-700 dark:text-emerald-300">15秒分镜时间轴</h3>
      <div className="space-y-4">
        {timeline.map((segment, index) => {
          const segmentText = `时间：${segment.time}\n镜头：${segment.shot}\n动作：${segment.action}\n表情：${segment.expression}\n声音：${segment.audio}`;

          return (
          <div key={`${segment.time}-${index}`} className="grid gap-3 md:grid-cols-[96px_1fr] border-t first:border-t-0 pt-4 first:pt-0">
            <div className="space-y-2">
              <div className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">{segment.time}</div>
              <button
                type="button"
                onClick={() => onRefine('timeline_segment', `${segment.time} 分镜`, segmentText)}
                className="text-xs px-2 py-1 rounded-md bg-emerald-50 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-200 dark:hover:bg-emerald-900/50"
              >
                优化此镜头
              </button>
            </div>
            <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
              <TimelineRow label="镜头" text={segment.shot} />
              <TimelineRow label="动作" text={segment.action} />
              <TimelineRow label="表情" text={segment.expression} />
              <TimelineRow label="声音" text={segment.audio} />
            </div>
          </div>
          );
        })}
      </div>
    </div>
  );
}

function ContinuityPlanView({ plan }: { plan: ContinuityPlan }) {
  return (
    <section className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-950/20">
      <h3 className="font-semibold text-gray-900 dark:text-gray-100">导演连续性</h3>
      <div className="mt-3 grid gap-4 md:grid-cols-2">
        <div>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">主角锁定</p>
          <p className="mt-1 text-sm leading-relaxed text-gray-700 dark:text-gray-300">{plan.protagonist_lock}</p>
        </div>
        <ContinuityList title="固定视觉符号" items={plan.recurring_visual_symbols} />
        <ContinuityList title="世界规则" items={plan.world_rules} />
        <ContinuityList title="镜头目的" items={plan.shot_intents} />
      </div>
    </section>
  );
}

function ContinuityList({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div>
      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{title}</p>
      <ul className="mt-1 space-y-1 text-sm leading-relaxed text-gray-700 dark:text-gray-300">
        {items.map((item, index) => (
          <li key={`${title}-${index}`}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

function AdvancedDirectorPanel({
  open,
  values,
  onToggle,
  onChange,
}: {
  open: boolean;
  values: typeof EMPTY_PROJECT_BIBLE;
  onToggle: () => void;
  onChange: (key: keyof typeof EMPTY_PROJECT_BIBLE, value: string) => void;
}) {
  return (
    <section className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold text-gray-900 dark:text-gray-100">高级导演模式</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            可选。用于锁定主角、世界观、视觉符号和连续性，不影响快速生成。
          </p>
        </div>
        <button
          type="button"
          onClick={onToggle}
          className="rounded-md bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
        >
          {open ? '收起高级选项' : '展开高级选项'}
        </button>
      </div>

      {open && (
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <DirectorField
            label="主角设定"
            value={values.protagonist}
            onChange={(value) => onChange('protagonist', value)}
            placeholder="例如：复古清洁机器人，牛仔帽，旧金属外壳，动作迟缓但执着"
          />
          <DirectorField
            label="角色任务"
            value={values.mission}
            onChange={(value) => onChange('mission', value)}
            placeholder="例如：每天清理废弃小镇，并保护一个红裙人偶"
          />
          <DirectorField
            label="世界观"
            value={values.world}
            onChange={(value) => onChange('world', value)}
            placeholder="例如：原子朋克废土小镇，慢速丧尸游荡，旧广告牌闪烁"
          />
          <DirectorField
            label="固定视觉符号"
            value={values.visualSymbols}
            onChange={(value) => onChange('visualSymbols', value)}
            placeholder="逗号分隔，例如：机械鸵鸟、红裙人偶、破旧清扫车"
          />
          <DirectorField
            label="统一视觉风格"
            value={values.lookAndFeel}
            onChange={(value) => onChange('lookAndFeel', value)}
            placeholder="例如：atompunk, retro-futurism, dusty orange light, handcrafted miniature feel"
          />
          <DirectorField
            label="连续性规则"
            value={values.continuityRules}
            onChange={(value) => onChange('continuityRules', value)}
            placeholder="逗号分隔，例如：主角外观不漂移、视觉符号重复出现、每镜头只做一件事"
          />
          <div className="md:col-span-2">
            <DirectorField
              label="每个镜头的单一目的"
              value={values.shotIntent}
              onChange={(value) => onChange('shotIntent', value)}
              placeholder="例如：建立世界、展示职业、制造反差萌、推进关系、留下悬念"
            />
          </div>
        </div>
      )}
    </section>
  );
}

function DirectorField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="mt-2 w-full min-h-[76px] rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-transparent focus:ring-2 focus:ring-emerald-500 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
      />
    </label>
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
          <h2 className="font-semibold text-gray-900 dark:text-gray-100">历史工作台</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">查看最近生成记录，复制结果或带回输入区继续优化。</p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className="rounded-md bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-60 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
        >
          {loading ? '读取中...' : '刷新历史'}
        </button>
      </div>

      {error && (
        <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200">
          {error}
        </p>
      )}

      {!loading && history.length === 0 && !error && (
        <p className="mt-4 rounded-md bg-gray-50 px-3 py-4 text-sm text-gray-500 dark:bg-gray-950 dark:text-gray-400">
          当前会话还没有历史记录。生成一次视频 Prompt 套件后，这里会显示最近结果。
        </p>
      )}

      {history.length > 0 && (
        <div className="mt-4 grid gap-3">
          {history.slice(0, 5).map((record) => (
            <article key={record.timestamp} className="rounded-lg border border-gray-200 p-3 dark:border-gray-800">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="text-xs text-gray-500">{new Date(record.timestamp).toLocaleString()}</div>
                  <p className="mt-1 line-clamp-2 text-sm font-medium text-gray-900 dark:text-gray-100">
                    {record.userPrompt || '未识别到原始输入'}
                  </p>
                  {record.result ? (
                    <p className="mt-1 text-xs text-gray-500">
                      {record.result.timeline.length} 段分镜 · {record.result.platformVariants.length} 个平台版本
                    </p>
                  ) : (
                    <p className="mt-1 text-xs text-amber-600 dark:text-amber-300">旧记录无法解析结构化结果</p>
                  )}
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => onContinue(record)}
                    className="rounded-md bg-emerald-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-800"
                  >
                    继续优化
                  </button>
                  {record.result?.fullPrompt ? (
                    <button
                      type="button"
                      onClick={() => onCopy(record.result?.fullPrompt ?? '', '历史 Positive Prompt')}
                      className="rounded-md bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                    >
                      复制主 Prompt
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

function VersionCard({
  version,
  onCopy,
  onRefine,
}: {
  version: PromptVersion;
  onCopy: (text: string, label?: string) => void;
  onRefine: (targetType: RefinementTargetType, label: string, text: string) => void;
}) {
  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-lg text-gray-900 dark:text-gray-100">{version.style}</h3>
      <PromptBlock
        label="Positive Prompt"
        text={version.positive_prompt}
        targetType="version"
        onCopy={onCopy}
        onRefine={onRefine}
      />
      {version.negative_prompt ? (
        <PromptBlock
          label="Negative Prompt"
          text={version.negative_prompt}
          targetType="negative_prompt"
          onCopy={onCopy}
          onRefine={onRefine}
          negative
        />
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
  onRefine,
}: {
  variants: PlatformVariant[];
  onCopy: (text: string, label?: string) => void;
  onRefine: (targetType: RefinementTargetType, label: string, text: string) => void;
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
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h4 className="font-semibold text-gray-900 dark:text-gray-100">{variant.platform}</h4>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => onCopy(variant.prompt, `${variant.platform} Prompt`)}
                  className="text-xs px-3 py-1 rounded-md bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600"
                >
                  复制
                </button>
                <button
                  type="button"
                  onClick={() => onRefine('platform_variant', `${variant.platform} 平台版本`, variant.prompt)}
                  className="text-xs px-3 py-1 rounded-md bg-emerald-50 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-200 dark:hover:bg-emerald-900/50"
                >
                  继续优化
                </button>
              </div>
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
  targetType,
  onCopy,
  onRefine,
  negative,
}: {
  label: string;
  text: string;
  targetType?: RefinementTargetType;
  onCopy: (text: string, label?: string) => void;
  onRefine?: (targetType: RefinementTargetType, label: string, text: string) => void;
  negative?: boolean;
}) {
  return (
    <div>
      <div className="flex flex-wrap justify-between gap-2 mb-2">
        <span className="text-sm font-medium text-gray-500">{label}</span>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onCopy(text, label)}
            className="text-xs px-3 py-1 rounded-md bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600"
          >
            复制
          </button>
          {onRefine ? (
            <button
              type="button"
              onClick={() => onRefine(targetType ?? 'full_prompt', label, text)}
              className="text-xs px-3 py-1 rounded-md bg-emerald-50 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-200 dark:hover:bg-emerald-900/50"
            >
              继续优化
            </button>
          ) : null}
        </div>
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
