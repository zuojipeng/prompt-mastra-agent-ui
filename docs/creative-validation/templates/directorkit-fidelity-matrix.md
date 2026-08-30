# DirectorKit 盲审忠实度矩阵

## 评审身份

| 字段 | 内容 |
| --- | --- |
| 锁定剧本盲审 ID | `SCR-____` |
| 剧本版本/哈希 | |
| DirectorKit 盲审 ID | `DK-____` |
| DirectorKit 版本/哈希 | |
| 评审者 ID | `REV-____` |
| 评审日期 | |

## 独立性与来源检查

- [ ] 我没有创作或编辑任一产物。
- [ ] 我不知道作者、工作流组别、模型或生成路径。
- [ ] 剧本已锁定，且其关键节拍在本评审前已声明。
- [ ] 两个产物版本均与评审清单一致。

任一项未勾选，关卡为 `BLOCK`。

## 关键节拍追踪

必须列出来源中标记为关键的每个节拍。只有当引用的 DirectorKit 材料保留该节拍的戏剧功能、因果和观众应知信息时，才能将节拍标为 `Traced`。仅有相似措辞不够。

| 节拍 ID | 锁定剧本节拍及戏剧功能 | 是否关键 | DirectorKit 镜头/字段证据 | 是否保留因果和观众信息 | 状态：Traced / Altered / Omitted | 发现 |
| --- | --- | --- | --- | --- | --- | --- |
| `B-01` | | `YES` | | | | |

## DirectorKit 新增内容

列出 DirectorKit 引入的每个实质事件、动机、关系、揭示、后果或结尾元素。

| 新增 ID | DirectorKit 证据 | 来源剧本支持 | 是否对因果/意义关键 | Supported / Unsupported | 发现 |
| --- | --- | --- | --- | --- | --- |
| `A-01` | | | | | |

## 遗漏与连续性审计

| 发现 ID | 类型：omission / alteration / continuity | 证据 | 是否关键 | 对理解或因果的影响 | 严重级别 |
| --- | --- | --- | --- | --- | --- |
| `F-01` | | | | | |

## 决策计算

```text
critical_traceability = traced_critical_beats / total_critical_beats

PASS = total_critical_beats > 0
       AND critical_traceability == 1.00
       AND unsupported_critical_additions == 0
       AND critical_omissions == 0
       AND integrity checks pass
```

| 指标 | 数值 | 要求 |
| --- | ---: | ---: |
| 声明的关键节拍总数 | | `> 0` |
| 已追踪关键节拍数 | | `= total` |
| 关键节拍追踪率 | | `100%` |
| 无依据的关键新增数 | | `0` |
| 关键遗漏数 | | `0` |
| 改编暴露的严重连续性错误数 | | 为下游放映准备时必须为 `0` |

### 关卡决策

- `PASS`：所有关键节拍均已追踪，且无依据的关键新增和关键遗漏均为零。
- `REWORK`：版本和证据有效，但任一忠实度指标未通过。
- `BLOCK`：没有锁定来源、没有预先声明关键节拍、来源/版本不匹配、自审、身份泄露或证据不足。

**决策：** `PASS / REWORK / BLOCK`

**拒绝该 DirectorKit 的最强理由：**

**观众最先感知的后果：**

**修复负责人：**

**关闭条件及所需证据：**

**独立评审者签名：**
