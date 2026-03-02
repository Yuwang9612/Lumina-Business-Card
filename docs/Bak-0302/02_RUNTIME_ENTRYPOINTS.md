# 02_RUNTIME_ENTRYPOINTS
生成时间: 2026-02-28 09:41:58 -08:00  
Commit: `8d5b12b`

## Apps Script / Web 入口
- `WebApp.gs:doGet(e)`
  - `view!=beautiful` -> 返回 `index.html`（`WebApp.gs:383-389`）
  - `view=beautiful` -> 返回 `BeautifulReportUI` 模板（`WebApp.gs:394-401`）
  - 参数: `view`, `type`, `autorun`（`WebApp.gs:375-380`）

## Apps Script / 菜单入口
- `main.gs:onOpen()`
  - 菜单项绑定:
    - `generateFirstReport` / `generateMonthlyReport`
    - `generateFirstReportLegacy_` / `generateMonthlyReportLegacy_`
    - `runAlertsCheck`
    - `setupDevTestView` / `setupCustomerView`
    - `confirmNoChange`

## Web RPC 入口（google.script.run）
- `getBeautifulReportData(clientName, type)`（`WebApp.gs:413`）
  - 调用链: `generateReportDataForWeb` -> `runFirstReport/runMonthlyReport` -> `buildBeautifulDataFrom*Model_`
- `generateFirstReportForWeb()`（`WebApp.gs:442`）
  - 调用链: `generatePdfForWeb_('FIRST')` -> `runFirstReport` -> `generateFirstPdf`
- `generateMonthlyReportForWeb()`（`WebApp.gs:465`）
  - 调用链: `generatePdfForWeb_('MONTHLY')` -> `runMonthlyReport` -> `generateMonthlyPdf`
- `generateFirstLegacyPdfForWeb()`, `generateMonthlyLegacyPdfForWeb()`（`WebApp.gs:488`, `493`）
  - 均进入 `generatePdfForWeb_`

## First 执行链
1. `runFirstReport(ss)`（`Reports.gs:324`）
2. `getActiveCards/getCatalogMap/getPromoCatalog`（`Data.gs`）
3. `normalizeCards_`（`Normalize.gs:91`）
4. `runStructureEngine/runLifecycleEngine/runMarketEngine`（`engine/*.gs`）
5. `computePortfolioSummary` + bonus 生命周期汇总（`engine/structureEngine.gs:34`, `engine/bonusLifecycleEngine.gs:146`）
6. `runOrchestrator`（`engine/orchestrator.gs:6`）
7. `_buildFirstModel_` 返回模型（`Reports.gs:169`）
8. PDF 路径时进入 `generateFirstPdf` -> `renderFirstV33_` -> 导出 PDF（`PdfReports.gs:39`, `737`）

## Monthly 执行链
1. `runMonthlyReport(ss)`（`Reports.gs:683`）
2. 数据读取+normalize+三引擎（同 First）
3. `generateSnapshots` -> `generateEvents` -> `writeSnapshots/writeMonthlyEvents`（`AuditTrail.gs:648`, `754`, `303`, `340`）
4. `_buildMonthlyModelItems_` + `_dedupeMonthlyItems_`（`Reports.gs:206`, `299`）
5. 构建 monthly 模型（含 `monthlyOutlook`、`portfolioSummary`）（`Reports.gs:730-823`）
6. PDF 路径时 `generateMonthlyPdf` -> `renderMonthlyV33_`（`PdfReports.gs:16`, `779`）

## Node 本地入口（非 GAS 主链）
- `generateLuminaReport.js` 直接构造 mock 数据并调用 `generateBeautifulReport`（`reportGenerator.js`）。
- `package.json` 无 scripts，仅声明 `ejs` 和 `puppeteer` 依赖。

