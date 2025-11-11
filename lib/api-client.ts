/**
 * API 客户端
 * 处理前端到后端的 API 调用
 */

import { OptimizationResult } from './prompt-optimizer';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

export async function optimizePrompt(prompt: string): Promise<OptimizationResult> {
  const response = await fetch(`${API_URL}/api/optimize`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ prompt }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || '优化失败');
  }

  return response.json();
}

export async function optimizePromptStream(
  prompt: string,
  onChunk: (chunk: string) => void
): Promise<void> {
  const response = await fetch(`${API_URL}/api/optimize-stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ prompt }),
  });

  if (!response.ok) {
    throw new Error('流式优化失败');
  }

  const reader = response.body?.getReader();
  const decoder = new TextDecoder();

  if (!reader) {
    throw new Error('无法读取响应流');
  }

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value);
    onChunk(chunk);
  }
}

