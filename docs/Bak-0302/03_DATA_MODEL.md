# 03_DATA_MODEL
生成时间: 2026-02-28 09:41:58 -08:00  
Commit: `8d5b12b`

## 存储方式（按代码）
- 主存储: Google Sheets（`Data.gs` + `AuditTrail.gs`）
- 输出文档: Google Docs / PDF（`PdfReports.gs`）
- 前端临时: 内存 DTO（`WebApp.gs`, `BeautifulReportUI.html`）
- 本地并行: Node/EJS 模板（`reportGenerator.js`, `templates/lumina_report.html`）

## Sheet 清单
- 业务输入:
  - `Company_Profile`（`SHEET_PROFILE`）
  - `Card_Assets`（`SHEET_ASSETS`）
  - `Card_Catalog`（`SHEET_CATALOG`）
  - `Promo_Catalog`（`SHEET_PROMO_CATALOG`）
- 系统输出:
  - `Reports`（状态、告警、debug）
  - `Monthly Health Report`（dev模式文案输出）
  - `Snapshots`（月度快照）
  - `Monthly_Events`（月度事件）

## 测试表/影子表切换
- 开关: `DECISION_CONFIG.DATA_ENV`（默认 `TEST`，`decisionConfig.gs:7`）
- TEST 表名:
  - `SHEET_CARD_ASSETS_TEST = Card_Assets_TEST`
  - `SHEET_CARD_CATALOG_TEST = Card_Catalog_TEST`
  - `SHEET_PROMO_CATALOG_TEST = Promo_Catalog_TEST`
- 切换函数: `getSheetName_`（`Data.gs:19`）
- 保护: TEST 环境禁止访问 PROD 基础表名（`Data.gs:29-37`）

## 结构化表字段（代码显式）
- `Snapshots` headers（`AuditTrail.gs:6`）:
  - `month, card_id, card_name, status, opened, annual_fee, spend_range, assigned_category, bonus_collected, est_value, net, is_bleeding, is_watch, is_efficient, is_prebonus, lifecycle_stage, fee_due_month, created_at`
- `Monthly_Events` headers（`AuditTrail.gs:8`）:
  - `month, card_id, card_name, event_type, severity, event_key, current_value_json, prev_value_json, message_key, created_at`
- `Promo_Catalog` 归一化输出（`Data.gs:285`）:
  - `promo_id,status,promo_start_date,promo_end_date,promo_last_checked_at,promo_level,time_window_days,bonus_value_est_usd,card_name,issuer,promo_headline,affiliate_url`

## 主键/唯一键
- `Snapshots`: 逻辑唯一 `month + card_id`（写入前按 month 删除再写，`AuditTrail.gs:134`, `303`）
- `Monthly_Events`: 去重键 `month|event_type|card_name(lower)` for bleeding（`AuditTrail.gs:480`）
- `event_key` 规则:
  - Bleeding: dedupe key
  - PreBonus: `card_id:PreBonus`
  - annual fee: `card_id:AnnualFeeDue:YYYY-MM`
  - anomaly/stale/market 见 `generateEvents`（`AuditTrail.gs:754+`）

## 数据流（端到端）
1. `Card_Assets` + `Card_Catalog` + `Promo_Catalog` 读入（`Data.gs`）
2. `normalizeCards_` 清洗开卡时间、年费、回报率、bonus状态（`Normalize.gs:91`）
3. 决策引擎计算结构/生命周期/市场信号（`engine/*.gs`）
4. Monthly 生成 snapshots/events 并落表（`AuditTrail.gs:648`, `754`, `303`, `340`）
5. `Reports.gs` 组装 First/Monthly 模型
6. `WebApp.gs` 转换为 Beautiful DTO；`PdfReports.gs` 转换为 Docs/PDF

