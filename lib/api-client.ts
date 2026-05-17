/**
 * API 客户端 — 连接 Cloudflare Workers 后端（my-prompt-mastra-agent）
 */

import { getUserId, getOrCreateSessionId } from './session-manager';

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

export interface OptimizationResult {
  originalPrompt: string;
  scenario: string;
  analysis: string;
  timeline: TimelineSegment[];
  fullPrompt: string;
  negativePrompt: string;
  versions: PromptVersion[];
  suggestions: string[];
}

interface StructuredResult {
  analysis: string;
  timeline?: TimelineSegment[];
  full_prompt?: string;
  negative_prompt?: string;
  versions: PromptVersion[];
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
    suggestions: Array.isArray(value.suggestions) ? value.suggestions.filter(isString) : [],
  };
}

const getApiUrl = () =>
  process.env.NEXT_PUBLIC_API_URL ??
  'https://prompt-optimizer.hahazuo460.workers.dev/api/optimize';

export type OptimizeOptions = {
  scenario?: 'video' | 'image' | 'code';
  style?: string;
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
      scenario: options?.scenario ?? 'video',
      ...(options?.style ? { style: options.style } : {}),
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
      suggestions: [],
    };
  }

  throw new Error(json.error ?? '后端返回数据格式无效');
}
