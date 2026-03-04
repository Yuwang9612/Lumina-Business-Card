# 50 Rules and Metrics (Monthly Health / 体检报告)

## 1) 计算链路总览

`Card_Assets + Card_Catalog`
-> `normalizeCards_` (`Normalize.gs:91-167`)
-> `runStructureEngine` (`engine/structureEngine.gs:6-32`)
-> `runLifecycleEngine` (`engine/lifecycleEngine.gs:6-29`)
-> `runMarketEngine` (`engine/marketEngine.gs:42-143`)
-> `generateSnapshots` / `generateEvents` (`AuditTrail.gs:300-350`, `405-670`)
-> `renderMonthlyV1` (`Reports.gs:274-355`)
-> 写入 `Monthly Health Report` (`Reports.gs:390-394`)

---

## 2) 输入字段定义（字段级）

1. 资产输入（Card_Assets）
- `Card Name`
- `Status`
- `Current Annual Spend (Range)`
- `Opened*`
- `Bonus Collected*`
- `Annual Fee`（可选覆盖）
- `assets_last_confirmed`

2. 目录输入（Card_Catalog）
- `Annual Fee (USD)`
- `Base Return (Conservative)`
- `Typical Bonus Value (USD)`
- `Bonus Level`
- `Downgrade Option`
- `bonus_last_updated`
- `bonus_valid_until`
- `data_confidence`

3. 历史输入
- `Snapshots` 上月记录
- `Monthly_Events` 历史事件（冷却/重触发）

---

## 3) 中间指标与公式

## 3.1 归一化指标

- `annualSpendValue`：消费区间 -> 金额（`Normalize.gs:19-32`）
- `annualFee`：优先资产表 Annual Fee，否则 catalog 年费（`Normalize.gs:105-112`）
- `baseReturn`：catalog 回报率，若 >1 则 `/100`，默认 `0.01`（`Normalize.gs:113-119`）
- `monthsSinceOpened`：按月份差计算（`Normalize.gs:67-73`, `101-104`）

## 3.2 结构层指标

- `recurring_value = annualSpendValue * baseReturn`（`structureEngine.gs:10`）
- `net_recurring = recurring_value - annualFee`（`structureEngine.gs:11`）
- 别名：`estValue=recurring_value`, `net=net_recurring`（`structureEngine.gs:23-24`）

## 3.3 组合层指标

- `currentFees = Σ annualFee`
- `currentValue = Σ estValue`
- `currentNet = currentValue - currentFees`
- `optimizedNet = currentNet + savedFee(topBleeding)`，其中：
  - 若可降级：`savedFee = round(topBleeding.annualFee * 0.8)`
  - 否则：`savedFee = topBleeding.annualFee`
- `delta = optimizedNet - currentNet`

来源：`structureEngine.gs:34-64`

---

## 4) 阈值与触发规则

全局阈值：`decisionConfig.gs:6-28`

- `REALIZABLE_DELTA_MIN=200`
- `BLEEDING_MIN_LOSS=100`
- `BLEEDING_RETRIGGER_DELTA=50`
- `STALE_DAYS=45`
- `MARKET_FRESH_DAYS=120`
- `PREBONUS_MONTH_LIMIT=3`
- `FEE_REMINDER_DAYS=[45,30,15]`
- `COOLDOWN_DAYS`（Bleeding/PreBonus/FeeDue/MarketWindow/DataStale/DataAnomaly）
- `MARKET_WINDOW_CAP=5`

## 4.1 分类规则

1. `stage`
- Bleeding: `net < 0`
- Watch: `0 <= net < BLEEDING_MIN_LOSS`
- Efficient: 其他

来源：`structureEngine.gs:12-17`

2. `lifecycle`
- PreBonus: `monthsSinceOpened < PREBONUS_MONTH_LIMIT && !bonusCollected`
- FirstYear: `<12`
- LongTerm: 其他

来源：`lifecycleEngine.gs:13-18`

## 4.2 月度事件触发

1. DataStale
- 条件：`assets_last_confirmed` 为空或距今 > `STALE_DAYS`
- 来源：`AuditTrail.gs:398-403`, `425-440`

2. Bleeding
- 条件：`snap.is_bleeding=true` 且（非 stale 或 loss>=BLEEDING_MIN_LOSS）
- 冷却：按 `COOLDOWN_DAYS.Bleeding`
- 重触发：同冷却月时需 `lossIncrease >= BLEEDING_RETRIGGER_DELTA`
- 来源：`AuditTrail.gs:480-519`

3. PreBonus
- 条件：`snap.is_prebonus=true` + 冷却
- 来源：`AuditTrail.gs:520-545`

4. FeeDue
- 条件：`daysUntil` 在 `FEE_REMINDER_DAYS` 最大值内
- 阈值档位 key：`FeeDue:45/30/15`
- 严重度：15天内High，30内Medium，否则Low
- 来源：`AuditTrail.gs:546-575`

5. DataAnomaly
- 条件：相比上月 `annual_fee` 或 `spend_range` 变化
- 来源：`AuditTrail.gs:576-613`

6. MarketWindow
- 先由 `runMarketEngine` 过滤（未持有 + High bonus + fresh）
- 再经过 `generateEvents` 置信度/过期抑制 + 冷却
- 来源：`marketEngine.gs:81-141`, `AuditTrail.gs:615-669`

---

## 5) Monthly Health Report 输出文案映射

来源主函数：`renderMonthlyV1` (`Reports.gs:274-355`)

1. 第一段 conclusion
- 无事件：固定“本月没有发现需要处理的卡片...”
- 有事件：`本月有 N 件事要处理：` + `_shortSummaryPhrases(top5)`

2. 第二段事项列表（top5）
- 排序优先级：Bleeding > PreBonus > FeeDue > DataStale > DataAnomaly（`Reports.gs:220`, `285-289`）
- 每条三行：`title` + `现状` + `建议`
- 各类型文案分支：`Reports.gs:302-335`

3. 第三段组合净值
- `currentMetrics.currentNet` 渲染为“扣除全部年费后净赚 $X”
- 来源：`Reports.gs:341-343`, `388`

4. 第四段规则声明
- 固定“每月自动复查，触发条件时提醒”

---

## 6) “净收益/亏损/提醒”口径小结

- 净收益（card）：`annualSpendValue * baseReturn - annualFee`
- 亏损（bleeding loss）：`annualFee - estValue`
- 组合净收益：`sum(estValue) - sum(annualFee)`
- 提醒触发：由 `generateEvents` 统一生成事件，再由 `renderMonthlyV1` 挑选展示。
