/**
 * 提示词优化 API 路由
 * POST /api/optimize
 */

import { NextRequest, NextResponse } from 'next/server';
import { PromptOptimizer } from '@/lib/prompt-optimizer';

export async function POST(req: NextRequest) {
  try {
    const { prompt } = await req.json();

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json(
        { error: '请提供有效的提示词' },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'OpenAI API Key 未配置' },
        { status: 500 }
      );
    }

    const optimizer = new PromptOptimizer(apiKey);
    const result = await optimizer.optimize(prompt);

    return NextResponse.json(result);
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '服务器错误' },
      { status: 500 }
    );
  }
}

// 支持 OPTIONS 请求（CORS 预检）
export async function OPTIONS() {
  return NextResponse.json({}, { status: 200 });
}

