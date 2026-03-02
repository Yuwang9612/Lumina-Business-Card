# SYSTEM_AUDIT

## 1) 项目总览

### 1.1 目录树（代码与配置）

```text
Lumina-Business Card/
├─ .clasp.json
├─ .gitignore
├─ appsscript.json
├─ package.json
├─ package-lock.json
├─ README.md
├─ main.gs
├─ decisionConfig.gs
├─ Data.gs
├─ Normalize.gs
├─ Calc.gs
├─ Reports.gs
├─ PdfReports.gs
├─ AuditTrail.gs
├─ AdminTools.gs
├─ WebApp.gs
├─ index.html
├─ BeautifulReportUI.html
├─ ai.js
├─ calc.js
├─ catalog.js
├─ format.js
├─ reportGenerator.js
├─ generateLuminaReport.js
├─ lumina_report_generator.py
├─ templates/
│  └─ lumina_report.html
├─ engine/
│  ├─ structureEngine.gs
│  ├─ lifecycleEngine.gs
│  ├─ bonusLifecycleEngine.gs
│  ├─ marketEngine.gs
│  └─ orchestrator.gs
└─ docs/as-is/
   ├─ 00_project_overview.md
   ├─ 10_db_schema.md
   ├─ 11_data_dictionary.md
   ├─ 12_db_vs_code_mismatch.md
   ├─ 20_api_spec.md
   ├─ 30_data_layer.md
   ├─ 40_frontend_mapping.md
   ├─ 50_rules_and_metrics.md
   ├─ 90_gaps_and_risks.md
   ├─ 99_questions_for_owner.md
   └─ README.md
```

### 1.2 每个文件一句话职责

| 文件 | 职责 |
|---|---|
| `main.gs` | Google Sheets 菜单入口与手动执行（First/Monthly/Alerts/PDF弹窗）。 |
| `decisionConfig.gs` | 全局策略阈值与环境开关（TEST/PROD、去重、告警阈值、促销窗口等）。 |
| `Data.gs` | 从各 Sheet 读数据、按 header 映射对象、环境锁（TEST禁止读PROD）。 |
| `Normalize.gs` | 原始卡片数据标准化（日期、金额、区间、奖励状态等）。 |
| `Calc.gs` | 计算工具（净收益分级、预警行、摘要文本、格式化）。 |
| `Reports.gs` | First/Monthly 报告模型构建与写表（核心编排层）。 |
| `PdfReports.gs` | 生成 Google Docs 报告并导出 PDF（模板渲染层）。 |
| `AuditTrail.gs` | Snapshots / Monthly_Events 事件溯源、去重、冷却与写入。 |
| `AdminTools.gs` | 客户/测试视图切换与工作表显隐、保护。 |
| `WebApp.gs` | Web 入口与 Web 端 fallback 报告生成 API。 |
| `index.html` | 原版 Web UI（入口页）。 |
| `BeautifulReportUI.html` | 漂亮报表 Web UI（Tailwind + html2pdf）。 |
| `engine/structureEngine.gs` | 结构收益引擎（Bleeding/Watch/Efficient）与组合汇总。 |
| `engine/lifecycleEngine.gs` | 生命周期引擎（PreBonus/FeeDue/LongTerm）。 |
| `engine/bonusLifecycleEngine.gs` | 奖励生命周期推导与一次性收益风险计算。 |
| `engine/marketEngine.gs` | 市场促销机会筛选（窗口期、新鲜度、已持卡过滤）。 |
| `engine/orchestrator.gs` | 将结构/生命周期/市场信号汇总为决策计划。 |
| `templates/lumina_report.html` | 非 GAS 的 HTML 模板文件（外部生成链路备用）。 |
| `reportGenerator.js` | Node 侧报表生成脚本（非 GAS 主链路）。 |
| `generateLuminaReport.js` | Node/脚本生成入口（非 GAS 主链路）。 |
| `lumina_report_generator.py` | Python 版本生成器（离线备用）。 |
| `ai.js/calc.js/catalog.js/format.js` | JS 工具与实验/辅助脚本。 |
| `docs/as-is/*` | 当前系统文档快照（架构、schema、风险）。 |
| `.clasp.json` | clasp 项目绑定配置。 |
| `appsscript.json` | GAS manifest。 |
| `package*.json` | Node 依赖定义与锁定。 |

