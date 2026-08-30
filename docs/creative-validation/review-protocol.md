# 镜词创作验证评审协议

## 目的

本协议适用于镜词创作验证季的独立评审。它将创作与判断分离，并确保每个 `PASS`、`REWORK` 或 `BLOCK` 决策都能依据留存证据复现。

适用范围：剧本评审、DirectorKit 忠实度评审、观众放映评审和失败归因评审。高平均分不能覆盖硬性关卡。

## 角色与独立性

| 角色 | 责任 | 禁止行为 |
| --- | --- | --- |
| 生产者 | 制作待评审的剧本、DirectorKit 或成片 | 评审或批准自己的产物 |
| 评审协调人 | 分配盲审 ID、移除身份信息、核验评审资格、保管证据 | 在决策锁定前透露作者身份 |
| 独立故事评审/测试 Agent | 检查公式、证据、异议和关卡状态 | 一边评审一边重写作品 |
| 真人评审组 | 独立评审匿名产物 | 在个人表单锁定前讨论分数 |
| Hermes / Showrunner | 接收关卡结果并分派修复责任 | 没有新证据和新评审就把 `BLOCK` 改为 `PASS` |

真人评审组必须由恰好五名合格成员组成：项目所有者 1 人、影视从业者 1 人、目标观众 3 人。任何创作、实质编辑、导演、生成或选定该产物的人均不具备评审资格。应替换不合格或缺席成员；不得用少于五份锁定回应计算五人关卡。

## 盲审身份协议

1. 协调人创建不透明 ID，例如 `SCR-7Q2M`、`DK-4N8C`、`FILM-9P3R`。ID 不得编码作者、工作流组别、模型、处理方案或版本。
2. 移除文件名、署名、评论、提交元数据、提示词、水印，以及能暴露作者或 A/B/C 组别的排序信息。
3. ID 与来源的映射表必须保存在受限清单中，直到决策锁定前不得让生产者或评审者访问。
4. 在可行时，为每名评审分别随机化呈现顺序。
5. 每名评审签署独立性声明，并在看不到其他分数的情况下提交一份锁定评审表。
6. 协调人记录迟交、替换、利益冲突和排除的回应。被排除的回应仍须留存，但不计入计算。
7. 所有个人表单和汇总关卡锁定后才能解盲。

决策锁定前发生任何身份泄露均为 `BLOCK`。应使用新 ID 重新盲化，并由合格评审重新执行受影响的评审。

## 必需证据包

每个评审包必须包含：

- 产物盲审 ID 和不可变版本/哈希；
- 评审类型、日期、协调人、生产者 ID 和评审者 ID；
- 已签署的独立性声明；
- 五份锁定的真人观众表单；
- 适用模板、已完成内容及证据位置引用；
- 异议和最强拒绝理由；
- 关卡计算、决策、修复负责人和关闭条件。

缺失、可变、矛盾或无法验证的必需证据均为 `BLOCK`。评审者信心和生产者解释不属于证据。

## 关卡顺序

按以下顺序评估。遇到第一个 `BLOCK` 即停止；仍须记录所有可观察发现。

1. **完整性关卡**：盲审 ID 完整、无自审、评审者合格、产物不可变、证据完整。
2. **剧本关卡**：六个维度满足剧本公式。
3. **DirectorKit 忠实度关卡**：每个关键节拍均有追踪，关键新增/遗漏均为零。
4. **放映关卡**：恰好五份合格回应，理解度与观看意愿达标，严重连续性错误为零。
5. **归因关卡**：每个发现都有一个主要类别、证据、严重级别和负责人。

上游 `BLOCK` 会阻止下游证据被用作产品质量证明。下游探索性证据仍可保留，但必须标记为非关卡证据。

## 决策公式

### 剧本

对评审者 `r`，令 `S(r,d)` 为维度 `d` 的 `1.0` 到 `5.0` 分数：

`hook`、`clarity`、`causality`、`character`、`originality`、`payoff`。

```text
dimension_mean(d) = sum(S(r,d)) / eligible_reviewer_count
script_mean = sum(dimension_mean(d)) / 6

SCRIPT_PASS =
  eligible_locked_script_reviews == 5
  AND script_mean >= 4.00
  AND min(dimension_mean(d)) >= 3.50
  AND no integrity blocker
```

