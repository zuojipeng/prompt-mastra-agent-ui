# 📦 快速部署指南

## 🎯 部署前检查清单

在开始部署前，确保：

- [ ] 代码已推送到 GitHub
- [ ] 拥有 OpenAI API Key
- [ ] 拥有 Cloudflare 账号（如果使用 Cloudflare Pages）
- [ ] 拥有 Vercel 账号

---

## 🚀 一键部署到 Vercel（最简单）

如果你不需要 Cloudflare Pages，可以全部部署到 Vercel：

### 步骤 1：点击部署按钮

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/your-username/my-mastra-agent)

### 步骤 2：配置环境变量

在部署页面添加：

```
OPENAI_API_KEY=sk-your-openai-api-key
```

### 步骤 3：部署完成

等待约 1-2 分钟，你会得到一个 URL：

```
https://my-mastra-agent.vercel.app
```

访问这个 URL 即可使用！🎉

---

## 🔀 混合部署（Cloudflare + Vercel）

### 为什么选择混合部署？

- ✅ 前端走 Cloudflare CDN，全球加速
- ✅ 后端在 Vercel，无需担心兼容性
- ✅ 使用 Cloudflare 的域名

### Step 1：部署后端到 Vercel

#### 1.1 推送代码到 GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/your-username/my-mastra-agent.git
git push -u origin main
```

#### 1.2 导入到 Vercel

1. 访问 https://vercel.com
2. 点击 "New Project"
3. 选择 GitHub 仓库：`my-mastra-agent`
4. 点击 "Import"

#### 1.3 配置环境变量

在配置页面添加：

```
Name: OPENAI_API_KEY
Value: sk-your-openai-api-key
```

#### 1.4 部署

点击 "Deploy"，等待完成。

#### 1.5 记录 URL

部署完成后，复制你的 Vercel URL：

```
https://my-mastra-agent-xxx.vercel.app
```

### Step 2：部署前端到 Cloudflare Pages

#### 2.1 登录 Cloudflare

访问 https://dash.cloudflare.com

#### 2.2 创建 Pages 项目

1. 点击左侧 **Workers & Pages**
2. 点击 **Create application**
3. 选择 **Pages** 标签
4. 点击 **Connect to Git**

#### 2.3 连接 GitHub

1. 授权 Cloudflare 访问 GitHub
2. 选择仓库：`my-mastra-agent`
3. 点击 **Begin setup**

#### 2.4 配置构建

```
Project name: my-mastra-agent
Production branch: main

Build settings:
  Framework preset: Next.js
  Build command: npm run build:cloudflare
  Build output directory: out
```

#### 2.5 设置环境变量

点击 **Environment variables** → **Add variable**：

```
Variable name: NEXT_PUBLIC_API_URL
Value: https://my-mastra-agent-xxx.vercel.app
       （使用你在 Step 1.5 记录的 URL）

Environment: Production
```

#### 2.6 部署

点击 **Save and Deploy**。

等待 2-3 分钟，部署完成后你会得到：

```
https://my-mastra-agent-xxx.pages.dev
```

---

## 🌐 配置自定义域名

### 情况 A：域名在 Cloudflare

#### 前端域名（主域名）

1. Cloudflare Pages → Custom domains
2. 添加：`your-domain.com`
3. Cloudflare 自动配置 DNS
4. 等待 SSL 生效（1-2 分钟）

#### 后端域名（API 子域名）

1. Vercel Dashboard → Settings → Domains
2. 添加：`api.your-domain.com`
3. Vercel 显示 DNS 配置：
   ```
   CNAME: cname.vercel-dns.com
   ```
4. 到 Cloudflare DNS 添加记录：
   ```
   类型: CNAME
   名称: api
   目标: cname.vercel-dns.com
   代理状态: 仅 DNS ⚠️（灰色云朵）
   ```
5. 等待 DNS 生效（5-10 分钟）

#### 更新前端环境变量

回到 Cloudflare Pages → Settings → Environment variables：

```
更新 NEXT_PUBLIC_API_URL:
  从: https://my-mastra-agent-xxx.vercel.app
  到: https://api.your-domain.com
```

重新部署前端：

```bash
git commit --allow-empty -m "Trigger redeploy"
git push
```

### 情况 B：域名不在 Cloudflare

1. 到你的域名注册商修改 DNS
2. 添加 CNAME 记录指向 Cloudflare Pages
3. 添加 CNAME 记录指向 Vercel

---

## ✅ 验证部署

### 1. 测试后端 API

```bash
# 测试健康检查
curl https://api.your-domain.com/api/health

