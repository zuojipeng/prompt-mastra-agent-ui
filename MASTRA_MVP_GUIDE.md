# 🚀 Mastra MVP 快速启动指南

## ✅ 已完成的工作

### 1. 基于 Mastra 的完整架构

```
my-mastra-agent/
├── mastra/                     # Mastra 核心代码
│   ├── tools/                  # 工具定义
│   │   └── prompt-tools.ts     # 提示词分析工具
│   ├── agents/                 # Agent 定义
│   │   └── prompt-optimizer-agent.ts  # 提示词优化 Agent
│   └── index.ts                # Mastra 实例
├── app/api/optimize/           # API 路由
│   └── route.ts                # 使用 Mastra Agent
└── lib/api-client.ts           # 前端 API 客户端
```

### 2. Mastra 组件说明

#### Tools (工具)
- `analyzeIntentTool`: 分析用户意图
- `identifyAIToolTool`: 识别适合的 AI 工具

#### Agent (智能体)
- `promptOptimizerAgent`: 提示词优化 Agent
  - 使用 GPT-4o-mini 模型
  - 整合了两个工具
  - 有详细的系统指令

#### Mastra 实例
- 注册了所有 Agents
- 可扩展添加 Workflows、Storage 等

### 3. API 工作流程

```
用户输入提示词
  ↓
POST /api/optimize
  ↓
获取 Mastra Agent
  ↓
agent.generate([...])  ← 调用 Mastra
  ↓
Agent 自动：
  - 分析意图
  - 调用 Tools
  - 生成优化结果
  ↓
返回 JSON 结果
```

## 🎯 快速启动

### 步骤 1: 配置 API Key

编辑 `.env.local` 文件：

```bash
OPENAI_API_KEY=sk-your-actual-api-key-here
```

### 步骤 2: 启动开发服务器

```bash
npm run dev
```

### 步骤 3: 访问应用

打开浏览器访问：http://localhost:3000

### 步骤 4: 测试功能

输入测试提示词，例如：
- "帮我写一个关于猫的故事"
- "生成一个登录页面的代码"
- "画一只可爱的小狗"

## 📚 学习 Mastra 的关键点

### 1. Tool 的定义

```typescript
import { tool, jsonSchema } from 'ai';

export const myTool = tool({
  description: '工具描述',
  parameters: jsonSchema({...}),  // 参数 schema
  execute: async (params) => {...}  // 执行逻辑
});
```

**学习点**：
- 使用 Vercel AI SDK 的 `tool` 和 `jsonSchema`
- Agent 会自动决定何时调用工具
- 工具可以返回任何 JSON 数据

### 2. Agent 的定义

```typescript
import { Agent } from '@mastra/core/agent';
import { openai } from '@ai-sdk/openai';

export const myAgent = new Agent({
  id: 'my-agent',
  name: 'My Agent',
  instructions: '详细的系统指令',
  model: openai('gpt-4o-mini'),
  tools: { myTool },  // 注册工具
});
```

**学习点**：
- `instructions` 是 Agent 的"性格"和"能力"描述
- `model` 使用 `@ai-sdk/openai` 的模型
- `tools` 让 Agent 能够调用外部功能

### 3. Mastra 实例

```typescript
import { Mastra } from '@mastra/core/mastra';

export const mastra = new Mastra({
  agents: { myAgent },
});
```

**学习点**：
- 一个项目只需要一个 Mastra 实例
- 通过 `mastra.getAgent('id')` 获取 Agent
- 可以注册多个 Agents

### 4. 使用 Agent

```typescript
const agent = mastra.getAgent('my-agent');

const result = await agent.generate([
  {
    role: 'user',
    content: 'Hello!',
  },
]);

console.log(result.text);  // Agent 的响应
```

**学习点**：
- `generate` 方法接收消息数组
- 消息格式类似 OpenAI Chat API
- Agent 会自动调用必要的 Tools

## 🔧 下一步可以做什么

### 1. 添加更多 Tools

```typescript
// mastra/tools/prompt-tools.ts

export const formatPromptTool = tool({
  description: '格式化提示词为 Markdown',
  parameters: jsonSchema({...}),
  execute: async ({prompt}) => {
    // 格式化逻辑
  },
});
```

然后在 Agent 中注册：

```typescript
tools: {
  analyzeIntentTool,
  identifyAIToolTool,
  formatPromptTool,  // 新工具
},
```

### 2. 添加 Memory (记忆)

```typescript
import { Memory } from '@mastra/memory';

export const myAgent = new Agent({
  ...
  memory: new Memory(),  // 添加记忆能力
});
```

### 3. 添加 Workflow (工作流)

创建 `mastra/workflows/optimize-workflow.ts`：

```typescript
import { Workflow } from '@mastra/core/workflow';

export const optimizeWorkflow = new Workflow({
  id: 'optimize-flow',
  // 定义工作流步骤
});
```

### 4. 添加 Observability (可观察性)

```typescript
import { Observability } from '@mastra/observability';

export const mastra = new Mastra({
  agents: {...},
  observability: new Observability({
    default: { enabled: true },
  }),
});
```

## 🐛 常见问题

### Q1: Agent 没有调用 Tools

**原因**：模型可能认为不需要调用工具

**解决**：
- 在 `instructions` 中明确说明"必须使用工具"
- 或者在 prompt 中提示 Agent 使用工具

### Q2: Tools 返回的数据 Agent 没用上

**原因**：Agent 可能没有理解 Tool 的输出

**解决**：
- 改进 Tool 的 `description`
- Tool 返回更结构化的数据
- 在 Agent instructions 中说明如何使用 Tool 结果

### Q3: 响应格式不是 JSON

**原因**：Agent 可能没有按照要求输出

**解决**：
- 在 prompt 中明确要求 JSON 格式
- 使用结构化输出（需要配置 model）
- 在代码中做容错处理（已实现）

## 📖 参考资源

- [Mastra 官方文档](https://mastra.ai/docs)
- [Mastra GitHub](https://github.com/mastra-ai/mastra)
- [官方示例](https://github.com/mastra-ai/mastra/tree/main/examples/agent)
- [Vercel AI SDK](https://sdk.vercel.ai/docs)

## 🎉 恭喜！

你现在有一个基于 Mastra 框架的完整 AI Agent 了！

继续学习 Mastra 的更多功能，打造更强大的 AI 应用！🚀

