# 06_API_AND_UI_SURFACES
生成时间: 2026-02-28 09:41:58 -08:00  
Commit: `8d5b12b`

## WebApp HTTP 面
## `doGet(e)` 参数
- `view`: `beautiful` 时走漂亮版，否则走 `index.html`（`WebApp.gs:383`）
- `type`: `FIRST|MONTHLY`（`WebApp.gs:379`）
- `autorun`: `1` 时前端自动生成（`BeautifulReportUI.html:516`）
- `build`: 不是请求参数；仅 `buildInfo` 注入模板并展示（`WebApp.gs:397`, `BeautifulReportUI.html:103`）

## Apps Script RPC 接口（前端调用）
- `getBeautifulReportData(clientName, type)` -> DTO:
  - `client_name, report_type, tagline, kpis{recurring_net,optimized_net,unlock}, actions[], promotions[]?, generated_at`
- `generateFirstReportForWeb()` / `generateMonthlyReportForWeb()`:
  - 返回 `ok,type,fileUrl,forcePreviewDownload,message,mockData`
- `generateFirstLegacyPdfForWeb()` / `generateMonthlyLegacyPdfForWeb()`

## 页面/模板清单
- `index.html`
  - 按钮: Generate First / Monthly / Legacy First / Legacy Monthly / 打开漂亮报告版 / 刷新
  - 触发函数: `runFirst`, `runMonthly`, `runFirstLegacy`, `runMonthlyLegacy`
- `BeautifulReportUI.html`
  - Tab: First / Monthly
  - 按钮: `runFirstBtn`, `runMonthlyBtn`, `reloadBeautifulBtn`, `downloadBtn`
  - 数据请求: `google.script.run.getBeautifulReportData(...)`
  - 生成请求: `generateFirstReportForWeb`, `generateMonthlyReportForWeb`
  - 本地下载: `downloadPdf()`（html2pdf）

## Debug/日志面
- UI Debug Panel（始终渲染）:
  - `buildInfo`, 当前 URL, `CURRENT_REPORT_TYPE`, `lastResponse`, `status`
  - 代码: `refreshDebugPanel`, `showDebug`（`BeautifulReportUI.html:124`）
- Apps Script 日志关键词:
  - `[WebApp][doGet] ...`
  - `[DataEnv] assetsSheet=...`
  - `[Dedupe] ...`
  - `DEBUG monthlyOutlook net=...`
  - `DEBUG assetsSheet=... | activeCards=...`（写入 `Reports!H2`）

