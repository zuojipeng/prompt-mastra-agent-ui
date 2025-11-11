# 🚀 快速开始

## 项目已重构为纯前端

这是一个纯前端 Next.js 项目，需要连接独立的后端 API 服务。

## ⚡ 快速启动

### 1. 安装依赖

```bash
npm install
```

### 2. 配置后端 API

创建 `.env.local` 文件：

```bash
# 连接到你的后端服务
NEXT_PUBLIC_API_URL=http://localhost:3001
```

如果不配置，开发环境默认使用 `http://localhost:3001`。

### 3. 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:3000

## 📋 项目结构（精简版）

```
prompt-optimizer-frontend/
├── app/                      # Next.js 应用
│   ├── components/
│   │   └── ChatBox.tsx      # 主聊天界面
│   ├── page.tsx             # 首页
│   └── layout.tsx           # 布局
├── lib/
│   └── api-client.ts        # 后端 API 客户端
├── package.json             # 仅前端依赖
└── README.md                # 完整文档
```

## 🔌 后端 API 要求

你的后端服务需要提供：

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
  "suggestions": ["建议1", "建议2"],
  "targetTool": "推荐工具",
  "reasoning": "优化理由"
}
```

### CORS 配置

后端需要允许跨域请求：

```javascript
// Express 示例
app.use(cors({
  origin: ['http://localhost:3000', 'https://your-frontend.com']
}));
```

## ✅ 测试步骤

### 1. 确认后端运行

```bash
# 测试后端 API
curl http://localhost:3001/api/optimize -X POST \
  -H "Content-Type: application/json" \
  -d '{"prompt":"test"}'
```

### 2. 启动前端

```bash
npm run dev
```

### 3. 在浏览器中测试

1. 访问 http://localhost:3000
2. 输入提示词
3. 点击"优化提示词"按钮
4. 查看结果

## 🐛 常见问题

### 连接失败

**症状**：点击按钮后显示错误

**检查**：
1. 后端是否运行在正确端口
2. `.env.local` 配置是否正确
3. 浏览器控制台查看网络错误

### CORS 错误

**症状**：控制台显示跨域错误

**解决**：在后端添加 CORS 配置（见上文）

## 📝 下一步

- 查看完整文档：`README.md`
- 环境配置指南：`ENV_CONFIG.md`
- 部署到生产环境

---

**项目已完全前后端分离！🎉**