**主入口文件**：`main.gs`, `WebApp.gs`  
**关键业务文件**：`Reports.gs`, `PdfReports.gs`, `Data.gs`, `Calc.gs`, `AuditTrail.gs`, `engine/*`, `decisionConfig.gs`

---

## 2) 运行入口与调用链

### 2.1 入口函数/触发器清单

| 入口类型 | 函数 | 文件 | 说明 |
|---|---|---|---|
| 菜单安装 | `onOpen()` | `main.gs` | 创建 `Card Profit Watch` 菜单项。 |
| Web GET 入口 | `doGet(e)` | `main.gs` | 返回 `index.html`（旧入口）。 |
| Web GET 入口 | `doGet(e)` | `WebApp.gs` | WebApp 路由入口（默认 `index`，`?view=beautiful` 走漂亮页）。 |
| 菜单动作 | `generateFirstReport()` | `main.gs` | 触发 First 计算 + PDF 导出。 |
| 菜单动作 | `generateMonthlyReport()` | `main.gs` | 触发 Monthly 计算 + PDF 导出。 |
| 菜单动作 | `runAlertsCheck()` | `main.gs` | 执行 Alerts 检查与写表。 |
| 菜单动作 | `confirmNoChange()` | `main.gs` | 批量刷新 `assets_last_confirmed`。 |
| Web API | `getBeautifulReportData()` | `WebApp.gs` | 提供漂亮页预览数据。 |
| Web API | `generateFirstReportForWeb()` | `WebApp.gs` | Web 按钮触发 First 生成接口。 |
| Web API | `generateMonthlyReportForWeb()` | `WebApp.gs` | Web 按钮触发 Monthly 生成接口。 |

**time-driven trigger / doPost**：代码中未发现 `ScriptApp.newTrigger` 与 `doPost`。

### 2.2 First Report 生成链路（文本流程图）

```text
Sheets Menu click
  -> main.gs:onOpen 注册项 -> main.gs:generateFirstReport()
  -> Data: _getSheetByName('Reports') 写 RUNNING
  -> Reports.gs:runFirstReport(ss)
       -> Data.gs:getActiveCards/getCatalogMap/getCatalogAll/getPromoCatalog
       -> Normalize.gs:normalizeCards_
       -> engine: runStructureEngine
       -> engine: deriveBonusLifecycleForPortfolio_
       -> engine: runLifecycleEngine
       -> engine: runMarketEngine
       -> engine: computePortfolioSummary
       -> engine: runOrchestrator
       -> Reports.gs:_buildFirstModel_
  -> PdfReports.gs:generateFirstPdf(ss, firstModel)
       -> createReportDocCopy_ -> renderFirstV33_ -> exportPdfFromCopy_
  -> 回写 Reports 状态 + fileUrl
  -> main.gs:openPdfDialog_(fileUrl)
```

### 2.3 Monthly Health Report 生成链路（文本流程图）

```text
Sheets Menu click
  -> main.gs:generateMonthlyReport()
  -> Reports.gs:runMonthlyReport(ss)
       -> 读取数据 + normalize + structure/lifecycle/market
       -> AuditTrail: generateSnapshots / generateEvents
       -> AuditTrail: writeSnapshots / writeMonthlyEvents
       -> Reports.gs:_buildMonthlyModelItems_ / _buildMonthlySummaryLineFromItems_
       -> 返回 monthlyModel
  -> PdfReports.gs:generateMonthlyPdf(ss, monthlyModel)
       -> renderMonthlyV33_ -> exportPdfFromCopy_
  -> 回写 Reports 状态 + fileUrl
  -> main.gs:openPdfDialog_(fileUrl)
```

### 2.4 Structure/Lifecycle/Market 决策链路

```text
Card_Assets(+Catalog/+Promos)
  -> Data.gs (读取)
  -> Normalize.gs (标准化 cardsNormalized)
  -> structureEngine.runStructureEngine(cardsNormalized)
  -> bonusLifecycleEngine.deriveBonusLifecycleForPortfolio_(cardsNormalized, promoCatalog, anchorNow, DECISION_CONFIG)
  -> lifecycleEngine.runLifecycleEngine(cardsNormalized, bonusLifecycleRows, reportMonth)
  -> marketEngine.runMarketEngine(cardsNormalized, catalogAll, promoCatalog, reportMonth)
  -> structureEngine.computePortfolioSummary(structureResults)
  -> orchestrator.runOrchestrator(structureResults, lifecycleResults, marketSignals, portfolioSummary)
  -> Reports.gs 组装 report model（First 或 Monthly）
```