只对展示值四舍五入到两位小数；判定必须使用未四舍五入的值。

- `PASS`：恰好五份合格剧本评审已锁定，且 `SCRIPT_PASS` 为真。
- `REWORK`：证据完整，但 `script_mean < 4.00` 或任一维度均值低于 `3.50`。
- `BLOCK`：计入的剧本评审不是恰好五名合格评审，或存在完整性阻塞、自审、身份泄露、无效评分、证据不完整或剧本不完整。

### DirectorKit 忠实度

```text
critical_traceability = traced_critical_beats / total_critical_beats

DK_PASS =
  total_critical_beats > 0
  AND critical_traceability == 1.00
  AND unsupported_critical_additions == 0
  AND critical_omissions == 0
  AND no integrity blocker
```

- `PASS`：`DK_PASS` 为真。
- `REWORK`：来源包和证据有效，但任一忠实度要求未满足。
- `BLOCK`：没有锁定来源剧本、没有预先声明关键节拍、版本不匹配、自审、身份泄露，或缺少判定忠实度所需证据。

### 观众放映

五名合格观众先回答预定义理解答案，再给出 `1` 到 `5` 的观看意愿分。

```text
comprehension_pass_count = viewers matching the complete predefined answer key
viewing_intent_mean = sum(viewing_intent) / 5

SCREEN_PASS =
  eligible_locked_responses == 5
  AND comprehension_pass_count >= 4
  AND viewing_intent_mean >= 4.00
  AND severe_continuity_error_count == 0
  AND no integrity blocker
```

- `PASS`：`SCREEN_PASS` 为真。
- `REWORK`：五份有效回应存在，但理解度低于 `4/5`、观看意愿低于 `4.00`，或确认存在至少一个严重连续性错误。
- `BLOCK`：计入回应少于或多于五份、评审者不合格、答案标准在回应后才创建、自审、身份泄露、影响判断的播放故障，或缺少原始表单。

### 失败归因

每个问题必须且只能有一个主要类别：

1. `story`
2. `directorial-adaptation`
3. `generation`
4. `edit-sound`
5. `product-workflow`

可以记录次要贡献因素，但不能替代主要类别。未归因的阻塞问题会使归因关卡为 `BLOCK`。

## 总体决策

```text
OVERALL_PASS = SCRIPT_PASS AND DK_PASS AND SCREEN_PASS AND ATTRIBUTION_COMPLETE
```

- `PASS`：所有适用关卡通过，且没有未关闭的阻塞项。
- `REWORK`：评审完整性和证据有效，但至少一个质量关卡失败，并且可以分派有边界的修复。
- `BLOCK`：评审独立性受损、必需证据不可用、来源/版本身份不确定，或阻塞问题没有负责人/关闭条件。

`REWORK` 必须生成新版本，并重新评审所有受影响关卡。不得原地修改分数。`BLOCK` 必须先关闭指定条件，才能重新做质量决策。

## 评审行为

- 评审者只评价作品实际呈现的内容，不评价生产者意图。
- 生产者解释可在锁定后记录，但不能修改分数。
- 评审者必须说明最强拒绝理由、会改变决策的证据，以及观众最先注意到的失败。
- 少数异议原文保留，不得被平均分冲掉。
- 严重连续性错误是指身份、时间、空间、道具、服装、动作或音频不连续，并导致理解中断、因果改变，或明显使目标观众脱离故事。
- 安全、权利、隐私、证据损坏或不可恢复的数据风险，无论创意分数如何，均为 `BLOCK`。

## 评审顺序与留存

1. 协调人冻结并计算产物哈希。
2. 协调人对材料盲化并核验评审者资格。
3. 评审者独立填写个人表单。
4. 协调人锁定原始表单，并使用未四舍五入输入计算关卡。
5. 独立故事评审/测试 Agent 审计公式和最强拒绝风险。
6. Hermes 记录 `PASS`、`REWORK` 或 `BLOCK`、负责人、关闭条件和证据 ID。
7. 协调人解盲并派发修复。

保留原始表单、汇总计算、产物哈希、映射清单访问日志、决策历史和废止版本。不得覆盖历史决策。
