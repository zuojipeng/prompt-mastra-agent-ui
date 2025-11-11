# 🔧 环境配置指南

## 后端 API 配置

项目已连接到 Cloudflare Workers 后端服务：
```
https://prompt-optimizer.hahazuo460.workers.dev/api/optimize
```

## 环境变量配置

创建 `.env.local` 文件（可选，已有默认值）：

```bash
# Cloudflare Workers 后端（默认）
NEXT_PUBLIC_API_URL=https://prompt-optimizer.hahazuo460.workers.dev/api/optimize
```

## 快速配置（可选）

如果不创建 `.env.local`，会自动使用默认地址。

如需自定义，执行：

```bash
# 在项目根目录执行
echo "NEXT_PUBLIC_API_URL=https://prompt-optimizer.hahazuo460.workers.dev/api/optimize" > .env.local
```

## API 调用格式

前端会按以下格式调用后端：

```javascript
const response = await fetch(API_URL, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: '用户输入的提示词'
  })
});

const data = await response.json();
console.log(data.data.optimizedPrompt); // 优化后的提示词
```

## 后端请求/响应格式

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

## 生产部署

### Vercel

在 Vercel 项目设置中添加环境变量（可选）：

```
NEXT_PUBLIC_API_URL=https://prompt-optimizer.hahazuo460.workers.dev/api/optimize
```

如果不设置，会自动使用默认地址。

### Cloudflare Pages

在项目设置 → 环境变量（可选）：

```
NEXT_PUBLIC_API_URL=https://prompt-optimizer.hahazuo460.workers.dev/api/optimize
```

## 验证配置

### 1. 测试后端连接

```bash
# 测试 Cloudflare Workers API
curl https://prompt-optimizer.hahazuo460.workers.dev/api/optimize \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"message":"测试提示词优化"}'
```

### 2. 启动前端测试

```bash
npm run dev
```

访问 http://localhost:3000 并尝试优化一个提示词。

## 故障排除

### 问题：API 调用失败

**检查**：
1. 后端服务是否正常运行
2. 浏览器控制台查看详细错误
3. 网络连接是否正常

**解决**：
```bash
# 测试后端 API
curl https://prompt-optimizer.hahazuo460.workers.dev/api/optimize \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"message":"test"}'
```

### 问题：CORS 错误

**症状**：浏览器控制台显示跨域错误

**原因**：Cloudflare Workers 后端需要配置 CORS

**后端解决方案**：
```javascript
// Cloudflare Workers 示例
export default {
  async fetch(request) {
    const response = await handleRequest(request);
    
    // 添加 CORS 头
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type');
    
    return response;
  }
}
```

### 问题：环境变量不生效

**原因**：修改 `.env.local` 后需要重启

**解决**：
```bash
# 停止服务器 (Ctrl+C)
# 重新启动
npm run dev
```

## 本地开发与线上环境

### 默认行为
- 不创建 `.env.local`：使用 Cloudflare Workers（生产环境）
- 创建 `.env.local`：可以指向本地或其他服务

### 本地后端开发
如果你要在本地开发后端：

```bash
# .env.local
NEXT_PUBLIC_API_URL=http://localhost:8787/api/optimize
```

## 注意事项

⚠️ **重要**：
- 环境变量必须以 `NEXT_PUBLIC_` 开头才能在浏览器中使用
- 修改 `.env.local` 后必须重启开发服务器
- `.env.local` 不会被 Git 提交（已在 `.gitignore` 中）

✅ **默认配置**：
- 项目已内置默认 API 地址
- 可以直接运行，无需配置
- 需要自定义时才创建 `.env.local`

---

**配置完成后，就可以开始使用了！🚀**
