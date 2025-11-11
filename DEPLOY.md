# ☁️ 部署指南

## 🚀 Cloudflare Pages 部署（推荐）

### 配置（重要）⭐

```yaml
Framework preset: Next.js
构建命令: npm run build
构建输出目录: .next
Node 版本: 18
```

### 步骤

1. **登录** https://dash.cloudflare.com/
2. **Workers & Pages** → **Create** → **Pages** → **Connect to Git**
3. **选择仓库**: `zuojipeng/prompt-mastra-agent-ui`
4. **配置构建**（见上面）
5. **环境变量**（可选）:
   ```
   NODE_VERSION = 18
   NEXT_PUBLIC_API_URL = https://prompt-optimizer.hahazuo460.workers.dev/api/optimize
   ```
6. **点击部署** → 完成！

### 结果

```
https://prompt-optimizer-frontend.pages.dev
```

---

## 🔄 自动部署

推送代码自动触发：

```bash
git push origin main
# Cloudflare 自动构建并部署
```

---

## 🌐 Vercel 部署（备选）

1. 访问 https://vercel.com/
2. 导入 GitHub 仓库
3. 点击 Deploy
4. 完成！

**优势**：零配置，一键部署

---

## 🎨 自定义域名

Cloudflare Pages:
1. **Custom domains** → **Set up**
2. 输入域名（如 `prompt.your-domain.com`）
3. Cloudflare 自动配置 DNS
4. 等待 SSL 证书（1-5分钟）

---

## 🐛 常见问题

### 构建失败

**检查**：
1. Node 版本是否设置为 18
2. 构建命令是否为 `npm run build`
3. 输出目录是否为 `.next`

**查看日志**：
Cloudflare Dashboard → Pages → Deployments → 点击失败的部署

### CORS 错误

确保后端配置了 CORS 允许前端域名。

---

## ✅ 部署检查清单

- [ ] 代码已推送到 GitHub
- [ ] 已连接 Cloudflare Pages
- [ ] 构建配置正确
- [ ] 首次部署成功
- [ ] 网站可以访问
- [ ] API 调用正常
- [ ] 记忆功能工作

---

**就这么简单！🎉**

