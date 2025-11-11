# 🔧 环境配置指南

## 环境变量配置

创建 `.env.local` 文件配置后端 API 地址：

```bash
# 本地开发 - 后端运行在 3001 端口
NEXT_PUBLIC_API_URL=http://localhost:3001

# 或者连接远程后端
# NEXT_PUBLIC_API_URL=https://api.your-domain.com
# NEXT_PUBLIC_API_URL=https://your-backend.vercel.app
```

## 默认行为

- **开发环境**：如果不配置，默认使用 `http://localhost:3001`
- **生产环境**：必须配置 `NEXT_PUBLIC_API_URL`

## 生产部署

### Vercel

在 Vercel 项目设置中添加环境变量：

```
NEXT_PUBLIC_API_URL=https://your-backend.vercel.app
```

### Cloudflare Pages

在项目设置 → 环境变量：

```
NEXT_PUBLIC_API_URL=https://api.your-domain.com
```

### Docker

```dockerfile
ENV NEXT_PUBLIC_API_URL=http://backend:3001
```

## 验证配置

启动开发服务器后，打开浏览器控制台，如果看到网络错误，检查：

1. `NEXT_PUBLIC_API_URL` 是否正确
2. 后端服务是否运行
3. 后端是否配置了 CORS
