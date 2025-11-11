# 🤖 AI 智能提示词优化器 - 前端

一个美观、现代化的前端应用，用于优化 AI 提示词。

## ✨ 特性

- 🎨 **现代化 UI** - 使用 Next.js 16 + React 19 + TailwindCSS
- 🌓 **深色模式** - 自动适配系统主题
- 📱 **响应式设计** - 完美支持移动端和桌面端
- ⚡ **性能优化** - 快速加载，流畅体验
- 🔌 **后端分离** - 连接独立的后端 API 服务

## 🚀 快速开始

### 环境要求

- Node.js 18+ 
- npm 或 pnpm

### 安装依赖

```bash
npm install
```

### 配置后端 API

创建 `.env.local` 文件：

```bash
# 后端 API 地址
NEXT_PUBLIC_API_URL=http://localhost:3001
```

**环境配置说明**：

- **开发环境**：如果不配置，默认使用 `http://localhost:3001`
- **生产环境**：必须配置 `NEXT_PUBLIC_API_URL` 为后端服务地址

### 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:3000

### 构建生产版本

```bash
npm run build
npm start
```

## 📂 项目结构

```
prompt-optimizer-frontend/
├── app/                        # Next.js App Router
│   ├── components/            # React 组件
│   │   └── ChatBox.tsx       # 主聊天界面
│   ├── page.tsx              # 首页
│   ├── layout.tsx            # 根布局
│   └── globals.css           # 全局样式
├── lib/
│   └── api-client.ts         # 后端 API 客户端
├── public/                    # 静态资源
├── next.config.ts            # Next.js 配置
├── package.json              # 项目依赖
└── tsconfig.json             # TypeScript 配置
```

## 🔌 后端 API 接口规范

前端期望后端提供以下接口：

### POST /api/optimize

**请求**：
```json
{
  "prompt": "用户输入的提示词"
}
```

**响应**：
```json
{
  "originalPrompt": "原始提示词",
  "optimizedPrompt": "优化后的提示词",
  "suggestions": ["建议1", "建议2", "建议3"],
  "targetTool": "推荐的AI工具",
  "reasoning": "优化理由"
}
```

**错误响应**：
```json
{
  "error": "错误信息"
}
```

## 🎨 UI 组件

### ChatBox 组件

主要的聊天界面组件，包含：

- **输入区域** - 用户输入提示词
- **结果展示** - 显示优化结果
  - 推荐 AI 工具卡片
  - 优化后的提示词（可复制）
  - 优化理由
  - 改进建议列表
  - 原始提示词对比

### 功能特点

- ✅ 加载状态动画
- ✅ 错误提示
- ✅ 一键复制优化结果
- ✅ 优雅的动画效果
- ✅ 完整的无障碍支持

## 🌐 部署

### Vercel (推荐)

```bash
# 1. 安装 Vercel CLI
npm i -g vercel

# 2. 部署
vercel

# 3. 配置环境变量
vercel env add NEXT_PUBLIC_API_URL
```

### Cloudflare Pages

```bash
# 构建命令
npm run build

# 输出目录
.next

# 环境变量
NEXT_PUBLIC_API_URL=https://your-backend-api.com
```

### Docker

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
ENV NEXT_PUBLIC_API_URL=http://your-backend:3001
EXPOSE 3000
CMD ["npm", "start"]
```

## 🔧 开发

### 添加新功能

1. 在 `app/components/` 创建新组件
2. 在 `lib/api-client.ts` 添加新的 API 调用
3. 在 `app/page.tsx` 集成新功能

### 样式自定义

- 全局样式：`app/globals.css`
- TailwindCSS 配置：`tailwind.config.js`（如需自定义）
- 组件内样式：使用 Tailwind class

### TypeScript

项目使用严格的 TypeScript 配置：

```typescript
// lib/api-client.ts
export interface OptimizationResult {
  originalPrompt: string;
  optimizedPrompt: string;
  suggestions: string[];
  targetTool: string;
  reasoning: string;
}
```

## 🐛 故障排除

### API 连接失败

**问题**：前端无法连接后端

**检查**：
1. 后端服务是否正常运行
2. `NEXT_PUBLIC_API_URL` 配置是否正确
3. 是否存在 CORS 问题（后端需要允许跨域）

**解决**：
```bash
# 检查环境变量
echo $NEXT_PUBLIC_API_URL

# 测试后端 API
curl http://localhost:3001/api/optimize -X POST \
  -H "Content-Type: application/json" \
  -d '{"prompt":"test"}'
```

### CORS 错误

如果后端和前端在不同域名，后端需要配置 CORS：

```javascript
// Express 示例
app.use(cors({
  origin: ['http://localhost:3000', 'https://your-frontend.com'],
  credentials: true
}));
```

### 构建错误

```bash
# 清理缓存
rm -rf .next node_modules package-lock.json

# 重新安装
npm install

# 重新构建
npm run build
```

## 📱 浏览器支持

- ✅ Chrome (最新)
- ✅ Firefox (最新)
- ✅ Safari (最新)
- ✅ Edge (最新)
- ✅ 移动端浏览器

## 🤝 后端集成示例

### 示例 1：Express.js

```javascript
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

app.post('/api/optimize', async (req, res) => {
  const { prompt } = req.body;
  
  // 你的优化逻辑
  const result = {
    originalPrompt: prompt,
    optimizedPrompt: '优化后的提示词',
    suggestions: ['建议1', '建议2'],
    targetTool: 'ChatGPT',
    reasoning: '优化理由'
  };
  
  res.json(result);
});

app.listen(3001);
```

### 示例 2：Next.js API Route

```typescript
// app/api/optimize/route.ts
export async function POST(req: Request) {
  const { prompt } = await req.json();
  
  // 你的优化逻辑
  
  return Response.json({
    originalPrompt: prompt,
    optimizedPrompt: '...',
    suggestions: ['...'],
    targetTool: '...',
    reasoning: '...'
  });
}
```

## 📄 许可

MIT License

## 🙏 致谢

- [Next.js](https://nextjs.org/)
- [React](https://react.dev/)
- [TailwindCSS](https://tailwindcss.com/)

---

**打造于 2025 | 让 AI 工具更好用 🚀**
