# AS-IS Detailed Design Spec

一句话总结：该系统当前是 **Google Apps Script + Spreadsheet 驱动的信用卡收益体检引擎**，通过菜单触发规则计算并将结果写入多个 Sheet，而非传统后端 API + SQLite 架构。

## 阅读顺序

1. [00_project_overview.md](./00_project_overview.md)
2. [10_db_schema.md](./10_db_schema.md)
3. [11_data_dictionary.md](./11_data_dictionary.md)
4. [12_db_vs_code_mismatch.md](./12_db_vs_code_mismatch.md)
5. [20_api_spec.md](./20_api_spec.md)
6. [30_data_layer.md](./30_data_layer.md)
7. [40_frontend_mapping.md](./40_frontend_mapping.md)
8. [50_rules_and_metrics.md](./50_rules_and_metrics.md)
9. [90_gaps_and_risks.md](./90_gaps_and_risks.md)
10. [99_questions_for_owner.md](./99_questions_for_owner.md)

## 关键表索引（Sheet）

- `Card_Assets`：输入主表（卡片状态/消费区间/奖励领取）
- `Card_Catalog`：参数主数据（年费、回报率、奖励级别）
- `Snapshots`：月度快照审计表
- `Monthly_Events`：事件日志表（Bleeding/PreBonus/FeeDue等）
- `Reports`：First + Alerts 输出页
- `Monthly Health Report`：每月面向客户的文本报告页

## 关键接口索引（GAS 函数）

- `doGet`：Web App 入口（当前依赖缺失的 `index.html`）
- `generateFirstReport`：生成首次体检 + Alerts
- `generateMonthlyReport`：生成月报 + 快照 + 事件
- `runAlertsCheck`：仅刷新 Alerts 区
- `confirmNoChange`：批量回填 `assets_last_confirmed`

## 关键规则索引

- 结构分层：`Bleeding/Watch/Efficient`
- 生命周期：`PreBonus/FirstYear/LongTerm`
- 事件：`DataStale/Bleeding/PreBonus/FeeDue/DataAnomaly/MarketWindow`
- 阈值配置：`decisionConfig.gs`（`BLEEDING_MIN_LOSS`, `STALE_DAYS`, `FEE_REMINDER_DAYS`, 冷却规则等）
