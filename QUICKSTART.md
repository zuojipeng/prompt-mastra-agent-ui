# 🚀 快速开始

## 项目说明

这是一个纯前端 Next.js 项目，连接到 Cloudflare Workers 后端服务进行提示词优化。

## ⚡ 2 步启动

### 1. 安装依赖

```bash
npm install
```

### 2. 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:3000 🎉

**就这么简单！** 项目已内置默认 API 配置，无需额外设置。

---

## 📝 配置说明（可选）

### 默认配置

项目默认连接到：
```
https://prompt-optimizer.hahazuo460.workers.dev/api/optimize
```

### 自定义配置（可选）

如需使用其他后端地址，创建 `.env.local`：

```bash
echo "NEXT_PUBLIC_API_URL=https://your-api.com/optimize" > .env.local
```

然后重启开发服务器。

---

## 🧪 测试

### 1. 测试后端 API（可选）

```bash
curl https://prompt-optimizer.hahazuo460.workers.dev/api/optimize \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"message":"帮我优化这个提示词：写一篇文章"}'
```

### 2. 测试前端

1. 访问 http://localhost:3000
2. 在输入框输入：`写一篇关于 AI 的文章`
3. 点击"优化提示词"按钮
4. 查看优化结果 ✨

---

## 📂 项目结构

```
prompt-optimizer-frontend/
├── app/
│   ├── components/
│   │   └── ChatBox.tsx      # ⭐ 主界面
│   ├── page.tsx             # 首页
│   └── layout.tsx           # 布局
├── lib/
│   └── api-client.ts        # ⭐ API 调用（已配置好）
└── package.json             # 只有 3 个核心依赖
```

---

## 🔌 后端 API 说明

### 端点
```
POST https://prompt-optimizer.hahazuo460.workers.dev/api/optimize
```

### 请求格式
```json
{
  "message": "用户输入的提示词"
}
```

### 响应格式
```json
{
  "data": {
    "optimizedPrompt": "优化后的提示词",
    "targetTool": "推荐的AI工具",
    "suggestions": ["建议1", "建议2", "建议3"],
    "reasoning": "优化理由",
    "originalPrompt": "原始提示词"
  }
}
```

---

## 🚀 部署

### Vercel (推荐)

```bash
# 1. 安装 Vercel CLI（如果还没有）
npm i -g vercel

# 2. 登录
vercel login

# 3. 部署
vercel

# 完成！无需配置环境变量（已有默认值）
```

### Cloudflare Pages

1. 连接 GitHub 仓库
2. 构建设置：
   - 构建命令：`npm run build`
   - 输出目录：`.next`
3. 部署（无需配置环境变量）

### 自定义域名绑定

部署后可以绑定你的域名，比如：
- `https://prompt.your-domain.com`

---

## 🐛 常见问题

### ❌ API 调用失败

**症状**：点击按钮后显示错误

**检查清单**：
- [ ] 网络连接是否正常
- [ ] 后端服务是否运行（测试上面的 curl 命令）
- [ ] 浏览器控制台查看详细错误

**解决**：
```bash
# 测试后端
curl https://prompt-optimizer.hahazuo460.workers.dev/api/optimize \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"message":"test"}'
```

### ❌ CORS 错误

**症状**：控制台显示跨域错误

**原因**：后端 Cloudflare Workers 需要配置 CORS

**解决**：在后端添加 CORS 响应头：
```javascript
response.headers.set('Access-Control-Allow-Origin', '*');
response.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
response.headers.set('Access-Control-Allow-Headers', 'Content-Type');
```

### ❌ 依赖安装失败

**解决**：
```bash
# 清理后重装
rm -rf node_modules package-lock.json
npm install
```

---

## 📋 前端调用示例

如果你想在其他项目中使用这个 API：

```javascript
// 在任何前端项目中
const response = await fetch('https://prompt-optimizer.hahazuo460.workers.dev/api/optimize', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ message: '帮我翻译这段话' })
});

const data = await response.json();
console.log(data.data.optimizedPrompt); // 优化后的提示词
```

---

## 🎯 功能特性

### ✨ 前端特性
- 🎨 现代化 UI - TailwindCSS 深色模式
- 📱 完全响应式 - 移动端友好
- ⚡ 快速加载 - 只有 3 个核心依赖
- 🔄 实时反馈 - 加载动画和错误提示
- 📋 一键复制 - 复制优化结果

### 🤖 后端特性（Cloudflare Workers）
- ⚡ 边缘计算 - 全球低延迟
- 🌍 全球分发 - 自动就近访问
- 🔒 安全可靠 - Cloudflare 基础设施
- 💰 免费额度 - 10 万次/天免费请求

---

## 📚 相关文档

详细信息请查看：
- **完整说明**: `README.md`
- **环境配置**: `ENV_CONFIG.md`
- **项目总结**: `PROJECT_SUMMARY.md`

---

## ✅ 检查清单

开始之前，确保：

- ✅ 安装了 Node.js 18+
- ✅ 运行了 `npm install`
- ✅ 运行了 `npm run dev`
- ✅ 访问 http://localhost:3000

**就这么简单！** 🎊

---

## 🎓 下一步

1. **测试功能** - 在界面中优化几个提示词
2. **查看代码** - 了解 `lib/api-client.ts` 的实现
3. **定制 UI** - 修改 `app/components/ChatBox.tsx`
4. **部署上线** - 使用 Vercel 或 Cloudflare Pages

---

**一切就绪，开始优化提示词！🚀**
