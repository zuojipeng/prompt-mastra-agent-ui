# ☁️ Cloudflare Pages 部署指南

## 🚀 快速部署

### 方式 1：通过 Cloudflare Dashboard（推荐）

这是最简单的方式，完全在网页上操作。

#### 步骤：

1. **登录 Cloudflare**
   - 访问 https://dash.cloudflare.com/
   - 登录你的账号

2. **创建 Pages 项目**
   - 左侧菜单：Workers & Pages
   - 点击 "Create Application"
   - 选择 "Pages"
   - 点击 "Connect to Git"

3. **连接 GitHub 仓库**
   - 选择 `prompt-mastra-agent-ui` 仓库
   - 点击 "Begin setup"

4. **配置构建设置**
   ```
   项目名称: prompt-optimizer-frontend
   生产分支: main
   
   构建设置:
   ├─ Framework preset: Next.js
   ├─ 构建命令: npx @cloudflare/next-on-pages
   └─ 构建输出目录: .vercel/output/static
   ```

5. **环境变量（可选）**
   
   如果需要自定义 API 地址：
   ```
   变量名: NEXT_PUBLIC_API_URL
   值: https://prompt-optimizer.hahazuo460.workers.dev/api/optimize
   ```

6. **开始部署**
   - 点击 "Save and Deploy"
   - 等待构建完成（约 2-3 分钟）
   - 完成！🎉

7. **访问网站**
   - 部署成功后会显示 URL
   - 格式：`https://prompt-optimizer-frontend.pages.dev`

---

### 方式 2：通过命令行部署

#### 前置要求
```bash
# 安装依赖（包含 Cloudflare 工具）
npm install
```

#### 步骤：

1. **登录 Cloudflare**
   ```bash
   npx wrangler login
   ```
   会打开浏览器完成授权。

2. **构建项目**
   ```bash
   npm run pages:build
   ```
   
   或手动：
   ```bash
   npm run build
   npx @cloudflare/next-on-pages
   ```

3. **部署到 Cloudflare Pages**
   ```bash
   npm run pages:deploy
   ```
   
   或手动：
   ```bash
   npx wrangler pages deploy .vercel/output/static --project-name=prompt-optimizer-frontend
   ```

4. **访问网站**
   - 命令行会显示部署 URL
   - 或访问 Cloudflare Dashboard 查看

---

## 📝 配置文件说明

### 1. `next.config.ts`

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cloudflare Pages 优化配置
  images: {
    unoptimized: true, // Cloudflare 不支持 Next.js 图片优化
  },
  
  output: 'standalone', // 独立输出模式
};

export default nextConfig;
```

### 2. `package.json` 新增脚本

```json
{
  "scripts": {
    "pages:build": "@cloudflare/next-on-pages",
    "pages:deploy": "npm run pages:build && wrangler pages deploy .vercel/output/static",
    "pages:dev": "wrangler pages dev .vercel/output/static"
  }
}
```

### 3. `wrangler.toml`（可选）

用于本地开发和配置：
```toml
name = "prompt-optimizer-frontend"
compatibility_date = "2024-01-01"
```

---

## 🔧 Cloudflare Dashboard 配置

### 构建设置

访问 Cloudflare Dashboard → Pages → 你的项目 → Settings → Builds & deployments

```yaml
生产分支: main
预览分支: 所有分支

构建配置:
  Framework preset: Next.js
  构建命令: npx @cloudflare/next-on-pages
  构建输出目录: .vercel/output/static
  
环境变量:
  NODE_VERSION: 18
  NEXT_PUBLIC_API_URL: https://prompt-optimizer.hahazuo460.workers.dev/api/optimize
```

### 环境变量配置

Settings → Environment variables

| 变量名 | 值 | 环境 |
|--------|-----|------|
| `NEXT_PUBLIC_API_URL` | `https://prompt-optimizer.hahazuo460.workers.dev/api/optimize` | Production |
| `NODE_VERSION` | `18` | Production |

---

## 🌍 自定义域名

### 添加自定义域名

1. **在 Cloudflare Pages 中**
   - Pages → 你的项目 → Custom domains
   - 点击 "Set up a custom domain"

2. **输入域名**
   ```
   例如: prompt.your-domain.com
   ```

3. **配置 DNS**
   - Cloudflare 会自动配置（如果域名在 Cloudflare）
   - 如果域名不在 Cloudflare，需要添加 CNAME 记录

4. **等待生效**
   - SSL 证书自动签发
   - 通常 1-5 分钟完成

---

## ⚡ 自动部署

