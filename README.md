# 🤖 AI 智能提示词优化器

一个现代化的前端应用，帮助用户优化 AI 提示词，让 AI 工具更好地理解你的需求。

## ✨ 特性

- 🎨 **现代化 UI** - Next.js 15 + React 18 + TailwindCSS
- 🧠 **记忆功能** - 自动记住用户身份和对话历史
- 🌓 **深色模式** - 自动适配系统主题
- 📱 **完全响应式** - 移动端和桌面端完美支持
- ⚡ **性能优化** - 仅 3 个核心依赖，极速加载

## 🚀 快速开始

### 本地开发

```bash
# 1. 安装依赖
npm install

# 2. 启动开发服务器
npm run dev

# 3. 访问 http://localhost:3000
```

### 环境变量（可选）

如果需要自定义后端 API 地址，创建 `.env.local`：

```bash
# 默认使用这个地址，可以不配置
NEXT_PUBLIC_API_URL=https://prompt-optimizer.hahazuo460.workers.dev/api/optimize
```

## 📦 技术栈

```json
{
  "dependencies": {
    "next": "15.0.3",
    "react": "18.3.1",
    "react-dom": "18.3.1"
  }
}
```

## 🌐 部署到 Cloudflare Pages

### 步骤

1. **访问** https://dash.cloudflare.com/
2. **Workers & Pages** → **Create Application** → **Pages** → **Connect to Git**
3. **选择仓库**：`prompt-mastra-agent-ui`
4. **配置构建**：

```yaml
项目名称: prompt-optimizer-frontend
生产分支: main

构建设置:
  Framework preset: Next.js
  构建命令: npm run build
  构建输出目录: .next
  
环境变量（可选）:
  NODE_VERSION: 18
  NEXT_PUBLIC_API_URL: https://prompt-optimizer.hahazuo460.workers.dev/api/optimize
```

5. **点击部署** → 等待 2-3 分钟 → **完成！** 🎉

### 访问网站

```
https://prompt-optimizer-frontend.pages.dev
```

## 🔌 后端 API

### 接口格式

**请求**：
```bash
POST /api/optimize
Content-Type: application/json
X-User-Id: user-xxx
X-Session-Id: session-xxx

{
  "message": "用户输入的提示词"
}
```

**响应**：
```json
{
  "data": {
    "optimizedPrompt": "优化后的提示词",
    "targetTool": "推荐的AI工具",
    "suggestions": ["建议1", "建议2"],
    "reasoning": "优化理由",
    "originalPrompt": "原始提示词"
  }
}
```

## 🧠 记忆功能

自动管理用户ID和会话ID：

- **用户ID**：识别用户身份，存储在 localStorage
- **会话ID**：区分不同对话，点击"新建对话"生成新ID
- **自动携带**：每次 API 请求自动添加到 headers

## 📂 项目结构

```
prompt-optimizer-frontend/
├── app/
│   ├── components/
│   │   └── ChatBox.tsx      # 主聊天界面
│   ├── page.tsx             # 首页
│   └── layout.tsx           # 根布局
├── lib/
│   ├── api-client.ts        # API 客户端
│   └── session-manager.ts   # 会话管理
├── package.json
├── next.config.ts
└── README.md
```

## 🎨 功能展示

- ✅ 输入提示词
- ✅ 点击"优化提示词"
- ✅ 查看优化结果
- ✅ 一键复制优化后的提示词
- ✅ 查看改进建议
- ✅ 点击"新建对话"开始新主题

## 🐛 故障排除

### API 连接失败

确保后端服务正常运行，并且已配置 CORS：

```javascript
// 后端需要允许跨域
app.use(cors({
  origin: ['http://localhost:3000', 'https://your-frontend.com']
}));
```

### 环境变量不生效

修改 `.env.local` 后需要重启开发服务器：

```bash
# 停止服务器 (Ctrl+C)
npm run dev
```

### 构建失败

确认 Node.js 版本：

```bash
node -v  # 需要 >= 18
```

## 📄 许可

MIT License

## 🔗 相关链接

- **后端服务**: https://prompt-optimizer.hahazuo460.workers.dev
- **GitHub**: https://github.com/zuojipeng/prompt-mastra-agent-ui

---

**打造于 2025 | 让 AI 工具更好用 🚀**