### 2.5 每一步输入输出（核心对象）

| 步骤 | 输入 | 输出 |
|---|---|---|
| `getActiveCards(ss)` | `Card_Assets(_TEST)` sheet | `Array<Object>`（按 header 映射的活动卡） |
| `normalizeCards_(cards,catalogMap)` | 活动卡+目录 | `cardsNormalized`（统一字段） |
| `runStructureEngine(cardsNormalized)` | 标准化卡 | 每卡结构结果（fee/value/net/stage） |
| `deriveBonusLifecycleForPortfolio_` | cardsNormalized+promos | 奖励生命周期 rows |
| `runLifecycleEngine(...)` | cardsNormalized+bonus rows | 生命周期结果（PreBonus/FeeDue等） |
| `runMarketEngine(...)` | cardsNormalized+catalog+promos | 市场信号（topPromos, freshness） |
| `runOrchestrator(...)` | 三引擎结果+组合汇总 | `decisionPlan`（items/keyNumbers/actionCandidates） |
| `runFirstReport(ss)` | Spreadsheet | `firstModel`（keyNumbers/focusItems/promotions/...） |
| `runMonthlyReport(ss)` | Spreadsheet | `monthlyModel`（items/summary/promo/portfolio/...） |
| `generateFirstPdf/MonthlyPdf` | model + template | `{fileId, fileUrl}` |

---

## 3) 数据结构（Sheets Schema）

> 依据 `Data.gs`、`AuditTrail.gs`、`Reports.gs` 的真实读写行为整理。

### 3.1 Company_Profile

| 列/键 | 含义 | 必填 | 示例 |
|---|---|---|---|
| A: key | 配置键名 | 建议必填 | `Company Name` |
| B: value | 配置值 | 建议必填 | `Lumina Logic LLC` |

用于：报表抬头、PDF文件命名、公司名读取。

### 3.2 Card_Assets / Card_Assets_TEST

| 字段 | 含义 | 必填 | 示例 |
|---|---|---|---|
| `Card Name` | 卡名 | 必填 | `Amex Business Gold` |
| `Status`/`状态` | 活跃状态过滤 | 建议必填 | `Active` |
| `Current Annual Spend (Range)` / `Spend Range` | 年消费区间 | 建议必填 | `$10k-$20k` |
| `assets_last_confirmed` | 最近确认时间 | 可空 | `2026-02-20` |
| 其他列 | 会原样映射进对象 | 可空 | - |

影响：提醒、健康检查、净收益计算、数据陈旧判定。

### 3.3 Card_Catalog / Card_Catalog_TEST

| 字段 | 含义 | 必填 | 示例 |
|---|---|---|---|
| `Card Name` | 卡名匹配键 | 必填 | `Ink Cash` |
| `Issuer` | 发卡行 | 可空 | `Chase` |
| `Annual Fee (USD)` | 年费 | 建议必填 | `95` |
| `Base Return (Conservative)` | 保守收益估值 | 建议必填 | `0.015` |
| `Typical Bonus Value (USD)` | 奖励估值 | 可空 | `900` |
| `Bonus Level` | 奖励等级 | 可空 | `High` |
| `Downgrade Option` | 可否降级 | 可空 | `TRUE` |
| `catalog_updated_at` | 目录更新时间 | 可空 | `2026-02-01` |
| `data_confidence` | 数据置信度 | 可空 | `HIGH` |
| `bonus_last_updated` | 奖励最近更新时间 | 可空 | `2026-02-10` |
| `bonus_valid_until` | 奖励有效期 | 可空 | `2026-03-31` |
| `best_for_categories` | 适用类别 | 可空 | `Ads, Travel` |
| `annual_fee_current` | 当前年费 | 可空 | `95` |
| `product_type` | 产品类型 | 可空 | `Business` |

影响：结构引擎净值、降级建议、市场机会筛选、陈旧数据抑制。

