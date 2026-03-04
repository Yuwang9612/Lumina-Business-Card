# 04_BUSINESS_LOGIC_ENGINE
生成时间: 2026-02-28 09:41:58 -08:00  
Commit: `8d5b12b`

## 决策分层（现状）
- Structure: `runStructureEngine`（`engine/structureEngine.gs:6`）
- Lifecycle: `runLifecycleEngine`（`engine/lifecycleEngine.gs:14`）
- Bonus Lifecycle: `deriveBonusLifecycleForPortfolio_`（`engine/bonusLifecycleEngine.gs:125`）
- Market: `runMarketEngine`（`engine/marketEngine.gs:57`）
- Orchestrator: `runOrchestrator`（`engine/orchestrator.gs:6`）
- Audit/Event Layer: `generateSnapshots` + `generateEvents`（`AuditTrail.gs:648`, `754`）

## 关键阈值/常量（`decisionConfig.gs`）
- `REALIZABLE_DELTA_MIN=200`
- `BLEEDING_MIN_LOSS=100`
- `BLEEDING_RETRIGGER_DELTA=50`
- `BLEEDING_MAX_EVENTS_PER_MONTH=2`
- `STALE_DAYS=45`
- `MARKET_FRESH_DAYS=120`
- `PREBONUS_MONTH_LIMIT=3`（当前未见直接消费）
- `fee_due_window_months=1`
- `COOLDOWN_DAYS`: Bleeding/PreBonus/FeeDue/MarketWindow/DataStale/DataAnomaly
- `MARKET_WINDOW_CAP=5`, `PROMO_CAP=3`

## 核心口径定义
- 年费/权益价值/净收益:
  - `annual_fee` 来自资产表或 catalog（`Normalize.gs:110-120`）
  - `estValue = annualSpendValue * baseReturn`（`engine/structureEngine.gs:10`）
  - `net = estValue - annualFee`（`engine/structureEngine.gs:11`）
- 组合净值:
  - `currentFees = sum(annualFee)`
  - `currentValue = sum(estValue)`
  - `currentNet = currentValue - currentFees`（`engine/structureEngine.gs:34-47`）
- Monthly Health `monthlyOutlook`:
  - `net=currentNet`, `fees=currentFees`, `value=currentValue`（`Reports.gs:730-734`）

## 触发条件（事件层）
- 止血 Bleeding:
  - `snap.is_bleeding` 且（非 stale 或 loss>=BLEEDING_MIN_LOSS），`AuditTrail.gs:830-831`
  - 月内 cap + 重触发 delta（`AuditTrail.gs:833-845`）
- 达标 PreBonus:
  - `snap.is_prebonus`，受 cooldown 控制（`AuditTrail.gs:873-885`）
- 临近年费 FeeDue（legacy alias: annual_fee_due）:
  - `fee_due_month` 存在，`monthsUntil<=fee_due_window_months`，fee>0（`AuditTrail.gs:899-907`）
- 结构异常 DataAnomaly:
  - 相比上月 `annual_fee` 或 `spend_range` 变更（`AuditTrail.gs:930-946`）
- 数据陈旧 DataStale:
  - `assets_last_confirmed` 超 `STALE_DAYS`（`AuditTrail.gs:747-752`, `773-789`）

## Item 统一结构（实际存在两套）
- Orchestrator item（`engine/orchestrator.gs`）:
  - `type, cardName, priority, structure?, lifecycle?, marketSignal?`
- Monthly model item（`Reports.gs:250-262`）:
  - `cardName, issueType, issueTitle, status, action, impactUsd`
- First focus item（`Reports.gs:127`, `169`）:
  - `type, cardName, title, status, action, impactUsd`
- 去重:
  - Monthly item dedupe key: `reportMonth|issueType|cardName`（`Reports.gs:292-321`）
- 排序:
  - Monthly events priority map（`Reports.gs:527`）
  - Orchestrator 按 priority + 类型内规则（`engine/orchestrator.gs:58-74`）

## 口径不一致/重复实现
- `stage==='Watch'` 条件使用 `net < BLEEDING_MIN_LOSS(100)`，名称与“亏损阈值”语义混用（`engine/structureEngine.gs:15`）。
- 计算逻辑在 `Calc.gs` 与 `engine/* + Reports.gs` 双份并存，口径不完全一致（例如 spend map 与 net 计算路径）。
