/**
 * AI 提示词优化 Agent 核心逻辑
 * 用于分析用户输入并生成优化后的提示词
 */

import { OpenAI } from 'openai';

export interface OptimizationResult {
  originalPrompt: string;
  optimizedPrompt: string;
  suggestions: string[];
  targetTool: string;
  reasoning: string;
}

export class PromptOptimizer {
  private openai: OpenAI;

  constructor(apiKey: string) {
    this.openai = new OpenAI({
      apiKey: apiKey,
    });
  }

  /**
   * 优化用户提示词
   */
  async optimize(userInput: string): Promise<OptimizationResult> {
    const systemPrompt = `你是一个专业的 AI 提示词优化专家。你的任务是：

1. 分析用户的原始输入，理解他们的真实意图
2. 判断最适合使用的 AI 工具（ChatGPT、Claude、Midjourney、GitHub Copilot 等）
3. 根据不同 AI 工具的特点，重写并优化提示词
4. 提供具体的改进建议

优化原则：
- 明确性：让意图更清晰
- 结构化：添加适当的格式和步骤
- 上下文：补充必要的背景信息
- 专业性：使用专业术语和最佳实践

请以 JSON 格式返回结果，包含：
{
  "targetTool": "推荐的AI工具名称",
  "optimizedPrompt": "优化后的提示词",
  "suggestions": ["改进建议1", "改进建议2", "改进建议3"],
  "reasoning": "为什么这样优化的理由"
}`;

    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini', // 使用性价比高的模型
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `请优化这个提示词：\n\n${userInput}` },
        ],
        temperature: 0.7,
        response_format: { type: 'json_object' },
      });

      const result = JSON.parse(completion.choices[0].message.content || '{}');

      return {
        originalPrompt: userInput,
        optimizedPrompt: result.optimizedPrompt || userInput,
        suggestions: result.suggestions || [],
        targetTool: result.targetTool || 'ChatGPT',
        reasoning: result.reasoning || '',
      };
    } catch (error) {
      console.error('Optimization error:', error);
      throw new Error('提示词优化失败，请稍后重试');
    }
  }

  /**
   * 流式优化（支持实时显示）
   */
  async optimizeStream(userInput: string): Promise<ReadableStream> {
    const systemPrompt = `你是一个专业的 AI 提示词优化专家。请分析用户输入并提供优化建议。

分析步骤：
1. 理解用户意图
2. 识别适合的 AI 工具
3. 提供优化后的提示词
4. 给出具体建议

请用友好的语气，逐步展示你的分析过程。`;

    const stream = await this.openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userInput },
      ],
      temperature: 0.7,
      stream: true,
    });

    // 转换为 Web ReadableStream
    return new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || '';
            if (content) {
              controller.enqueue(new TextEncoder().encode(content));
            }
          }
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });
  }
}