### 3.4 Promo_Catalog / Promo_Catalog_TEST

`Data.gs:getPromoCatalog()` 支持别名映射，核心字段：

| 字段 | 含义 | 必填 | 示例 |
|---|---|---|---|
| `promo_id` | 促销唯一标识 | 必填 | `PROMO_2026_001` |
| `card_name` | 对应卡名 | 必填 | `Amex Business Gold` |
| `status` | Active/Inactive | 建议必填 | `Active` |
| `promo_level` | High/Medium/Low | 可空 | `High` |
| `bonus_value_est_usd` | 奖励估值 | 可空 | `1200` |
| `promo_start_date` | 起始日期 | 可空 | `2026-02-01` |
| `promo_end_date` | 截止日期 | 可空 | `2026-03-15` |
| `affiliate_url` | 申请链接 | 可空 | `https://...` |
| `promo_headline` | 文案 | 可空 | `120K offer` |

影响：促销块、市场窗口提醒、机会优先级。

### 3.5 Reports

| 位置 | 含义 |
|---|---|
| `B3` | 状态（RUNNING/DONE/ERROR） |
| `B4` | 错误/警告 |
| `B5` | PDF URL 文本 |
| `E1` | 最近运行时间 |
| `E3` | 最近运行类型（FIRST/MONTHLY/ALERTS） |

影响：执行状态可视化、错误追踪。

### 3.6 Monthly Health Report（sheet）

由 `runMonthlyReport` 在 `DEV_MODE` 下写入（`ensureMonthlyReportSheet` + `renderMonthlyV1`），用于客户可读版块内容预览。

### 3.7 Snapshots

`AuditTrail.gs` 定义：

`['month','card_id','card_name','status','opened','annual_fee','spend_range','assigned_category','bonus_collected','est_value','net','is_bleeding','is_watch','is_efficient','is_prebonus','lifecycle_stage','fee_due_month','created_at']`

影响：事件比较基线、月度差异检测。

### 3.8 Monthly_Events

`AuditTrail.gs` 定义：

`['month','card_id','card_name','event_type','severity','event_key','current_value_json','prev_value_json','message_key','created_at']`

影响：Monthly top items、去重、冷却策略、告警历史。

---

## 4) 配置与常量

### 4.1 `decisionConfig.gs` 常量表

| 常量名 | 默认值 | 作用 | 主要使用位置 | 修改影响 |
|---|---:|---|---|---|
| `DATA_ENV` | `TEST` | 数据环境锁（TEST/PROD） | `Data.gs`, `main.gs`, `Reports.gs` | 读写到 TEST 或 PROD sheet |
| `SHEET_CARD_ASSETS_TEST` | `Card_Assets_TEST` | TEST 资产表名 | `Data.gs:getSheetName_` | TEST 模式读表目标 |
| `SHEET_CARD_CATALOG_TEST` | `Card_Catalog_TEST` | TEST 目录表名 | `Data.gs:getSheetName_` | TEST 模式读表目标 |
| `SHEET_PROMO_CATALOG_TEST` | `Promo_Catalog_TEST` | TEST 促销表名 | `Data.gs:getSheetName_` | TEST 模式读表目标 |
| `REPORT_MONTH_OVERRIDE` | `null` | 强制报告月份 | `Reports.gs:getReportMonth_` | 回溯/补跑月份 |
| `REALIZABLE_DELTA_MIN` | `200` | 可执行收益提升阈值 | `Calc.gs`, `engine/orchestrator.gs` | 决策推荐强度 |
| `BLEEDING_MIN_LOSS` | `100` | 亏损判定阈值 | `Calc.gs`, `Reports.gs`, `AuditTrail.gs`, `engine/structureEngine.gs` | Bleeding判定/告警级别 |
| `BLEEDING_RETRIGGER_DELTA` | `50` | 月内重触发增量阈值 | `AuditTrail.gs` | Bleeding重复告警行为 |
| `BLEEDING_MAX_EVENTS_PER_MONTH` | `2` | Bleeding月内上限 | `AuditTrail.gs` | 告警噪音控制 |
| `STALE_DAYS` | `45` | 数据陈旧天数 | `AuditTrail.gs`, `engine/marketEngine.gs` | DataStale 事件触发 |
| `MARKET_FRESH_DAYS` | `120` | 促销新鲜度窗口 | `AuditTrail.gs`, `engine/marketEngine.gs` | MarketWindow抑制 |
| `PREBONUS_MONTH_LIMIT` | `3` | PreBonus窗口 | （引擎逻辑使用） | 奖励阶段判定 |
| `fee_due_window_months` | `1` | 年费到期观察窗口（月） | `AuditTrail.gs` | FeeDue触发时机 |
| `FEE_REMINDER_DAYS` | `[45,30,15]` | 年费提醒点 | （规则语义） | 提醒节奏 |
| `COOLDOWN_DAYS` | map | 各事件冷却天数 | `AuditTrail.gs` | 防重复提醒 |
| `MARKET_WINDOW_CAP` | `5` | 市场机会上限 | `engine/marketEngine.gs` | 输出数量 |
| `PROMO_CAP` | `3` | 报告中促销条数上限 | `Reports.gs`, `PdfReports.gs` | 报表促销展示条数 |
| `PROMO_REQUIRE_ENDDATE` | `false` | 是否要求promo有截止日期 | `PdfReports.gs` | 无截止promo是否展示 |
| `DEV_MODE` | `false` | 开发模式写表与调试 | `Reports.gs`, `PdfReports.gs` | 是否写调试区域/链接 |

