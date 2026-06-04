/**
 * API 客户端 — 连接 AI 视频 prompt 服务。
 */

import { getSessionId, getUserId, getOrCreateSessionId } from './session-manager';
import type {
  DirectorKit,
  DirectorKitTargetDuration,
  DirectorKitTargetType,
} from './director-kit-contract';

export type {
  CreativeDiagnosis,
  DirectorKit,
  DirectorKitTargetDuration,
  DirectorKitTargetType,
  ReconstructVersion,
  ShotCard,
} from './director-kit-contract';

export interface PromptVersion {
  style: string;
  positive_prompt: string;
  negative_prompt: string;
  reasoning: string;
}

export interface TimelineSegment {
  time: string;
  shot: string;
  action: string;
  expression: string;
  audio: string;
}

export interface PlatformVariant {
  platform: 'Kling' | 'Runway' | 'Pika' | 'Sora' | 'Seedance';
  prompt: string;
  usage_notes: string;
  constraint_notes: string;
}

export interface ContinuityPlan {
  protagonist_lock: string;
  recurring_visual_symbols: string[];
  world_rules: string[];
  shot_intents: string[];
}

export interface OptimizationResult {
  originalPrompt: string;
  scenario: string;
  analysis: string;
  continuityPlan: ContinuityPlan | null;
  timeline: TimelineSegment[];
  fullPrompt: string;
  negativePrompt: string;
  versions: PromptVersion[];
  platformVariants: PlatformVariant[];
  suggestions: string[];
  /** v2: 多镜头 prompt 数组（新字段，优先使用） */
  prompts: string[];
}

export interface HistoryRecord {
  timestamp: number;
  userPrompt: string;
  result: OptimizationResult | null;
}

export type FeedbackStats = {
  total: number;
  likes: number;
  dislikes: number;
  ratio: string;
  breakdown?: {
    eventTypes: Record<string, number>;
    sources: Record<string, number>;
    targetTypes: Record<string, number>;
    platforms: Record<string, number>;
    generationModes: Record<string, number>;
    riskLevels: Record<string, number>;
    riskTags: Record<string, number>;
    failureReasons: Record<string, number>;
  };
};

export type FeedbackAnalyticsBucket = {
  key: string;
  total: number;
  likes: number;
  dislikes: number;
  dislikeRate: number;
};

export type FeedbackAnalyticsSample = {
  eventType: string;
  targetType: string;
  platform: string;
  generationMode: string;
  riskLevel: string;
  riskTags: string[];
  failureReasons: string[];
  input: string;
  prompt: string;
  shotIndex: number;
  comment: string;
  createdAt: number;
};

export type FeedbackAnalytics = {
  windowDays: number;
  total: number;
  likes: number;
  dislikes: number;
  dislikeRate: number;
  v2Share: number;
  minSampleSize: number;
  qualityFlags: string[];
  dimensions: {
    eventTypes: FeedbackAnalyticsBucket[];
    targetTypes: FeedbackAnalyticsBucket[];
    platforms: FeedbackAnalyticsBucket[];
    generationModes: FeedbackAnalyticsBucket[];
    riskLevels: FeedbackAnalyticsBucket[];
    riskTags: FeedbackAnalyticsBucket[];
    failureReasons: FeedbackAnalyticsBucket[];
  };
  highValueSamples: FeedbackAnalyticsSample[];
};

// ===== V2 类型定义 =====

export type RefinementTargetType =
  | 'full_prompt'
  | 'negative_prompt'
  | 'timeline_segment'
  | 'platform_variant'
  | 'version';

export interface RefinementRequest {
  targetType: RefinementTargetType;
  label: string;
  content: string;
  instruction?: string;
}

export interface ProjectBible {
  protagonist?: string;
  mission?: string;
  world?: string;
  visualSymbols?: string[];
  lookAndFeel?: string;
  continuityRules?: string[];
  shotIntent?: string;
}

interface StructuredResult {
  analysis: string;
  continuity_plan?: ContinuityPlan;
  timeline?: TimelineSegment[];
  full_prompt?: string;
  negative_prompt?: string;
  versions: PromptVersion[];
  platform_variants?: PlatformVariant[];
  suggestions: string[];
  /** v2: 多镜头 prompt 数组 */
  prompts?: string[];
}

