# 镜词 V2 发布运行手册

本手册覆盖前端 Cloudflare Pages 发布、后端 Worker 依赖、发布前质量门禁、上线验证和回滚。V2 发布目标是可验证、可回滚，而不是只完成一次构建。

## 1. 发布对象

前端：

```text
GitHub: zuojipeng/prompt-mastra-agent-ui
Runtime: Cloudflare Pages static export
Build: npm run build
Output: out
Node: 20.12+
```

后端：

```text
GitHub: zuojipeng/zuo-mastra
Runtime: Cloudflare Worker
Database: Cloudflare D1
Health: /api/health
V2 API: /api/v2/director-kit
```

## 2. 必要环境变量

前端 Cloudflare Pages：

```text
NODE_VERSION=20
NEXT_PUBLIC_API_URL=https://prompt-optimizer.hahazuo460.workers.dev/api/optimize
```

后端 Worker：

```text
DEEPSEEK_API_KEY=<secret>
OPENAI_API_KEY=<optional fallback secret>
OPENAI_BASE_URL=<optional fallback base URL>
OPENAI_MODEL_NAME=<optional fallback model>
DB=<D1 binding>
ALLOWED_ORIGINS=<frontend origin list>
API_KEY=<optional service key>
DEBUG_ERRORS=false
```

不要把 `.env.local`、`.env`、`.dev.vars` 或真实 token 提交到仓库。

## 3. 发布前门禁

本地发布前执行：

```bash
npm ci
npx playwright install chromium
npm run release:v2:check
```

后端模型预检：

```bash
cd /Users/edy/Desktop/learning/my-prompt-mastra-agent
set -a
source .env
set +a
npm run check:models
```

`release:v2:check` 会按顺序执行：

```text
npm run build
npx tsc --noEmit
npm run lint
npm run qa:v2
```

说明：
- Next build 当前配置会跳过 TypeScript 和 ESLint，因此必须单独运行 `tsc` 和 `lint`。
- `qa:v2` 包含单元测试、smoke、V2 live API E2E、Playwright readiness 和浏览器 E2E。
- Playwright 浏览器测试会 mock `/api/v2/director-kit`，用于验证 UI 流程，不消耗 LLM 调用。
- V2 live API E2E 会调用部署中的 Worker，用于验证线上后端契约。
- `check:models` 不打印密钥，只输出 provider 状态、HTTP status 和错误摘要。
- DeepSeek `402 Insufficient Balance` 表示需要充值或换 key。
- OpenAI fallback `404` 通常表示 `OPENAI_BASE_URL`、`OPENAI_MODEL_NAME` 或 key 所属平台不匹配。

## 4. CI 门禁

GitHub Actions 工作流：

```text
.github/workflows/v2-quality-gate.yml
```

触发条件：
- push 到 `main`
- PR 到 `main`
- 手动 `workflow_dispatch`

CI 失败时不得发布，除非 Hermes 记录豁免原因并由 L0 明确确认。

## 5. Cloudflare Pages 配置

Pages 项目配置：

```text
Framework preset: Next.js
Build command: npm run build
Build output directory: out
Node version: 20+
```

部署方式：

```bash
git push origin main
```

推送后 Cloudflare Pages 会自动构建部署。

## 6. 后端 Worker 部署

正常部署：

```bash
npx wrangler deploy
```

D1 schema 变更必须先于前端功能暴露完成。

如果 `wrangler deploy` 因本机 Wrangler fetch 通道失败而无法连接 Cloudflare API，但 `curl` 能正常访问 Cloudflare API，可以使用 dry-run 产物走 Workers REST API 作为临时 fallback：

```bash
npx wrangler deploy --dry-run --outdir /private/tmp/prompt-optimizer-worker-dry-run
```

REST API 上传 metadata 必须包含：

```json
{
  "main_module": "workers-entry-d1.js",
  "compatibility_date": "2024-09-23",
  "compatibility_flags": ["nodejs_compat"],
  "bindings": [
    {
      "type": "d1",
      "name": "DB",
      "id": "f02d2d29-2553-4fd9-bb5b-acf29abd6a42"
    }
  ]
}
```

REST API fallback 只用于 Wrangler 通道异常时；正常发布仍优先使用 `wrangler deploy`。

## 7. 上线后验证

前端页面：

```text
https://prompt-mastra-agent-ui.pages.dev
```

如实际 Pages 域名不同，以 Cloudflare Dashboard 中当前 production deployment URL 为准。

后端健康检查：

```bash
curl --silent https://prompt-optimizer.hahazuo460.workers.dev/api/health
```

线上验证清单：
- 页面能正常打开。
- 输入创意后能进入创意体检。
- 三个重构版本能展示并可选择。
- 选择版本后能生成导演执行包。
- 错误态可重试，输入不会丢失。
- 移动端核心流程没有明显布局溢出。
- 浏览器控制台没有阻塞级红色错误。

## 8. 回滚

前端回滚：
1. 打开 Cloudflare Dashboard。
2. 进入 Pages 项目。
3. 打开 Deployments。
4. 选择上一个健康 production deployment。
5. 点击 Rollback。
6. 回滚后重新执行上线后验证。

后端回滚：
1. 进入后端 repo。
2. 找到上一个健康 commit 或 Worker deployment。
3. 使用 Cloudflare Dashboard 回滚 Worker deployment，或从健康 commit 重新 deploy。
4. 验证 `/api/health` 和 `/api/v2/director-kit`。

回滚触发条件：
- 首页无法访问。
- V2 API 500/502 持续出现。
- DirectorKit 输出结构破坏前端主流程。
- CORS 或环境变量错误导致线上不可用。
- 发布后核心路径无法完成。

## 9. 发布记录

每次发布需要补一条记录：

```text
docs/test-reports/<date>-v2-release.md
docs/agent-runs/<date>-v2-release.md
```

记录至少包含：
- commit hash
- 执行命令和结果
- 线上 URL
- 健康检查结果
- 已知风险
- 是否需要回滚
