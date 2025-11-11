# 🔐 环境变量配置指南

## 本地开发环境

### 步骤 1：创建环境变量文件

在项目根目录创建 `.env.local` 文件：

```bash
# 在项目根目录
touch .env.local
```

### 步骤 2：添加配置

编辑 `.env.local`，添加以下内容：

```bash
# OpenAI API Key（必需）
# 在 https://platform.openai.com/api-keys 获取
OPENAI_API_KEY=sk-your-actual-api-key-here

# API URL（本地开发不需要设置）
# NEXT_PUBLIC_API_URL=http://localhost:3000
```

### 步骤 3：获取 OpenAI API Key

1. 访问 https://platform.openai.com/api-keys
2. 登录你的 OpenAI 账号
3. 点击 "Create new secret key"
4. 复制生成的 Key（以 `sk-` 开头）
5. 粘贴到 `.env.local` 文件中

### 步骤 4：验证配置

```bash
# 启动开发服务器
npm run dev

# 访问 http://localhost:3000
# 尝试输入提示词进行优化
```

---

## 生产环境配置

### Vercel（后端 API）

#### 方式 1：Web 界面

1. 进入项目 Dashboard
2. 点击 **Settings** → **Environment Variables**
3. 添加变量：

```
Name: OPENAI_API_KEY
Value: sk-your-actual-api-key
Environment: Production ✅
```

4. 点击 **Save**
5. 重新部署项目

#### 方式 2：CLI

```bash
# 添加环境变量
vercel env add OPENAI_API_KEY production

# 输入你的 API Key

# 重新部署
vercel --prod
```

---

### Cloudflare Pages（前端）

#### 方式 1：Web 界面

1. 进入项目 Dashboard
2. 点击 **Settings** → **Environment variables**
3. 添加变量：

```
Variable name: NEXT_PUBLIC_API_URL
Value: https://your-api-domain.com
Environment: Production ✅
```

**重要说明**：

- 如果使用 Vercel 默认域名：`https://my-mastra-agent.vercel.app`
- 如果使用自定义域名：`https://api.your-domain.com`

4. 点击 **Save**
5. 触发重新部署（提交一个新 commit）

#### 方式 2：CLI

```bash
# Cloudflare Pages 暂不支持 CLI 设置环境变量
# 请使用 Web 界面
```

---

## 环境变量说明

### OPENAI_API_KEY

- **类型**：服务器端环境变量
- **必需**：是
- **用途**：调用 OpenAI API
- **位置**：Vercel（后端）
- **获取**：https://platform.openai.com/api-keys
- **格式**：`sk-proj-xxx...` 或 `sk-xxx...`

### NEXT_PUBLIC_API_URL

- **类型**：客户端环境变量（`NEXT_PUBLIC_` 前缀）
- **必需**：仅 Cloudflare Pages 需要
- **用途**：前端调用后端 API 的地址
- **位置**：Cloudflare Pages（前端）
- **示例**：
  - Vercel 默认域名：`https://my-mastra-agent.vercel.app`
  - 自定义域名：`https://api.your-domain.com`
  - 本地开发：留空或 `http://localhost:3000`

---

## 安全最佳实践

### ✅ 应该做的

- ✅ 将 `.env.local` 添加到 `.gitignore`（已配置）
- ✅ 不要在代码中硬编码 API Key
- ✅ 使用环境变量管理敏感信息
- ✅ 定期轮换 API Key
- ✅ 监控 API 使用量，设置预算警告

### ❌ 不应该做的

- ❌ 将 API Key 提交到 Git
- ❌ 在前端代码中使用 `OPENAI_API_KEY`
- ❌ 分享 `.env.local` 文件
- ❌ 在公开场合展示 API Key

---

## 常见问题

### Q1: 为什么有两个环境变量？

**A**: 

- `OPENAI_API_KEY`：后端使用，不会暴露给用户
- `NEXT_PUBLIC_API_URL`：前端使用，告诉前端去哪里调用 API

### Q2: 本地开发需要设置 NEXT_PUBLIC_API_URL 吗？

**A**: 不需要。本地开发时，前端和后端都在 `localhost:3000`，会自动使用相同域名。

### Q3: 全部部署到 Vercel 需要设置 NEXT_PUBLIC_API_URL 吗？

**A**: 不需要。当前端和后端在同一个 Vercel 项目时，留空即可。

### Q4: 如何验证环境变量是否生效？

**A**: 

```bash
# 本地测试
npm run dev
# 访问 http://localhost:3000
# 尝试优化一个提示词

# 生产环境测试
curl https://api.your-domain.com/api/health
# 应返回 {"status":"ok",...}
```

### Q5: API Key 泄露了怎么办？

**A**: 

1. 立即到 OpenAI Platform 删除该 Key
2. 生成新的 Key
3. 更新 Vercel 环境变量
4. 重新部署
5. 检查账单，看是否有异常使用

---

## 成本控制

### 设置使用限制

在 OpenAI Platform → Settings → Limits：

```
Hard limit: $10/month（根据需求设置）
Email alerts at: $5
```

### 监控使用情况

访问 https://platform.openai.com/usage

每天查看：
- Token 使用量
- 请求次数
- 估算成本

---

## 检查清单

部署前确认：

- [ ] `.env.local` 在 `.gitignore` 中
- [ ] 本地开发环境变量配置正确
- [ ] Vercel 环境变量配置：`OPENAI_API_KEY`
- [ ] Cloudflare Pages 环境变量配置：`NEXT_PUBLIC_API_URL`
- [ ] API Key 有效且有余额
- [ ] 设置了 OpenAI 使用限制
- [ ] 测试本地开发正常
- [ ] 测试生产环境正常

---

**配置完成！开始使用吧 🎉**

