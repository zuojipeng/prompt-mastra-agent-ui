/**
 * API 客户端
 * 处理前端到后端的 API 调用
 */

export interface OptimizationResult {
  originalPrompt: string;
  optimizedPrompt: string;
  suggestions: string[];
  targetTool: string;
  reasoning: string;
}

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

