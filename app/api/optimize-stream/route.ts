/**
 * 流式提示词优化 API 路由
 * POST /api/optimize-stream
 * 支持实时返回优化结果
 */

import { NextRequest } from 'next/server';
import { PromptOptimizer } from '@/lib/prompt-optimizer';

export async function POST(req: NextRequest) {
  try {
    const { prompt } = await req.json();

    if (!prompt || typeof prompt !== 'string') {
      return new Response('请提供有效的提示词', { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return new Response('OpenAI API Key 未配置', { status: 500 });
    }

    const optimizer = new PromptOptimizer(apiKey);
    const stream = await optimizer.optimizeStream(prompt);

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Stream API Error:', error);
    return new Response('服务器错误', { status: 500 });
  }
}

export async function OPTIONS() {
  return new Response(null, { status: 200 });
}

