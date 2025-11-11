# 🎓 Mastra 学习笔记

## Mastra 正确用法（基于官方示例）

从 GitHub官方仓库学习：https://github.com/mastra-ai/mastra

### 1. 核心概念

Mastra 是一个 TypeScript AI Agent 框架，包含：
- **Agent**: 使用 LLM 和 Tools 的自主实体
- **Tools**: 可执行的类型化函数
- **Workflows**: 基于图的状态机
- **Memory**: 对话历史和上下文管理

###2. 正确的包导入

```typescript
import { Mastra } from '@mastra/core/mastra';
import { Agent } from '@mastra/core/agent';
import { tool, jsonSchema } from 'ai';  // Vercel AI SDK
import { openai } from '@ai-sdk/openai';
```

### 3. 创建 Tool

```typescript
import { tool, jsonSchema } from 'ai';

export const myTool = tool({
  description: '工具描述',
  parameters: jsonSchema({
    type: 'object',
    properties: {
      param1: {
        type: 'string',
        description: '参数描述',
      },
    },
    required: ['param1'],
  }),
  execute: async ({ param1 }) => {
    // 工具逻辑
    return { result: 'some data' };
  },
});
```

### 4. 创建 Agent

```typescript
import { Agent } from '@mastra/core/agent';
import { openai } from '@ai-sdk/openai';

export const myAgent = new Agent({
  id: 'my-agent',
  name: 'My Agent',
  description: 'Agent 描述',
  instructions: 'System prompt / 指令',
  model: openai('gpt-4o-mini'),
  tools: {
    myTool,  // 添加工具
  },
});
```

### 5. 创建 Mastra 实例

```typescript
import { Mastra } from '@mastra/core/mastra';

export const mastra = new Mastra({
  agents: {
    myAgent,     // 注册 agents
  },
  // 可选配置
  logger: ...,
  storage: ...,
  workflows: ...,
});
```

### 6. 使用 Agent

```typescript
// 获取 agent
const agent = mastra.getAgent('my-agent');

// 生成响应
const result = await agent.generate([
  {
    role: 'user',
    content: 'Hello!',
  }
]);

console.log(result.text);
```

## 关键发现

1. **不是旧版 API**：npm 上的 @mastra/core 0.1.26 和官方示例使用的是不同的 API
2. **依赖 Vercel AI SDK**：Mastra 深度集成了 `ai` 包（Vercel AI SDK）
3. **模块化设计**：Agent、Tools、Workflows 分开定义
4. **类型安全**：使用 Zod schema 和 TypeScript

## 下一步计划

基于正确的 Mastra API 重新实现：
1. 创建 Tools（analyzeIntent, identifyAITool, optimizePrompt）
2. 创建 PromptOptimizer Agent
3. 创建 Mastra 实例
4. 在 API 路由中使用

---

**参考资源**：
- 官方文档: https://mastra.ai/docs
- GitHub: https://github.com/mastra-ai/mastra
- 示例: https://github.com/mastra-ai/mastra/tree/main/examples/agent

