/**
 * Prompt Optimizer Agent - 提示词优化 Agent
 * 使用 Vercel AI SDK 实现（Mastra 的底层框架）
 */

import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';
import { analyzeIntentTool, identifyAIToolTool } from '../tools/prompt-tools';

/**
 * Agent 系统提示词
 */
const AGENT_INSTRUCTIONS = `你是一个专业的 AI 提示词优化专家。你的任务是：

**核心能力**：
1. 深度理解用户的真实意图和需求
2. 识别最适合的 AI 工具（ChatGPT、Claude、Midjourney、Stable Diffusion、GitHub Copilot 等）
3. 针对不同工具的特性重写和优化提示词
4. 提供可操作的改进建议

**优化原则**：
- 明确性：消除歧义，让意图清晰
- 结构化：组织内容，添加必要的步骤和格式
- 上下文：补充背景信息和约束条件
- 专业性：使用领域术语和最佳实践

**工作流程**：
1. 先分析用户的原始提示词，理解意图
2. 识别最适合的 AI 工具
3. 针对该工具优化提示词
4. 提供具体的改进建议和理由

**输出格式（JSON）**：
{
  "targetTool": "推荐的AI工具",
  "optimizedPrompt": "优化后的完整提示词",
  "suggestions": ["建议1", "建议2", "建议3"],
  "reasoning": "为什么这样优化的详细理由"
}

请始终以友好、专业的态度回应用户，并确保优化后的提示词真正实用。`;

/**
 * Prompt Optimizer Agent 配置
 */
export const promptOptimizerAgent = {
  id: 'prompt-optimizer',
  name: 'Prompt Optimizer Agent',
  description: '一个专业的 AI 提示词优化专家',
  model: openai('gpt-4o-mini'),
  instructions: AGENT_INSTRUCTIONS,
  tools: {
    analyzeIntentTool,
    identifyAIToolTool,
  },
  
  /**
   * 生成优化结果
   */
  async generate(messages: Array<{ role: string; content: string }>) {
    const result = await generateText({
      model: this.model,
      system: this.instructions,
      messages,
      tools: this.tools,
      maxSteps: 5, // 允许 Agent 调用多次工具
    });
    
    return {
      text: result.text,
      toolCalls: result.steps,
    };
  },
};

