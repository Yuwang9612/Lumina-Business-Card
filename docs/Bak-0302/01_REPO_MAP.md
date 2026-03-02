# 01_REPO_MAP
生成时间: 2026-02-28 09:41:58 -08:00  
Commit: `8d5b12b`

## 目录树（2~3层）
```text
.
├─ engine/
│  ├─ structureEngine.gs
│  ├─ lifecycleEngine.gs
│  ├─ bonusLifecycleEngine.gs
│  ├─ marketEngine.gs
│  └─ orchestrator.gs
├─ templates/
│  └─ lumina_report.html
├─ docs/
│  └─ as-is/
├─ WebApp.gs
├─ main.gs
├─ Reports.gs
├─ PdfReports.gs
├─ Data.gs
├─ Normalize.gs
├─ AuditTrail.gs
├─ Calc.gs
├─ BeautifulReportUI.html
├─ index.html
├─ reportGenerator.js
├─ generateLuminaReport.js
└─ lumina_report_generator.py
```

## 关键文件清单（分类）
- 入口
  - `WebApp.gs`, `main.gs`, `index.html`, `BeautifulReportUI.html`
- 后端（Apps Script 逻辑）
  - `Reports.gs`, `PdfReports.gs`, `AuditTrail.gs`
- 数据
  - `Data.gs`, `Normalize.gs`, `decisionConfig.gs`
- 决策引擎
  - `engine/*.gs`
- 工具/运维
  - `AdminTools.gs`
- 辅助/遗留
  - `Calc.gs`, `reportGenerator.js`, `generateLuminaReport.js`, `lumina_report_generator.py`
- 测试/自测
  - `engine/marketEngine.gs:testMarketWindowFilter`

## 核心职责与函数
- `WebApp.gs`
  - 路由: `doGet(e)`
  - Web RPC: `getBeautifulReportData`, `generateFirstReportForWeb`, `generateMonthlyReportForWeb`
  - DTO 适配: `adaptFirstModelToBeautifulDTO_`, `adaptMonthlyModelToBeautifulDTO_`
- `main.gs`
  - 菜单: `onOpen`
  - 入口动作: `generateFirstReport`, `generateMonthlyReport`, `generateFirstReportLegacy_`, `generateMonthlyReportLegacy_`
- `Reports.gs`
  - 主生成: `runFirstReport`, `runMonthlyReport`
  - 模型构造: `_buildFirstModel_`, `_buildMonthlyModelItems_`, `_dedupeMonthlyItems_`
  - Sheet渲染（dev/legacy文本）: `writeReportFirst_`, `renderMonthlyV1`
- `AuditTrail.gs`
  - 快照: `generateSnapshots`, `writeSnapshots`, `loadPreviousSnapshots*`
  - 事件: `generateEvents`, `writeMonthlyEvents`, `shouldEmitEvent_`, `buildDedupeKey_`
- `PdfReports.gs`
  - Legacy PDF: `generateFirstPdf`, `generateMonthlyPdf`
  - Docs渲染: `renderFirstV33_`, `renderMonthlyV33_`
- `Data.gs`
  - 读表: `getActiveCards`, `getCatalogMap`, `getCatalogAll`, `getPromoCatalog`
  - 环境切换: `getSheetName_`, `_isTestDataEnv_`
- `Normalize.gs`
  - 卡数据标准化: `normalizeCards_`（开卡月、年费、回报率、bonus状态）
- `engine/structureEngine.gs`
  - `runStructureEngine`, `computePortfolioSummary`
- `engine/lifecycleEngine.gs`
  - `runLifecycleEngine`（PreBonus/FirstYear/LongTerm）
- `engine/bonusLifecycleEngine.gs`
  - `deriveBonusLifecycleForPortfolio_`, `computeOneTimeBonusAtRisk_`
- `engine/marketEngine.gs`
  - `runMarketEngine`（not-held + High bonus + freshness）
- `engine/orchestrator.gs`
  - `runOrchestrator`（统一 item priority）

