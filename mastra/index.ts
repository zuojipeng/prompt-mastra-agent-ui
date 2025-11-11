/**
 * Agent 管理器
 * 简化版的 Agent 注册和管理（类似 Mastra 的设计）
 */

import { promptOptimizerAgent } from './agents/prompt-optimizer-agent';

/**
 * Agent 注册表
 */
const agents = {
  promptOptimizer: promptOptimizerAgent,
};

/**
 * Mastra-like Agent Manager
 * 模拟 Mastra 的 API，但使用 Vercel AI SDK 实现
 */
export const mastra = {
  /**
   * 获取指定的 Agent
   */
  getAgent(id: keyof typeof agents) {
    const agent = agents[id];
    if (!agent) {
      throw new Error(`Agent "${id}" not found`);
    }
    return agent;
  },

  /**
   * 列出所有 Agents
   */
  listAgents() {
    return Object.keys(agents);
  },
};