---

## 5) 报表输出（目前实现）

### 5.1 First Report

- 模型函数：`Reports.gs:runFirstReport(ss)`
- 模型关键字段：
  - `keyNumbers {currentNet, optimizedNet, delta, currentFees, currentValue, oneTimeBonusAtRisk, ...}`
  - `focusItems[]`
  - `promotions[] / topPromos[]`
  - `portfolioSummaryText`, `footer`
- PDF 渲染：`PdfReports.gs:generateFirstPdf` -> `renderFirstV33_`
- 模板来源：`TEMPLATE_FIRST_DOC_ID`
- 样式来源：`PdfReports.gs` 内 `REPORT_V3_STYLE` 与渲染函数族

### 5.2 Monthly Health Report

- 模型函数：`Reports.gs:runMonthlyReport(ss)`
- 模型关键字段：
  - `summaryLine`, `headline`, `body`
  - `items[]`（Top issues）
  - `portfolioSummary/currentFees/currentValue/recurringNet`
  - `promotions[]`
  - `oneTimeBonusAtRisk`, `totalPotentialThisYear`
- PDF 渲染：`PdfReports.gs:generateMonthlyPdf` -> `renderMonthlyV33_`
- 模板来源：`TEMPLATE_MONTHLY_DOC_ID`
- 排版关键点：
  - Promotions 通过 `buildPromotionsBlock_`、`appendPromotions_` 拼接
  - 自动换行/分段由 Docs Paragraph 与 Table cell 处理
  - `PROMO_REQUIRE_ENDDATE` 会过滤无截止日期促销

### 5.3 PDF 关键函数与命名规则

| 功能 | 函数 | 文件 |
|---|---|---|
| First PDF 生成 | `generateFirstPdf` | `PdfReports.gs` |
| Monthly PDF 生成 | `generateMonthlyPdf` | `PdfReports.gs` |
| 模板复制 | `createReportDocCopy_` | `PdfReports.gs` |
| 导出 PDF | `exportPdfFromCopy_` | `PdfReports.gs` |
| First 文件名 | `buildFirstFileName_` | `PdfReports.gs` |
| Monthly 文件名 | `buildMonthlyFileName_` | `PdfReports.gs` |

命名规则：
- First：`FirstReport_<Client>_<yyyyMMdd>.pdf`
- Monthly：`Monthly_<Client>_<yyyy-MM>.pdf`

---

## 6) 最近改动与风险点

### 6.1 最近 20 次改动（当前仓库可见）

当前 `git log -n 20` 仅可见 1 次提交：

- `8d5b12b` `backup: Grok参与之前的版本`
- 涉及文件：`main.gs`, `Reports.gs`, `PdfReports.gs`, `Data.gs`, `Calc.gs`, `Normalize.gs`, `AuditTrail.gs`, `AdminTools.gs`, `engine/*`, `decisionConfig.gs`, `docs/as-is/*`, `package*.json`, `appsscript.json` 等。

