# 镜词 · AI 短片导演执行包工作台

镜词是一个面向 AI 视频创作者的短片导演工作台。用户输入一句创意后，系统会先做创意体检，再给出三种重构方向，最终生成一套可执行的导演执行包，帮助用户更稳定地把创意做成 10-90 秒 AI 短片。

项目重点不是泛 prompt 生成，而是把 AI 视频创作中容易翻车的部分结构化：创意是否适合生成、风险在哪里、镜头怎么拆、用文生视频还是图生视频、平台怎么选、失败后怎么补救。

## Backblaze Hackathon Candidate

The `spike/backblaze-provenance` branch contains **Jingci Provenance Vault**, an in-progress entry for the [Backblaze Generative Media Hackathon](https://backblaze-generative-media.devpost.com/). It adds a selected-shot provenance workflow backed by Genblaze's pipeline and object-storage interfaces.

Current evidence is deliberately separated:

- **Verified locally:** strict provenance contracts, deterministic Genblaze execution, content-addressed asset and manifest writes through an in-memory backend, browser-to-Python HTTP, retry lineage, and desktop/mobile E2E.
- **Not yet verified:** live AI media generation, Backblaze B2 upload/read-back, public deployment of this branch, and final Devpost submission.

Reviewers can start with:

- [Submission draft](docs/campaigns/backblaze-genmedia-2026/docs/submission-draft.md)
- [Under-three-minute demo script](docs/campaigns/backblaze-genmedia-2026/docs/demo-video-script.md)
- [Evidence index](docs/campaigns/backblaze-genmedia-2026/docs/evidence-index.md)
- [Credential-free spike setup](spikes/genblaze-provenance/README.md)

Run the draft readiness check with `npm run hackathon:check:draft`. The strict `npm run hackathon:check` command intentionally fails until every account-bound and public submission blocker is closed.

## 产品能力

- 创意体检：评估可拍性、风险等级、关键风险和推荐改造方向。
- 三版重构：提供稳妥版、风格版、电影版三种短片方向。
- 导演执行包：输出故事设定、分镜卡片、主 prompt、负向词、平台建议、后期建议和风险补救。
- 生成策略：每个镜头带有构图、动作、氛围、运动方式、生成模式、一致性要求和修复建议。
- 状态恢复：覆盖 loading、empty、error、retry、success 等关键交互状态。
- 浏览器 E2E：使用 Playwright 验证桌面和移动端核心流程。

## 技术栈

- Framework: Next.js 15, React 18
- Language: TypeScript
- Styling: Tailwind CSS
- Testing: Vitest, Playwright, custom smoke/E2E scripts
- Backend: Cloudflare Worker + D1
- API Contract: 前端 DirectorKit 类型与后端 schema 对齐

后端仓库：

```text
https://github.com/zuojipeng/zuo-mastra
```

## 核心流程

```text
输入创意
  -> 创意体检
  -> 选择重构版本
  -> 生成导演执行包
  -> 复制到 AI 视频平台
  -> 根据反馈继续优化
```

## 工程亮点

- 前后端 V2 DirectorKit 契约固定，避免 LLM 返回结构漂移污染前端。
- V2 主路径有单元测试、契约测试、API E2E、浏览器 E2E 和 smoke test。
- Playwright 覆盖桌面 Chromium 与移动 Chromium。
- 使用多 Agent 交付文档组织产品、UI、研发、测试、Code Review 和发布门禁。
- 发布前通过 `qa:v2` 聚合验证核心质量门槛。

## 本地开发

要求 Node.js 20.12 或更高版本。

```bash
npm install
npm run dev
```

默认访问：

```text
http://localhost:3000
```

## 环境变量

```bash
NEXT_PUBLIC_API_URL=http://localhost:8787/api/optimize
```

如果不配置，应用会使用内置默认 API 地址。正式构建或部署时建议显式设置 `NEXT_PUBLIC_API_URL`。

## 常用命令

```bash
npm run dev
npm run build
npm run lint
npm test
npm run test:smoke
npm run test:e2e:v2
npm run test:e2e:browser
npm run qa:v2
```

其中 `qa:v2` 会依次执行：

```text
Vitest
  -> smoke test
  -> V2 live API E2E
  -> Playwright readiness check
  -> Playwright browser E2E
```

首次运行浏览器 E2E 前需要安装 Chromium：

```bash
npx playwright install chromium
```

## 目录结构

```text
.
├── app/
│   ├── components/
│   │   ├── ChatBox.tsx
│   │   ├── HistoryPanel.tsx
│   │   └── ProjectBiblePanel.tsx
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── lib/
│   ├── api-client.ts
│   ├── director-kit-contract.ts
│   └── session-manager.ts
├── scripts/
│   ├── e2e-browser-readiness.mjs
│   ├── e2e-director-kit-test.mjs
│   └── smoke-test.mjs
├── tests/e2e/
│   └── v2-director-kit.spec.ts
├── __tests__/
│   ├── api-client.test.ts
│   ├── chatbox-v2-source.test.ts
│   ├── director-kit-contract.test.ts
│   └── session-manager.test.ts
├── docs/
│   ├── agent-runs/
│   ├── design/
│   ├── test-plans/
│   └── test-reports/
├── playwright.config.ts
└── package.json
```

## V2 DirectorKit 数据结构

前端核心契约位于：

```text
lib/director-kit-contract.ts
```

主要输出包括：

- `diagnosis`: 创意体检结果
- `versions`: 三个重构版本
- `storySetting`: 故事、主角、世界观和视觉符号
- `shotCards`: 分镜卡片和每镜生成策略
- `masterPrompt`: 主 prompt
- `negativePrompt`: 负向词
- `platformAdvice`: 平台建议
- `postProductionAdvice`: 后期建议
- `riskRemediation`: 风险补救方案

## 发布检查

发布前至少确认：

```bash
npm run qa:v2
npm run build
npx tsc --noEmit
npm run lint
```

线上发布后确认：

- 页面可以访问。
- V2 导演执行包流程可以完成。
- API 调用正常。
- 移动端没有明显布局溢出。
- 错误态可以重试恢复。

## 当前阶段

项目当前处于 V2 稳定发布阶段，重点是把核心闭环做到可发布、可验证、可回滚。

下一阶段会继续增强：

- 镜头风险标签体系
- 更具体的平台适配建议
- 反馈数据结构标准化
- 项目化创作工作台
