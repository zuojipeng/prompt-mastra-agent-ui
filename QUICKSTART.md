# ⚡ 5 分钟快速开始

## 本地开发（最快方式）

### 1️⃣ 安装依赖

```bash
npm install
```

### 2️⃣ 配置 API Key

创建 `.env.local` 文件：

```bash
echo "OPENAI_API_KEY=sk-your-api-key-here" > .env.local
```

替换 `sk-your-api-key-here` 为你的真实 API Key。

**获取 API Key**：访问 https://platform.openai.com/api-keys

### 3️⃣ 启动开发服务器

```bash
npm run dev
```

### 4️⃣ 打开浏览器

访问 http://localhost:3000

### 5️⃣ 测试功能

输入提示词，例如：

```
"帮我写一个关于猫的故事"
```

点击"优化提示词"，查看结果！🎉

---

## 部署到线上（5 分钟）

### 方式 A：全部用 Vercel（推荐新手）

```bash
# 1. 推送代码到 GitHub
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/your-username/my-mastra-agent.git
git push -u origin main

# 2. 访问 vercel.com
# 3. 点击 Import Project
# 4. 选择仓库并部署
# 5. 添加环境变量：OPENAI_API_KEY
# 6. 完成！
```

访问你的 Vercel URL，开始使用！

### 方式 B：Cloudflare Pages + Vercel

详细步骤请查看 [DEPLOYMENT.md](./DEPLOYMENT.md)

---

## 常见问题

### ❌ npm install 卡住

```bash
rm -rf node_modules package-lock.json
npm install
```

### ❌ API 调用失败

检查：
1. `.env.local` 文件是否存在
2. API Key 是否正确（以 `sk-` 开头）
3. OpenAI 账户是否有余额

### ❌ 页面显示空白

检查浏览器控制台（F12），查看错误信息。

---

## 下一步

- 📖 查看完整文档：[README.md](./README.md)
- 🚀 部署指南：[DEPLOYMENT.md](./DEPLOYMENT.md)
- 🔐 环境变量配置：[ENV_SETUP.md](./ENV_SETUP.md)

---

**开始你的 AI 提示词优化之旅！🚀**