> 结论：缺少细粒度历史，无法从 Git 精确还原“最近20次逐条变更摘要”。当前只可基于该快照做现状审计。

### 6.2 最可能导致“报表乱/空白/链接异常”的位置

1. **双 `doGet` 入口冲突**：`main.gs:doGet` 与 `WebApp.gs:doGet` 同时存在，Web 发布时实际执行函数可能与预期不同。  
2. **Sheet 名硬编码 + 环境锁**：`Data.gs` 中 TEST 模式禁止访问 PROD 表，若 `DATA_ENV` 与实际表名不一致会报错。  
3. **Header 变更风险**：`Data.gs` 大量依赖 header 文本和别名，字段改名会导致空数据或错映射。  
4. **Range 偏移风险**：`Reports` 状态位依赖固定单元格（B3/B4/B5/E1/E3）。  
5. **Promo 数据质量**：`PROMO_REQUIRE_ENDDATE`、`bonus_last_updated`、`data_confidence` 会影响机会输出/过滤。  
6. **Web fallback 逻辑**（当前 `WebApp.gs`）：包含大量自包含 fallback，若与主引擎并存，可能出现“成功但无真实 PDF URL”。

---

## 7) 报表美化集成点建议（Tailwind + html2pdf）

### 方案 A：仅 Web 展示层集成（最低风险）

- 集成点：`WebApp.gs:getBeautifulReportData` + `BeautifulReportUI.html`
- 改动范围：仅新增/维护 Web 端 JSON 输出与前端模板，不改 `Reports.gs`/`PdfReports.gs` 主链。
- 风险：Web 与菜单 PDF 两套输出口径可能出现轻微差异。
- 回滚：回退 `WebApp.gs` 与 `BeautifulReportUI.html` 即可，不影响菜单生产链路。

### 方案 B：复用 Monthly/First 模型为统一 DTO（中风险）

- 集成点：`runFirstReport`/`runMonthlyReport` 返回对象标准化，再由 Web UI/PDF 共用。
- 改动范围：`Reports.gs` + `WebApp.gs` + `BeautifulReportUI.html`。
- 风险：模型字段变动可能影响 `PdfReports.gs` 渲染函数。
- 回滚：保留旧字段兼容层（adapter），可快速回退到旧渲染。

### 方案 C：Web 优先导出（html2pdf）+ Docs PDF 兜底（高风险但一致性高）

- 集成点：前端 `html2pdf` 作为主下载，`PdfReports.gs` 仅作为后备导出。
- 改动范围：`BeautifulReportUI.html` 下载逻辑、`WebApp.gs` 响应契约、菜单入口提示。
- 风险：浏览器环境差异、分页/字体渲染差异可能导致导出一致性问题。
- 回滚：保留 `generateFirstPdf/generateMonthlyPdf` 并通过开关切回 Docs 模板导出。

---

## 关键函数清单（审计重点）

- 报告生成：`runFirstReport`, `runMonthlyReport` (`Reports.gs`)
- PDF 导出：`generateFirstPdf`, `generateMonthlyPdf` (`PdfReports.gs`)
- 结构引擎：`runStructureEngine` (`engine/structureEngine.gs`)
- 生命周期引擎：`runLifecycleEngine` (`engine/lifecycleEngine.gs`)
- 奖励生命周期：`deriveBonusLifecycleForPortfolio_` (`engine/bonusLifecycleEngine.gs`)
- 市场引擎：`runMarketEngine` (`engine/marketEngine.gs`)
- 编排器：`runOrchestrator` (`engine/orchestrator.gs`)
- 数据访问：`_getSheetByName`, `getActiveCards`, `getCatalogMap`, `getPromoCatalog` (`Data.gs`)
- 事件审计：`writeSnapshots`, `writeMonthlyEvents`, `generateEvents` (`AuditTrail.gs`)

---

## 结论

当前系统核心生产链路仍是：
`main.gs (menu) -> Reports.gs (model) -> PdfReports.gs (Docs->PDF)`。

Web 端（`WebApp.gs` + `BeautifulReportUI.html`）可作为美化预览/下载层，但建议通过“统一模型 DTO + 回滚开关”策略分步接入，避免影响主链路稳定性。
