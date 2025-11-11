# 🤖 AI 智能提示词优化器

一个强大的 AI Agent，帮助用户优化提示词，让 AI 工具更好地理解你的需求。

## ✨ 功能特性

- 🎯 **智能分析**：自动分析用户意图，理解真实需求
- 🔧 **提示词优化**：针对不同 AI 工具（ChatGPT、Claude、Midjourney 等）优化提示词
- 📝 **改进建议**：提供具体、可操作的提示词改进建议
- 🎨 **美观界面**：现代化的 UI 设计，支持深色模式
- ⚡ **实时响应**：快速返回优化结果

## 🏗️ 技术架构

```
前端：Next.js 16 + React 19 + TailwindCSS
后端：Next.js API Routes + OpenAI API
部署：Cloudflare Pages（前端）+ Vercel（后端 API）
```

## 📦 项目结构

```
my-mastra-agent/
├── app/
│   ├── api/                    # API 路由
│   │   ├── health/            # 健康检查
│   │   ├── optimize/          # 提示词优化（非流式）
│   │   └── optimize-stream/   # 提示词优化（流式）
│   ├── components/            # React 组件
│   │   └── ChatBox.tsx       # 聊天界面
│   ├── page.tsx              # 首页
│   ├── layout.tsx            # 布局
│   └── globals.css           # 全局样式
├── lib/
│   ├── prompt-optimizer.ts   # Agent 核心逻辑
│   └── api-client.ts         # API 客户端
├── next.config.ts            # Next.js 配置
├── package.json              # 依赖管理
└── tsconfig.json             # TypeScript 配置
```

## 🚀 快速开始

### 1. 克隆项目

```bash
git clone <your-repo-url>
cd my-mastra-agent
```

### 2. 安装依赖

```bash
npm install
```

### 3. 配置环境变量

创建 `.env.local` 文件：

```bash
# OpenAI API Key（必需）
OPENAI_API_KEY=sk-your-openai-api-key-here

# 本地开发不需要设置 API URL
```

### 4. 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:3000 查看效果。

## 📤 部署指南

### 方案：Cloudflare Pages（前端）+ Vercel（后端）

这是推荐的混合部署方案，充分利用两个平台的优势。

---

### 第一步：部署后端到 Vercel

#### 方式 A：Web 界面部署（推荐）

1. 访问 [vercel.com](https://vercel.com)
2. 使用 GitHub 账号登录
3. 点击 "Import Project"
4. 选择你的 GitHub 仓库
5. 配置项目：
   - **Project Name**: `my-mastra-agent`（或其他名称）
   - **Framework Preset**: Next.js
   - **Root Directory**: `./`
6. 添加环境变量：
   ```
   OPENAI_API_KEY=sk-your-openai-api-key
   ```
7. 点击 "Deploy"
8. 等待部署完成，得到 URL：`https://my-mastra-agent.vercel.app`

#### 方式 B：CLI 部署

```bash
# 安装 Vercel CLI
npm i -g vercel

# 登录
vercel login

# 部署
vercel --prod

# 添加环境变量
vercel env add OPENAI_API_KEY
```

#### 配置自定义域名（可选）

如果你想使用 `api.your-domain.com`：

1. 在 Vercel Dashboard → Settings → Domains
2. 添加域名：`api.your-domain.com`
3. Vercel 会给你 DNS 配置信息
4. 到 Cloudflare DNS 添加 CNAME 记录：
   ```
   类型: CNAME
   名称: api
   目标: cname.vercel-dns.com
   代理状态: 仅 DNS（关闭橙色云朵）⚠️
   ```

---

### 第二步：部署前端到 Cloudflare Pages

#### 1. 推送代码到 GitHub

```bash
git add .
git commit -m "Ready for deployment"
git push origin main
```

#### 2. 创建 Cloudflare Pages 项目

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com)
2. 进入 **Pages**
3. 点击 **Create a project**
4. 连接 GitHub 仓库
5. 选择你的项目仓库

#### 3. 配置构建设置

```
Build command: npm run build:cloudflare
Build output directory: out
Root directory: /
```

#### 4. 添加环境变量

在 Cloudflare Pages → Settings → Environment variables：

```
变量名: NEXT_PUBLIC_API_URL
值: https://my-mastra-agent.vercel.app

（或使用自定义域名）
值: https://api.your-domain.com

环境: Production ✅
```

#### 5. 部署

点击 **Save and Deploy**，等待部署完成。

#### 6. 配置自定义域名（可选）

