/**
 * Mastra Tools - 提示词优化工具
 * 基于官方示例的正确实现
 */

import { tool, jsonSchema } from 'ai';

/**
 * Tool 1: 分析用户意图
 */
export const analyzeIntentTool = tool({
  description: '分析用户输入的提示词，理解其真实意图、目标和需求',
  parameters: jsonSchema({
    type: 'object',
    properties: {
      prompt: {
        type: 'string',
        description: '用户输入的原始提示词',
      },
    },
    required: ['prompt'],
  }),
  execute: async ({ prompt }) => {
    // 这个工具会被 Agent 自动调用
    // Agent 的 LLM 会根据工具描述决定如何分析
    return {
      analyzed: true,
      prompt_received: prompt,
      message: '意图分析完成，请Agent继续处理',
    };
  },
});

/**
 * Tool 2: 识别适合的 AI 工具
 */
export const identifyAIToolTool = tool({
  description: '根据用户意图，识别最适合使用的 AI 工具（ChatGPT、Claude、Midjourney、GitHub Copilot 等）',
  parameters: jsonSchema({
    type: 'object',
    properties: {
      taskType: {
        type: 'string',
        description: '任务类型（如：写作、编程、图像生成、数据分析等）',
      },
    },
    required: ['taskType'],
  }),
  execute: async ({ taskType }) => {
    // 简单的规则匹配
    let recommendedTool = 'ChatGPT';
    let reason = '通用对话和文本生成';

    if (taskType.includes('图') || taskType.includes('画') || taskType.includes('设计')) {
      recommendedTool = 'Midjourney / DALL-E';
      reason = '专注于 AI 图像生成';
    } else if (taskType.includes('代码') || taskType.includes('编程') || taskType.includes('程序')) {
      recommendedTool = 'ChatGPT / GitHub Copilot';
      reason = '擅长代码生成和调试';
    } else if (taskType.includes('分析') || taskType.includes('长文') || taskType.includes('深度')) {
      recommendedTool = 'Claude';
      reason = '适合长文本分析和深度思考';
    }

    return {
      recommendedTool,
      reason,
      taskType,
    };
  },
});

