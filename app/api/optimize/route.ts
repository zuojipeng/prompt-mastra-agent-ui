/**
 * 提示词优化 API 路由（基于 Mastra Agent）
 * POST /api/optimize
 */

import { NextRequest, NextResponse } from 'next/server';
import { mastra } from '@/mastra';

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

    // 设置环境变量供 Mastra 使用
    process.env.OPENAI_API_KEY = apiKey;

    // 获取 Mastra Agent
    const agent = mastra.getAgent('promptOptimizer');

    // 使用 Agent 生成优化结果
    const result = await agent.generate([
      {
        role: 'user',
        content: `请帮我优化这个提示词，并以 JSON 格式返回结果：\n\n"${prompt}"\n\n记住要包含：targetTool, optimizedPrompt, suggestions, reasoning 这些字段。`,
      },
    ]);

    // 解析 Agent 的响应
    let parsedResult;
    try {
      // 尝试从响应中提取 JSON
      const jsonMatch = result.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedResult = JSON.parse(jsonMatch[0]);
      } else {
        // 如果没有 JSON，构造一个默认响应
        parsedResult = {
          targetTool: 'ChatGPT',
          optimizedPrompt: result.text,
          suggestions: ['已根据最佳实践优化'],
          reasoning: 'Agent 提供了详细的分析',
        };
      }
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      parsedResult = {
        targetTool: 'ChatGPT',
        optimizedPrompt: result.text,
        suggestions: ['已根据最佳实践优化'],
        reasoning: 'Agent 提供了详细的分析',
      };
    }

    // 返回标准格式
    return NextResponse.json({
      originalPrompt: prompt,
      optimizedPrompt: parsedResult.optimizedPrompt || result.text,
      suggestions: parsedResult.suggestions || [],
      targetTool: parsedResult.targetTool || 'ChatGPT',
      reasoning: parsedResult.reasoning || '',
    });
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