interface ApiResponse {
  success?: boolean;
  error?: string;
  data?: {
    originalPrompt?: string;
    scenario?: string;
    style?: string | null;
    /** v2: 简化 prompt 字段 */
    prompt?: string;
    /** v3: 多镜头 prompts 数组 */
    prompts?: string[];
    /** v2: 镜头数 */
    shotCount?: number;
    result?: StructuredResult;
    /** 旧版 API 兼容 */
    optimizedPrompt?: string;
  };
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function normalizeTimeline(value: TimelineSegment[] | undefined): TimelineSegment[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (segment): segment is TimelineSegment =>
      segment &&
      isString(segment.time) &&
      isString(segment.shot) &&
      isString(segment.action) &&
      isString(segment.expression) &&
      isString(segment.audio),
  );
}

function normalizePlatformVariants(value: PlatformVariant[] | undefined): PlatformVariant[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (variant): variant is PlatformVariant =>
      variant &&
      isString(variant.platform) &&
      isString(variant.prompt) &&
      isString(variant.usage_notes) &&
      isString(variant.constraint_notes),
  );
}

function normalizeContinuityPlan(value: ContinuityPlan | undefined): ContinuityPlan | null {
  if (
    !value ||
    !isString(value.protagonist_lock) ||
    !Array.isArray(value.recurring_visual_symbols) ||
    !Array.isArray(value.world_rules) ||
    !Array.isArray(value.shot_intents)
  ) {
    return null;
  }

  return {
    protagonist_lock: value.protagonist_lock,
    recurring_visual_symbols: value.recurring_visual_symbols.filter(isString),
    world_rules: value.world_rules.filter(isString),
    shot_intents: value.shot_intents.filter(isString),
  };
}

function normalizeStructuredResult(value: StructuredResult | undefined): StructuredResult | null {
  if (!value || !isString(value.analysis) || !Array.isArray(value.versions)) {
    return null;
  }

  const versions = value.versions.filter(
    (version): version is PromptVersion =>
      version &&
      isString(version.style) &&
      isString(version.positive_prompt) &&
      isString(version.negative_prompt) &&
      isString(version.reasoning),
  );

  if (versions.length === 0) {
    return null;
  }

  return {
    analysis: value.analysis,
    continuity_plan: normalizeContinuityPlan(value.continuity_plan) ?? undefined,
    timeline: normalizeTimeline(value.timeline),
    full_prompt: isString(value.full_prompt) ? value.full_prompt : '',
    negative_prompt: isString(value.negative_prompt) ? value.negative_prompt : '',
    versions,
    platform_variants: normalizePlatformVariants(value.platform_variants),
    suggestions: Array.isArray(value.suggestions) ? value.suggestions.filter(isString) : [],
  };
}

const getApiUrl = () =>
  process.env.NEXT_PUBLIC_API_URL ??
  'https://prompt-optimizer.hahazuo460.workers.dev/api/optimize';

const getHistoryUrl = () => getApiUrl().replace(/\/api\/optimize$/, '/api/history');

function parseAssistantResult(content: string): StructuredResult | null {
  const jsonMatch = content.trim().match(/```(?:json)?\s*([\s\S]*?)```/);
  const jsonText = (jsonMatch?.[1] ?? content).trim();

  try {
    const parsed = JSON.parse(jsonText) as StructuredResult;
    return normalizeStructuredResult(parsed);
  } catch {
    return null;
  }
}

function cleanUserPrompt(content: string): string {
  return content
    .split('\n')
    .filter((line) => !line.trim().startsWith('['))
    .join('\n')
    .trim();
}

function normalizePrompts(prompts: string[] | undefined, fullPrompt: string | undefined): string[] {
  if (Array.isArray(prompts) && prompts.length > 0) {
    return prompts.filter(isString);
  }
  if (fullPrompt) {
    return [fullPrompt];
  }
  return [];
}

function toOptimizationResult(prompt: string, result: StructuredResult | null): OptimizationResult | null {
  if (!result) {
    return null;
  }

  const prompts = normalizePrompts(result.prompts, result.full_prompt);

  return {
    originalPrompt: prompt,
    scenario: 'video',
    analysis: result.analysis,
    continuityPlan: result.continuity_plan ?? null,
    timeline: result.timeline ?? [],
    fullPrompt: result.full_prompt ?? '',
    negativePrompt: result.negative_prompt ?? '',
    versions: result.versions,
    platformVariants: result.platform_variants ?? [],
    suggestions: result.suggestions,
    prompts,
  };
}

export type OptimizeOptions = {
  style?: string;
  projectBible?: ProjectBible;
  refinement?: RefinementRequest;
  /** v2: 镜头数 */
  shotCount?: number;
};

