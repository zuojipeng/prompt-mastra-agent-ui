/**
 * Mastra 实例配置
 * 这是整个 Mastra 应用的入口
 */

import { Mastra } from '@mastra/core/mastra';
import { promptOptimizerAgent } from './agents/prompt-optimizer-agent';

/**
 * 创建并导出 Mastra 实例
 * 在这里注册所有的 Agents、Workflows、Tools 等
 */
export const mastra = new Mastra({
  // 注册 Agents
  agents: {
    promptOptimizer: promptOptimizerAgent,
  },

  // 未来可以添加：
  // workflows: {...},
  // logger: new PinoLogger({...}),
  // storage: new LibSQLStore({...}),
});

