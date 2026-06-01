# 镜词 · V2 导演执行包稳定发布计划

> 本计划是多 Agent 工作流的第一轮实战目标。
> 目标不是新增大功能，而是把 V2 从“能跑”稳定到“可发布、可验证、可回滚”。

## 1. 目标

把当前 V2 流程稳定为可上线版本：

```text
输入创意
  -> 创意体检
  -> 查看三个重构版本
  -> 选择版本
  -> 查看导演执行包
  -> 复制/导出到平台
  -> 收集反馈
```

## 2. 成功标准

产品：
- 用户知道自己处在哪一步
- 用户能理解创意风险和推荐方向
- 用户能选择重构版本
- 用户能拿到可执行导演包
- 用户知道下一步去哪个平台生成

技术：
- 前后端 V2 API 契约一致
- `/api/v2/director-kit` 有可测试 schema
- 失败态可恢复
- 历史、反馈、同步失败不阻塞主流程
- 类型检查、单元测试、smoke、E2E 通过

运维：
- Node 版本统一
- Cloudflare Pages / Worker 配置明确
- Worker 有 dry-run 或等价验证
- `/api/health` 可用
- 回滚方案明确

## 3. Agent 分工

### Product Agent

任务：
- 更新 V2 PRD，把“稳定发布”作为当前里程碑
- 为每一步补验收标准
- 定义核心指标：完成率、失败率、复制率、反馈率

产物：
- `JINGCI-V2-EXECUTION-PRD.md` 更新
- 验收标准清单

### UI Agent

任务：
- 审查当前首页、诊断页、重构页、结果页
- 补齐状态矩阵：loading、error、empty、retry、success
- 明确移动端布局规则

产物：
- V2 页面状态清单
- 需要修的 UI 问题列表

### Engineering Agent

任务：
- 固化 DirectorKit schema
- 统一前后端枚举和类型
- 检查 `/api/optimize` 与 `/api/v2/director-kit` 是否职责清晰
- 补齐错误处理和可恢复路径

产物：
- 代码改动
- API 契约说明
- 本地验证结果

### Code Review Agent

任务：
- 审查 V2 契约、错误处理、安全、兼容性
- 检查是否有硬编码密钥或隐式线上依赖
- 检查是否存在构建跳过掩盖的问题

产物：
- Review report
- P0/P1/P2 findings

### Test Agent

任务：
- 建立 V2 E2E 用例
- 覆盖 happy path、LLM 失败、格式错误、网络失败、移动端
- 验证历史和反馈不阻塞主流程

产物：
- E2E 测试
- 测试矩阵
- release confidence

### DevOps Agent

任务：
- 检查 Cloudflare Pages Node 版本
- 检查 Worker secrets、D1、CORS
- 准备 dry-run、发布和回滚步骤
- 明确上线后健康检查

产物：
- 部署运行手册
- 回滚计划
- 上线验证清单

## 4. 任务切片

### Slice 1: 契约稳定

Owner：Engineering Agent

内容：
- 抽出或复用 `DirectorKit` schema
- 前端 `DirectorKit` 类型和后端输出字段一致
- targetDuration / targetType / platform 枚举共享或显式同步

验收：
- 后端 `npm test` 通过
- 前端 `npx tsc --noEmit` 通过
- 新增契约测试通过

### Slice 2: UI 状态补齐

Owner：UI Agent + Engineering Agent

内容：
- 诊断生成失败可重试
- 结果为空有明确提示
- 历史/反馈失败不挡主流程
- 移动端重构卡片可读

验收：
- 状态矩阵覆盖
- smoke 通过
- 手动移动端验收通过

### Slice 3: E2E 测试

Owner：Test Agent

内容：
- 使用 mock 或测试后端稳定验证 V2 主路径
- 覆盖输入 -> 诊断 -> 重构 -> 结果
- 覆盖后端 502 格式错误

验收：
- E2E 脚本可在本地和 CI 执行
- 失败报告能定位到页面或 API

### Slice 4: 部署运行手册

Owner：DevOps Agent

内容：
- 前端 Pages 配置
- Worker deploy / dry-run
- D1 schema
- secrets
- rollback
- health check

验收：
- 新人按文档能完成发布前检查
- 缺少 secret 时有明确错误

## 5. 当前风险

| 风险 | 影响 | 归属 |
| --- | --- | --- |
| V2 DirectorKit 只有运行时浅校验 | LLM 返回结构变形会污染前端 | Engineering |
| 前端构建配置跳过 typescript/lint | 构建成功不代表质量通过 | Engineering / Test |
| E2E 尚未覆盖 V2 主路径 | 发布前缺少真实流程信心 | Test |
| Worker 线上配置依赖 secret 和 D1 | 部署成功不代表功能可用 | DevOps |
| 产品文档与实现迭代不同步 | Agent 容易执行过期目标 | Product |

## 6. 首轮执行顺序

```text
1. Product Agent 更新 V2 稳定发布验收标准
2. UI Agent 输出 V2 页面状态矩阵
3. Engineering Agent 固化 DirectorKit 契约
4. Test Agent 增加 V2 E2E
5. Code Review Agent 审查实现
6. DevOps Agent 准备发布运行手册
7. Hermes 汇总 Gate 状态，决定是否进入上线确认
```

## 7. 完成定义

全部满足才算 V2 稳定发布就绪：

- Product Gate PASS
- UI Gate PASS
- Engineering Gate PASS
- Code Review Gate PASS
- Test Gate PASS
- Release Gate PASS
- 工作树干净
- 提交已 push
- L0 确认上线