### Git 推送自动部署

配置完成后，每次推送代码到 GitHub 会自动触发部署：

```bash
# 修改代码
git add .
git commit -m "feat: 新功能"
git push origin main

# Cloudflare Pages 会自动：
# 1. 检测到推送
# 2. 开始构建
# 3. 部署到生产环境
# 4. 更新 URL
```

### 预览部署

推送到非主分支会创建预览环境：

```bash
# 创建功能分支
git checkout -b feature/new-ui
git push origin feature/new-ui

# Cloudflare 会创建预览 URL：
# https://abc123.prompt-optimizer-frontend.pages.dev
```

---

## 🧪 本地测试 Cloudflare 环境

```bash
# 1. 构建项目
npm run build
npx @cloudflare/next-on-pages

# 2. 本地运行 Cloudflare Pages 环境
npm run pages:dev

# 3. 访问
# http://localhost:8788
```

---

## 📊 构建日志

### 成功的构建输出

```
✓ Creating an optimized production build
✓ Compiled successfully
✓ Linting and checking validity of types
✓ Collecting page data
✓ Generating static pages (5/5)
✓ Collecting build traces
✓ Finalizing page optimization

⚡️ Completed @cloudflare/next-on-pages CLI build process
├── .vercel/output/static/
│   ├── _next/
│   ├── index.html
│   └── _worker.js

✅ Build Summary
├── Total files: 42
├── Build time: 45.2s
└── Output size: 2.3 MB
```

---

## 🐛 常见问题

### 问题 1：构建失败 - Node.js 版本

**错误信息**：
```
Error: The engine "node" is incompatible with this module
```

**解决方案**：
在 Cloudflare Pages 设置环境变量：
```
NODE_VERSION = 18
```

### 问题 2：构建命令找不到

**错误信息**：
```
Command not found: @cloudflare/next-on-pages
```

**解决方案**：
使用完整命令：
```bash
npx @cloudflare/next-on-pages
```

### 问题 3：环境变量不生效

**问题**：`NEXT_PUBLIC_API_URL` 没有生效

**原因**：环境变量必须以 `NEXT_PUBLIC_` 开头

**解决方案**：
1. 确认变量名正确
2. 重新部署（修改环境变量需要重新构建）

### 问题 4：图片无法加载

**原因**：Cloudflare Pages 不支持 Next.js Image Optimization

**解决方案**：
已在 `next.config.ts` 中配置：
```typescript
images: {
  unoptimized: true
}
```

### 问题 5：localStorage 不工作

**原因**：浏览器隐私设置或 HTTPS 问题

**解决方案**：
- 确保使用 HTTPS（Cloudflare 自动提供）
- 检查浏览器 Cookie/Storage 设置

---

## 📈 性能优化

### Cloudflare Pages 优势

- ✅ **全球 CDN** - 300+ 数据中心
- ✅ **自动 HTTPS** - 免费 SSL 证书
- ✅ **无限带宽** - 免费计划无带宽限制
- ✅ **快速部署** - 平均 2-3 分钟
- ✅ **自动预览** - 每个分支独立预览 URL

### 构建优化

```typescript
// next.config.ts
const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
  },
  output: 'standalone',
  
  // 生产环境优化
  swcMinify: true, // 使用 SWC 压缩
  compress: true,  // 启用 gzip 压缩
};
```

---

## 🎯 部署清单

完整的部署前检查：

- [ ] 已推送代码到 GitHub
- [ ] 已登录 Cloudflare Dashboard
- [ ] 已连接 GitHub 仓库
- [ ] 已配置构建命令
- [ ] 已设置环境变量（如需要）
- [ ] 已触发第一次构建
- [ ] 已验证部署 URL 可访问
- [ ] 已测试功能正常
- [ ] 已配置自定义域名（可选）

---

## 📞 获取帮助

### Cloudflare 文档
- https://developers.cloudflare.com/pages/

### Next.js on Cloudflare
- https://developers.cloudflare.com/pages/framework-guides/nextjs/

### 社区支持
- Cloudflare Discord
- GitHub Issues

---

## 🎉 部署完成后

### 你的网站 URL

```
生产环境: https://prompt-optimizer-frontend.pages.dev
预览环境: https://[branch].[project].pages.dev
自定义域名: https://prompt.your-domain.com
```

### 分享你的项目

- 📱 移动端测试
- 🌍 多地区访问测试
- 📊 性能监控
- 🔗 分享给用户

---

**准备好了？开始部署吧！🚀**

推荐使用 **方式 1（Dashboard）**，最简单快捷！

