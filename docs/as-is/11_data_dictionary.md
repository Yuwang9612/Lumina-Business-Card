# 11 Data Dictionary (Field-Level)

## 说明

- 本字典按“等价数据表（Sheet）”描述。
- `字段含义` 来自代码使用语义；无法确认则标记“未知/待确认”。

---

## A. Snapshots
来源：`AuditTrail.gs:6`, `AuditTrail.gs:300-347`, `AuditTrail.gs:239-258`

| 字段 | 含义 | 来源字段/规则 | 不确定性 |
|---|---|---|---|
| month | 快照月份（YYYY-MM） | `getCurrentMonth()` + `writeSnapshots` | 低 |
| card_id | 卡片标准ID（小写+空格转下划线） | `getCardId` (`AuditTrail.gs:65-67`) | 低 |
| card_name | 卡名称 | `cardsNormalized.cardName` | 低 |
| status | 卡状态（默认 Active） | `normalizeCards_` 的 `status`（`Normalize.gs:162`） | 中（原始状态枚举未限定） |
| opened | 开卡月份 | `openedDate.raw` (`Normalize.gs:101-103`) | 中（输入格式可变） |
| annual_fee | 年费 | 结构层 annualFee (`structureEngine.gs:20`) | 低 |
| spend_range | 年消费区间原值 | 从 `Card_Assets` 原字段复制 (`AuditTrail.gs:323-326`) | 低 |
| assigned_category | 资产表标注分类 | `Normalize.gs:161` | 中（分类枚举未知） |
| bonus_collected | 是否已领取开卡奖励（Yes/No） | `Normalize.gs:104`, `AuditTrail.gs:248` | 低 |
| est_value | 估算年回报值 | `annualSpendValue * baseReturn` (`structureEngine.gs:10-24`) | 低 |
| net | 净值 = est_value - annual_fee | `structureEngine.gs:11,24` | 低 |
| is_bleeding | 是否亏损卡 | `stage==='Bleeding'` | 低 |
| is_watch | 是否观察卡 | `stage==='Watch'` | 低 |
| is_efficient | 是否高效卡 | `stage==='Efficient'` | 低 |
| is_prebonus | 是否奖励期卡 | `lifecycle==='PreBonus'` | 低 |
| lifecycle_stage | 生命周期阶段 | `runLifecycleEngine` | 低 |
| fee_due_month | 年费到期月（推断） | `inferFeeDueMonth(opened)` (`AuditTrail.gs:69-83`) | 高（推断规则简化） |
| created_at | 写入时间 | `new Date()` | 低 |

---

## B. Monthly_Events
来源：`AuditTrail.gs:8`, `AuditTrail.gs:405-670`

| 字段 | 含义 | 来源字段/规则 | 不确定性 |
|---|---|---|---|
| month | 事件月份 | 当前月 | 低 |
| card_id | 卡ID | `getCardId` | 低 |
| card_name | 卡名 | 快照/market信号 | 低 |
| event_type | 事件类型 | `DataStale/Bleeding/PreBonus/FeeDue/DataAnomaly/MarketWindow` | 低 |
| severity | 严重级别 | 各事件规则分级 | 低 |
| event_key | 去重+冷却键 | `card_id + ':' + type( + threshold )` | 低 |
| current_value_json | 当前值JSON | 不同事件生成不同 payload | 中 |
| prev_value_json | 对比值JSON | 有历史时写入 | 中 |
| message_key | 文案键 | `datastale/bleeding/...` | 中（文案资源未外置） |
| created_at | 记录创建时间 | `new Date()` | 低 |

### event_type 枚举语义

1. `DataStale`：`assets_last_confirmed` 缺失或距今 > `STALE_DAYS`（`AuditTrail.gs:398-403`, `425-440`）
2. `Bleeding`：`is_bleeding=true` 且满足 stale/阈值与冷却重触发规则（`AuditTrail.gs:480-519`）
3. `PreBonus`：生命周期为 `PreBonus` 且冷却通过（`AuditTrail.gs:520-545`）
4. `FeeDue`：距 fee_due_month 在提醒阈值内（`AuditTrail.gs:546-575`）
5. `DataAnomaly`：年费或消费区间变化（`AuditTrail.gs:576-613`）
6. `MarketWindow`：市场机会信号通过过滤与冷却（`AuditTrail.gs:615-669`）

---

## C. Card_Assets（输入主表）
来源：`Data.gs:58-102`, `Normalize.gs:91-167`, `main.gs:93-133`

| 字段名（或别名） | 含义 | 使用位置 | 不确定性 |
|---|---|---|---|
| Card Name / Card name / 卡片名称 | 卡唯一名称（业务键） | 激活筛选、关联 catalog、生成 card_id | 低 |
| Status / 状态 | 活跃性过滤 | 非 active 状态被排除 | 中（具体允许值未定义） |
| Current Annual Spend (Range) / Spend Range / Annual Spend | 年消费区间 | 转换为金额用于估值 | 低 |
| Opened (YYYY-MM) / Opened / Opened Date | 开卡时间 | 计算 monthsSinceOpened 与 fee_due_month | 中（格式容错有限） |
| Bonus Collected? / Bonus Collected / Bonus collected | 是否已拿奖励 | 决定 PreBonus | 低 |
| Annual Fee | 覆盖 catalog 年费 | `Normalize.gs:106-112` | 中 |
| Assigned Category | 人工分配类别 | 快照保留 | 高（未见进一步消费） |
| assets_last_confirmed | 最后确认时间 | stale 检测、`confirmNoChange` 更新 | 低 |

---

## D. Card_Catalog（参数主数据）
来源：`Data.gs:116-127`, `Normalize.gs:109-138`, `Calc.gs:63-70`, `marketEngine.gs:53-131`

| 字段 | 含义 | 使用规则 | 不确定性 |
|---|---|---|---|
| Card Name | 卡名键 | join key | 低 |
| Issuer | 发卡行 | 展示/信号输出 | 低 |
| Annual Fee (USD) | 年费 | 估值计算输入 | 低 |
| Base Return (Conservative) | 保守回报率 | >1 视作百分比除100 | 低 |
| Typical Bonus Value (USD) | 开卡奖励估值 | 市场机会/优化估计 | 中 |
| Bonus Level | 奖励等级 | `High/Medium/Low` 归一化 | 低 |
| Downgrade Option | 是否可降级 | 动作建议与优化模型 | 低 |
| Notes | 备注 | 代码未使用 | 高 |
| catalog_updated_at | 数据更新时间 | 代码未使用 | 高 |
| data_confidence | 数据置信度 | MarketWindow 抑制逻辑 | 中 |
| bonus_last_updated | 奖励更新时间 | freshness 过滤关键 | 低 |
| bonus_valid_until | 奖励有效期 | 计算 isValid | 中（当前 mostly 仅记录） |
| best_for_categories | 适用消费类别 | 代码未使用 | 高 |
| annual_fee_current | 当前年费 | 代码未使用 | 高 |
| product_type | 产品类型 | 代码未使用 | 高 |

---

## E. Company_Profile
来源：`Data.gs:43-53`

| 字段 | 含义 |
|---|---|
| A列 key | 配置项名称（未知/待确认） |
| B列 value | 配置项值（未知/待确认） |

当前代码未见 profile 参与报告计算链路。

---

## F. Reports / Monthly Health Report（输出页）

- `Reports`：A/B/C 区域用于第一报告+Alerts；更多是展示，不是结构化存储（`Reports.gs` 全文）。
- `Monthly Health Report`：2行开始 8 列承载文本块（`Reports.gs:390-394`）。
