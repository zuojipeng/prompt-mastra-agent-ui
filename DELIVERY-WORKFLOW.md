# 镜词 · 多 Agent 交付工作流

> 目标：让镜词每个产品目标都能从规划、设计、研发、审查、测试、部署到复盘形成闭环。

## 1. 工作流总览

```text
L0 老板目标
  |
  v
Hermes Orchestrator
  |
  +-- Product Agent: PRD / 验收标准 / 指标
  |
  +-- UEAgent: 产品形态 / 流程 / 页面 / 状态矩阵 / 体验品味
  |
  +-- Architecture Agent: 最小充分架构 / 模块边界 / 复杂度控制
  |
  +-- Engineering Agent: 前后端实现 / API / 数据
  |
  +-- Code Review Agent: 质量 / 安全 / 回归风险
  |
  +-- Test Agent: 自动化 / E2E / 手动验收
  |
  +-- DevOps Agent: 部署 / 回滚 / 监控
  |
  v
上线验证 + 复盘沉淀
```

## 2. Gate 定义

### Gate 1: Product

进入条件：
- 老板目标明确
- Hermes 已拆解目标和约束

必须产出：
- PRD
- MVP 范围
- 非目标
- 验收标准
- 成功指标

通过标准：
- 每条核心需求可以转成测试用例
- 成功指标有可观察信号
- 不含未决的 P0 产品问题

失败回路：
- 回 Product Agent 重写 PRD
- 涉及方向变化时升级 L0

### Gate 2: UE

必须产出：
- 产品形态判断
- 主路径和次路径
- 页面流程
- 组件清单
- 状态矩阵
- 响应式规则
- 可访问性要求
- 页面气质和信息层级说明

通过标准：
- 核心路径不超过 PRD 范围
- 每个关键交互有 loading / error / success
- 移动端和桌面端都能完成主流程
- 视觉层级服务于用户决策，不靠装饰撑场面

失败回路：
- UE 规格缺失，回 UEAgent
- 需求矛盾，回 Product Agent

### Gate 3: Architecture

必须产出：
- 当前设计阅读
- 最小充分设计
- 模块和领域边界
- 数据契约和依赖方向
- 拒绝的过度设计方案
- 测试策略影响

通过标准：
- 方案不大于问题本身
- 领域命名清晰
- 外部数据边界明确
- 抽象有真实复杂度或复用压力支撑
- 能说明如何测试和回滚

失败回路：
- 架构过重，回 Architecture Agent 收缩
- 数据契约不清，回 Product + Engineering
- 体验状态影响架构，回 UEAgent

### Gate 4: Engineering

必须产出：
- 代码改动
- API 契约
- 数据模型或迁移说明
- 本地验证结果

通过标准：
- 前后端字段一致
- 输入校验完整
- 错误路径可恢复
- 类型检查和单元测试通过

失败回路：
- 实现问题，回 Engineering Agent
- 契约问题，回 Product + Engineering

### Gate 5: Code Review

必须产出：
- 审查报告
- P0/P1/P2 问题列表
- 是否允许测试的结论

通过标准：
- 无 P0/P1 问题
- 安全风险可接受
- 测试缺口已记录

失败回路：
- 回 Engineering Agent 修复
- 修复后重新进入 Gate 4

### Gate 6: Test

必须产出：
- 测试矩阵
- 自动化测试结果
- E2E 或手动验收报告
- 缺陷清单

通过标准：
- 核心路径通过
- 回归测试通过
- smoke 通过
- 无阻塞缺陷

失败回路：
- Bug 回 Engineering Agent
- 设计不清回 UI Agent
- 验收标准不清回 Product Agent

### Gate 7: Release

必须产出：
- 部署计划
- 环境变量和 secret 清单
- 回滚方案
- 上线后验证步骤
- 发布说明

通过标准：
- 构建产物明确
- 线上健康检查可执行
- 回滚路径明确
- L0 已确认上线窗口

失败回路：
- 配置问题回 DevOps Agent
- 代码问题回 Engineering Agent

### Gate 8: Review

必须产出：
- 目标完成情况
- 缺陷和根因
- 数据结果
- 下轮建议
- 可复用经验

通过标准：
- 每个偏差有归因
- 每个遗留风险有 owner
- 新经验已沉淀到文档或测试

## 3. Hermes 调度规则

Hermes 每轮必须维护：
- 当前目标
- 当前 Gate
- 当前 owner
- 阻塞问题
- 下一步动作
- 是否需要 L0 决策

失败归属判断：

| 失败类型 | 回派对象 |
| --- | --- |
| 需求不可测 | Product Agent |
| 流程、状态或体验气质缺失 | UEAgent |
| 架构过重、边界不清、抽象不成立 | Architecture Agent |
| 类型/接口/实现错误 | Engineering Agent |
| 安全/回归风险 | Code Review Agent |
| 自动化/E2E 失败 | Test Agent |
| 配置/部署/回滚问题 | DevOps Agent |
| 方向或范围变化 | L0 |

## 4. 开发规范

- 需求未过 Gate 1，不写代码
- UE 未过 Gate 2，不做大范围页面实现
- Architecture 未过 Gate 3，不做跨模块或持久化实现
- Code Review 未通过，不进入发布测试
- E2E 或等价手动验收未通过，不上线
- 生产部署前必须有回滚方案
- 每个失败都必须有 owner 和复验路径

## 5. 标准任务切片

每个任务最多控制在 30-60 分钟内可验证。

推荐切片格式：

```markdown
任务：
目标：
Owner Agent：
输入文件：
输出文件：
验收标准：
验证命令：
风险：
```

## 6. 标准汇报

Hermes 阶段汇报格式：

```markdown
当前 Gate：
完成：
失败：
阻塞：
已回派：
下一步：
需要 L0 决策：
```