export async function optimizePrompt(
  prompt: string,
  options?: OptimizeOptions,
): Promise<OptimizationResult> {
  const apiUrl = getApiUrl();
  const userId = getUserId();
  const sessionId = getOrCreateSessionId();

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-User-Id': userId,
      'X-Session-Id': sessionId,
    },
    body: JSON.stringify({
      message: prompt,
      scenario: 'video',
      ...(options?.style ? { style: options.style } : {}),
      ...(options?.projectBible ? { projectBible: options.projectBible } : {}),
      ...(options?.refinement ? { refinement: options.refinement } : {}),
      ...(options?.shotCount ? { shotCount: options.shotCount } : {}),
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    const isFormatError = response.status === 502 && errorText.includes('模型返回格式无效');
    if (isFormatError) {
      throw new Error('格式异常');
    }
    throw new Error(`HTTP ${response.status}: ${errorText || response.statusText}`);
  }

  const json: ApiResponse = await response.json();
  if (json.success === false) {
    throw new Error(json.error ?? '后端处理失败');
  }

  const { data } = json;
  if (!data) {
    throw new Error(json.error ?? '后端返回数据格式无效');
  }

  // v3: 多镜头响应 { data: { prompts: [...], shotCount: N } }
  if (Array.isArray(data.prompts) && data.prompts.length > 0) {
    return {
      originalPrompt: data.originalPrompt ?? prompt,
      scenario: data.scenario ?? 'video',
      analysis: '',
      continuityPlan: null,
      timeline: [],
      fullPrompt: data.prompts[0],
      negativePrompt: '',
      versions: [],
      platformVariants: [],
      suggestions: [],
      prompts: data.prompts,
    };
  }

  // v2: 简化响应 { data: { prompt: "..." } }
  if (typeof data.prompt === 'string' && data.prompt.trim()) {
    return {
      originalPrompt: data.originalPrompt ?? prompt,
      scenario: data.scenario ?? 'video',
      analysis: '',
      continuityPlan: null,
      timeline: [],
      fullPrompt: data.prompt,
      negativePrompt: '',
      versions: [],
      platformVariants: [],
      suggestions: [],
      prompts: [data.prompt],
    };
  }

  if (data.result) {
    const result = normalizeStructuredResult(data.result);
    if (!result) {
      throw new Error('后端返回的 result 结构无效');
    }

    return {
      originalPrompt: data.originalPrompt ?? prompt,
      scenario: data.scenario ?? 'video',
      analysis: result.analysis,
      continuityPlan: result.continuity_plan ?? null,
      timeline: result.timeline ?? [],
      fullPrompt: result.full_prompt ?? '',
      negativePrompt: result.negative_prompt ?? '',
      versions: result.versions,
      platformVariants: result.platform_variants ?? [],
      suggestions: result.suggestions,
      prompts: normalizePrompts(result.prompts, result.full_prompt),
    };
  }

  if (typeof data.optimizedPrompt === 'string') {
    if (!data.optimizedPrompt.trim()) {
      throw new Error('后端返回旧版 optimizedPrompt，但内容为空，请先部署最新 Worker');
    }

    return {
      originalPrompt: data.originalPrompt ?? prompt,
      scenario: data.scenario ?? 'video',
      analysis: '（后端返回旧版格式，建议部署最新 Worker）',
      continuityPlan: null,
      timeline: [],
      fullPrompt: data.optimizedPrompt,
      negativePrompt: '',
      versions: [
        {
          style: '优化结果',
          positive_prompt: data.optimizedPrompt,
          negative_prompt: '',
          reasoning: '',
        },
      ],
      platformVariants: [],
      suggestions: [],
      prompts: [data.optimizedPrompt],
    };
  }

  throw new Error(json.error ?? '后端返回数据格式无效');
}

// ===== V2 API 函数 =====

export async function createDirectorKit(params: {
  message: string;
  targetDuration: DirectorKitTargetDuration;
  targetType: DirectorKitTargetType;
}): Promise<DirectorKit> {
  const apiUrl = getApiUrl().replace(/\/api\/optimize$/, '/api/v2/director-kit');
  const userId = getUserId();
  const sessionId = getOrCreateSessionId();

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-User-Id': userId,
      'X-Session-Id': sessionId,
    },
    body: JSON.stringify({
      message: params.message,
      targetDuration: params.targetDuration,
      targetType: params.targetType,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`HTTP ${response.status}: ${errorText || response.statusText}`);
  }

  const json = await response.json() as {
    success?: boolean;
    error?: string;
    data?: DirectorKit;
  };

  if (json.success === false || !json.data) {
    throw new Error(json.error ?? '导演执行包生成失败');
  }

  return {
    ...json.data,
    selectedVersion: null,
  };
}

