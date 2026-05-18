/**
 * API 客户端 — 连接 AI 视频 prompt 服务。
 */

import { getSessionId, getUserId, getOrCreateSessionId } from './session-manager';

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

export interface OptimizationResult {
  originalPrompt: string;
  scenario: string;
  analysis: string;
  timeline: TimelineSegment[];
  fullPrompt: string;
  negativePrompt: string;
  versions: PromptVersion[];
  platformVariants: PlatformVariant[];
  suggestions: string[];
}

export interface HistoryRecord {
  timestamp: number;
  userPrompt: string;
  result: OptimizationResult | null;
}

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

interface StructuredResult {
  analysis: string;
  timeline?: TimelineSegment[];
  full_prompt?: string;
  negative_prompt?: string;
  versions: PromptVersion[];
  platform_variants?: PlatformVariant[];
  suggestions: string[];
}

interface ApiResponse {
  success?: boolean;
  error?: string;
  data?: {
    originalPrompt?: string;
    scenario?: string;
    style?: string | null;
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

function toOptimizationResult(prompt: string, result: StructuredResult | null): OptimizationResult | null {
  if (!result) {
    return null;
  }

  return {
    originalPrompt: prompt,
    scenario: 'video',
    analysis: result.analysis,
    timeline: result.timeline ?? [],
    fullPrompt: result.full_prompt ?? '',
    negativePrompt: result.negative_prompt ?? '',
    versions: result.versions,
    platformVariants: result.platform_variants ?? [],
    suggestions: result.suggestions,
  };
}

export type OptimizeOptions = {
  style?: string;
  refinement?: RefinementRequest;
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
      ...(options?.refinement ? { refinement: options.refinement } : {}),
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
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

  if (data.result) {
    const result = normalizeStructuredResult(data.result);
    if (!result) {
      throw new Error('后端返回的 result 结构无效');
    }

    return {
      originalPrompt: data.originalPrompt ?? prompt,
      scenario: data.scenario ?? 'video',
      analysis: result.analysis,
      timeline: result.timeline ?? [],
      fullPrompt: result.full_prompt ?? '',
      negativePrompt: result.negative_prompt ?? '',
      versions: result.versions,
      platformVariants: result.platform_variants ?? [],
      suggestions: result.suggestions,
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
    };
  }

  throw new Error(json.error ?? '后端返回数据格式无效');
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