在 Cloudflare Pages → Custom domains：

1. 添加你的域名：`your-domain.com`
2. Cloudflare 会自动配置 DNS
3. 等待 SSL 证书生效（约 1-2 分钟）

---

### 最终架构

```
用户访问 https://your-domain.com
  ↓
Cloudflare Pages（前端静态文件）
  - HTML/CSS/JS
  - CDN 加速
  ↓
用户输入提示词
  ↓
前端调用 https://api.your-domain.com/api/optimize
  ↓
Cloudflare DNS 解析 → Vercel
  ↓
Vercel Serverless Function
  - 运行 Agent 逻辑
  - 调用 OpenAI API
  ↓
返回优化结果给前端
  ↓
展示给用户
```

---

## 🔧 开发说明

### 环境变量

#### 本地开发（.env.local）

```bash
OPENAI_API_KEY=sk-xxx
```

#### Vercel（后端）

```bash
OPENAI_API_KEY=sk-xxx
```

#### Cloudflare Pages（前端）

```bash
NEXT_PUBLIC_API_URL=https://your-api-domain.com
```

### 可用脚本

```bash
# 开发
npm run dev

# 构建（Vercel 部署）
npm run build

# 构建（Cloudflare Pages 部署）
npm run build:cloudflare

# 代码检查
npm run lint
```

### API 端点

- `GET /api/health` - 健康检查
- `POST /api/optimize` - 提示词优化（返回 JSON）
- `POST /api/optimize-stream` - 提示词优化（流式响应）

#### 请求示例

```bash
curl -X POST https://api.your-domain.com/api/optimize \
  -H "Content-Type: application/json" \
  -d '{"prompt": "帮我写一个关于猫的故事"}'
```

#### 响应示例

```json
{
  "originalPrompt": "帮我写一个关于猫的故事",
  "optimizedPrompt": "请创作一个温馨的短篇故事...",
  "targetTool": "ChatGPT",
  "suggestions": [
    "明确故事的目标受众",
    "指定故事的长度和风格",
    "添加具体的情节要求"
  ],
  "reasoning": "原始提示词较为模糊..."
}
```

---

## 🎨 自定义

### 修改 AI 模型

编辑 `lib/prompt-optimizer.ts`：

```typescript
const completion = await this.openai.chat.completions.create({
  model: 'gpt-4o-mini', // 改成 'gpt-4o' 或其他模型
  // ...
});
```

### 修改系统提示词

编辑 `lib/prompt-optimizer.ts` 中的 `systemPrompt` 变量，自定义 Agent 行为。

### 添加更多 AI 工具支持

在系统提示词中添加更多工具类型（Midjourney、Stable Diffusion、GitHub Copilot 等）。

---

## 🐛 常见问题

### 1. npm install 卡住或报错

**解决方案**：

```bash
# 清理缓存
rm -rf node_modules package-lock.json
npm cache clean --force

# 重新安装
npm install
```

### 2. API 调用失败（CORS 错误）

**原因**：前端和后端不在同一域名，跨域请求被阻止。

**解决方案**：
- 确保 `next.config.ts` 中配置了 CORS headers
- Cloudflare Pages 环境变量中正确设置了 `NEXT_PUBLIC_API_URL`

### 3. OpenAI API Key 无效

**检查**：
- 确认 API Key 格式正确（以 `sk-` 开头）
- 确认在 Vercel 环境变量中正确配置
- 确认 OpenAI 账户有余额

### 4. Cloudflare Pages 构建失败

**常见原因**：
- 未设置 `DEPLOY_TARGET=cloudflare` 环境变量
- 构建命令错误，应该是 `npm run build:cloudflare`

---

## 📊 成本估算

### 免费额度（个人项目）

- **Cloudflare Pages**: 完全免费，无限请求
- **Vercel**: 100 次 Serverless 调用/天（免费版）
- **OpenAI API**: 按使用量付费
  - GPT-4o-mini: $0.15/1M input tokens, $0.60/1M output tokens
  - 单次优化约 $0.001-0.005

**预估月成本**：$0-10（取决于使用量）

---

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

---

## 📄 许可

MIT License

---

## 🔗 相关链接

- [Next.js 文档](https://nextjs.org/docs)
- [OpenAI API 文档](https://platform.openai.com/docs)
- [Vercel 部署指南](https://vercel.com/docs)
- [Cloudflare Pages 文档](https://developers.cloudflare.com/pages)

---

**打造于 2025 | 让 AI 工具更好用 🚀**
