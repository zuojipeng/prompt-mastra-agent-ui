# Sprint 4 — 端到端工作流闭环 + 质量提升

## 里程碑 1: P0 Refinement UI ✅ (2026-05-20)

**交付成果：**
- 每个 PromptCard 增加「优化此镜头」按钮（紫色）
- 点击后展开 inline textarea，用户输入优化要求
- 调用 `optimizePrompt()` + `refinement` 参数，原地替换优化后内容
- 加载动画（spinner）、取消按钮、错误提示
- 优化后自动刷新历史记录

**后端修复：**
- `workers-entry-d1.ts`: refinement 参数从 body 解构并传给 `buildUserMessage`
  - 之前 refinement 被解析但丢弃了，优化请求退化为普通请求

**文件变更：**
- 后端: workers-entry-d1.ts (+2/-2)
- 前端: ChatBox.tsx (+142)

## 里程碑 2: P1 高级导演模式 + 平台导出 ✅ (2026-05-20)

**交付成果：**

### 高级导演模式 (Project Bible)
- 新建 `ProjectBiblePanel.tsx` 组件（227行）
- 7 个字段输入：主角设定、角色任务、世界观、视觉符号(tag输入)、统一视觉风格、连续性规则(tag输入)、镜头目的
- 蓝色(indigo)主题、可折叠面板、显示已填项数 badge、一键清空
- ChatBox 集成：工具栏「📖 导演模式」toggle 按钮
- 有值后显示「📖 导演模式 ✓」激活状态
- projectBible 数据随 API 请求发送

### 平台导出下拉
- 每个 PromptCard 增加「导出到 ▼」下拉菜单
- 支持 6 个目标：小云雀、Seedance、可灵Kling、Runway Gen-3、Pika、OpenAI Sora
- 平台特定格式处理：
  - XYQ: 直接打开页面
  - Seedance: 中文+英文双语
  - Kling: 英文提示词加拍片风格前缀
  - Runway/Pika/Sora: 复制原文
  - 复制结构化JSON: 带时间戳的结构化数据
- 点击外部关闭菜单

**文件变更：**
- 新增: app/components/ProjectBiblePanel.tsx (227行)
- 修改: ChatBox.tsx (+132)

## 待完成

### P1 UX (继续)
- 骨架屏加载状态（skeleton loading for prompt cards）✅
- 生成失败时的重试按钮 ✅
- 输入校验强化（空输入、超长输入、字符计数器）✅

### P2 测试体系 ✅
- **单元测试**：vitest 框架安装 + 2 个测试文件
  - `session-manager.test.ts`：12 个测试，覆盖 getUserId/createNewSession/getSessionInfo 等全部 7 个函数
  - `api-client.test.ts`：17 个测试，覆盖 normalizeTimeline/normalizePrompts/parseAssistantResult 等 6 个纯函数
  - 全部 29 个测试通过
- **Smoke test** 重写：4 阶段检查（HTML静态内容 → JS特性 → 包大小 → 无 localhost 泄露）
- **npm scripts**：`npm test`（vitest）、`npm run test:all`（vitest + smoke）

### P2 技术债务 ✅
- 修复测试文件中 `unknown` 类型转换的 tsc 错误
- vitest.config.ts 配置 alias（`@` → 根目录）