# 应该返回
{"status":"ok","timestamp":"...","service":"Prompt Optimizer Agent"}
```

```bash
# 测试优化 API
curl -X POST https://api.your-domain.com/api/optimize \
  -H "Content-Type: application/json" \
  -d '{"prompt":"帮我写一个故事"}'

# 应该返回优化结果（JSON）
```

### 2. 测试前端

1. 访问 `https://your-domain.com`
2. 输入测试提示词：`"帮我写一个关于猫的故事"`
3. 点击"优化提示词"
4. 查看结果

### 3. 检查浏览器控制台

打开开发者工具（F12）→ Network：

```
✅ API 请求到: https://api.your-domain.com/api/optimize
✅ 状态码: 200 OK
✅ 返回数据包含 optimizedPrompt
```

---

## 🔄 更新部署

### 更新代码

```bash
# 修改代码
git add .
git commit -m "Update feature"
git push

# Vercel 自动重新部署
# Cloudflare Pages 自动重新部署
```

### 更新环境变量

#### Vercel

```bash
# 使用 CLI
vercel env add OPENAI_API_KEY production

# 或在 Dashboard → Settings → Environment Variables
```

#### Cloudflare Pages

```
Dashboard → Settings → Environment variables
→ 编辑变量
→ 点击 Save
→ 触发重新部署
```

---

## 🐛 故障排除

### 问题 1：前端无法连接后端

**症状**：点击优化按钮没有反应，控制台显示网络错误

**排查**：

```bash
# 1. 检查环境变量
echo $NEXT_PUBLIC_API_URL

# 2. 检查 API 是否可访问
curl https://api.your-domain.com/api/health

# 3. 检查 CORS 配置
# 查看 next.config.ts 中的 headers 配置
```

**解决**：

- 确保 Cloudflare Pages 环境变量中设置了 `NEXT_PUBLIC_API_URL`
- 确保 API 域名可以访问
- 重新部署前端

### 问题 2：API 返回 500 错误

**症状**：后端 API 报错

**排查**：

```bash
# 查看 Vercel 日志
vercel logs

# 或在 Dashboard → Deployments → 点击部署 → Functions 标签
```

**可能原因**：

- OpenAI API Key 未配置或无效
- OpenAI API 配额用完
- 代码错误

**解决**：

- 检查 Vercel 环境变量
- 检查 OpenAI 账户余额
- 查看错误日志修复代码

### 问题 3：Cloudflare Pages 构建失败

**症状**：部署失败，显示构建错误

**排查**：

查看构建日志：

```
Dashboard → Deployments → 点击失败的部署 → 查看日志
```

**可能原因**：

- 构建命令错误
- 环境变量未设置
- 依赖安装失败

**解决**：

```bash
# 确保构建命令正确
Build command: npm run build:cloudflare

# 确保输出目录正确
Build output directory: out

# 确保设置了环境变量
NEXT_PUBLIC_API_URL=https://your-api-url.com
```

### 问题 4：自定义域名 SSL 证书错误

**症状**：访问域名显示证书无效

**排查**：

```bash
# 检查 DNS 是否正确解析
nslookup api.your-domain.com

# 检查 SSL 状态
curl -I https://api.your-domain.com
```

**解决**：

- 等待 SSL 证书生效（可能需要 10-30 分钟）
- 确保 DNS 记录正确
- Cloudflare 的 CNAME 记录代理状态设为"仅 DNS"

---

## 📊 监控和维护

### Vercel

```
Dashboard → Project → Analytics
  - 请求数
  - 错误率
  - 响应时间
```

### Cloudflare

```
Dashboard → Analytics & Logs
  - 流量统计
  - 性能数据
  - 安全事件
```

### OpenAI

```
https://platform.openai.com/usage
  - API 调用次数
  - Token 使用量
  - 成本统计
```

---

## 🎉 完成！

恭喜你成功部署了 AI 智能提示词优化器！

现在你可以：

- ✅ 分享给朋友使用
- ✅ 监控使用情况
- ✅ 根据反馈优化功能
- ✅ 扩展更多 AI 工具支持

**需要帮助？** 查看 [README.md](./README.md) 或提交 Issue。

---

**祝你使用愉快！🚀**