export async function uploadFeedback(feedback: {
  input: string;
  prompt: string;
  shotIndex: number;
  rating: 'like' | 'dislike';
  comment?: string;
  eventType?: 'legacy_prompt' | 'director_kit' | 'shot_card' | 'platform_advice';
  source?: 'v1' | 'v2';
  directorKitId?: string;
  targetDuration?: DirectorKitTargetDuration;
  targetType?: DirectorKitTargetType;
  selectedVersionType?: 'safest' | 'stylish' | 'cinematic';
  platform?: string;
  generationMode?: 'text-to-video' | 'image-to-video' | 'reference-image';
  riskLevel?: 'low' | 'medium' | 'high';
  riskTags?: string[];
  failureReasons?: string[];
}): Promise<void> {
  const apiUrl = getApiUrl().replace(/\/api\/optimize$/, '/api/feedback');
  const userId = getUserId();
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-User-Id': userId },
    body: JSON.stringify(feedback),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`HTTP ${response.status}: ${errorText || response.statusText}`);
  }
}

export async function fetchFeedbackStats(): Promise<FeedbackStats> {
  const apiUrl = getApiUrl().replace(/\/api\/optimize$/, '/api/feedback');
  const userId = getUserId();
  try {
    const res = await fetch(apiUrl, { headers: { 'X-User-Id': userId } });
    const json = await res.json();
    return json.data ?? { total: 0, likes: 0, dislikes: 0, ratio: '0' };
  } catch { return { total: 0, likes: 0, dislikes: 0, ratio: '0' }; }
}

export async function fetchFeedbackAnalytics(options: {
  days?: 7 | 30 | 90;
  source?: 'v1' | 'v2';
  eventType?: 'legacy_prompt' | 'director_kit' | 'shot_card' | 'platform_advice';
  limit?: number;
} = {}): Promise<FeedbackAnalytics | null> {
  const apiUrl = new URL(getApiUrl().replace(/\/api\/optimize$/, '/api/feedback/analytics'));
  if (options.days) apiUrl.searchParams.set('days', String(options.days));
  if (options.source) apiUrl.searchParams.set('source', options.source);
  if (options.eventType) apiUrl.searchParams.set('eventType', options.eventType);
  if (options.limit) apiUrl.searchParams.set('limit', String(options.limit));

  const userId = getUserId();
  try {
    const res = await fetch(apiUrl.toString(), { headers: { 'X-User-Id': userId } });
    if (!res.ok) return null;
    const json = await res.json() as { data?: FeedbackAnalytics };
    return json.data ?? null;
  } catch {
    return null;
  }
}

export async function syncUserData(payload: Record<string, unknown>): Promise<boolean> {
  const apiUrl = getApiUrl().replace(/\/api\/optimize$/, '/api/user-data');
  const userId = getUserId();
  try {
    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-User-Id': userId },
      body: JSON.stringify(payload),
    });
    return res.ok;
  } catch { return false; }
}

export async function fetchUserData(): Promise<Record<string, unknown> | null> {
  const apiUrl = getApiUrl().replace(/\/api\/optimize$/, '/api/user-data');
  const userId = getUserId();
  try {
    const res = await fetch(apiUrl, { headers: { 'X-User-Id': userId } });
    if (!res.ok) return null;
    const json = await res.json();
    return json.data ?? null;
  } catch { return null; }
}

export async function fetchPromptHistory(): Promise<HistoryRecord[]> {
  const userId = getUserId();
  const sessionId = getSessionId();

  const response = await fetch(getHistoryUrl(), {
    headers: {
      'X-User-Id': userId,
      ...(sessionId ? { 'X-Session-Id': sessionId } : {}),
    },
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`HTTP ${response.status}: ${errorText || response.statusText}`);
  }

  const json = (await response.json()) as {
    success?: boolean;
    error?: string;
    data?: {
      history?: {
        timestamp: number;
        messages: { role: string; content: string }[];
      }[];
    };
  };

  if (json.success === false) {
    throw new Error(json.error ?? '历史记录读取失败');
  }

  return (json.data?.history ?? []).map((entry) => {
    const userContent = entry.messages.find((message) => message.role === 'user')?.content ?? '';
    const assistantContent = entry.messages.find((message) => message.role === 'assistant')?.content ?? '';
    const userPrompt = cleanUserPrompt(userContent);
    const structured = parseAssistantResult(assistantContent);

    return {
      timestamp: entry.timestamp,
      userPrompt,
      result: toOptimizationResult(userPrompt, structured),
    };
  });
}
