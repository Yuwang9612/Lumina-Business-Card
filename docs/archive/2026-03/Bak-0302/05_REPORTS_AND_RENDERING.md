# 05_REPORTS_AND_RENDERING
生成时间: 2026-02-28 09:41:58 -08:00  
Commit: `8d5b12b`

## 报表类型清单（按代码）
- First 模型: `runFirstReport`（`Reports.gs:324`）
- Monthly 模型: `runMonthlyReport`（`Reports.gs:683`）
- Legacy PDF (Docs 渲染):
  - `generateFirstPdf` + `renderFirstV33_`（`PdfReports.gs:39`, `737`）
  - `generateMonthlyPdf` + `renderMonthlyV33_`（`PdfReports.gs:16`, `779`）
- Beautiful Web 报告:
  - `BeautifulReportUI.html` + DTO 适配（`WebApp.gs:316`, `337`）
- Dev 文本版 Monthly:
  - `renderMonthlyV1` 写 `Monthly Health Report`（`Reports.gs:581`, `770`）

## 生成链路（数据->模型->渲染->输出）
- First:
  - 数据组装: `runFirstReport`
  - 模型: `_buildFirstModel_`
  - 渲染:
    - Beautiful: `buildBeautifulDataFromFirstModel_` -> 前端 DOM
    - Legacy: `renderFirstV33_` -> Doc -> PDF
- Monthly:
  - 数据组装: `runMonthlyReport` + snapshots/events
  - 模型: `items + monthlyOutlook + portfolioSummary`
  - 渲染:
    - Beautiful: `buildBeautifulDataFromMonthlyModel_`
    - Legacy: `renderMonthlyV33_`

## Beautiful vs Legacy（差异）
- Beautiful:
  - 输出载体: 浏览器页面 + html2pdf（`BeautifulReportUI.html:447`）
  - 数据结构: 扁平 DTO（`client_name/report_type/kpis/actions/promotions`）
  - 切换: URL `view=beautiful&type=FIRST|MONTHLY`（`WebApp.gs:375-399`）
- Legacy:
  - 输出载体: Google Docs 模板 -> Drive PDF（`PdfReports.gs:70`, `86`）
  - 数据结构: firstModel/monthlyModel 原始模型
  - 切换: 菜单 legacy 或 Web RPC `generate*LegacyPdfForWeb`

## Section 渲染规则（Legacy）
- Header/KPI: `appendHeader_`, `appendDashboardFirst_`, `appendDashboardMonthly_`
- Outlook: `renderOutlookTwoLineFirst_`, `renderOutlookTwoLineMonthly_`
- Priority Actions: `appendPriorityActions_`
- Promotions: `appendPromotions_`（cap=`DECISION_CONFIG.PROMO_CAP`）
- Footer: `appendFooter_`

## 已知问题与异常
- WebApp fallback 逻辑非常重，可能掩盖真实错误（`WebApp.gs:59-157`, `safeRun_`）。
- 文案中中英混合残留（如 `COPY_ZH`、中文按钮与英文报告并存，`Reports.gs:23`, `index.html`）。
- `lumina_report_generator.py` 实际为 HTML 模板内容，疑似误命名遗留。
- Beautiful/Legacy 两套样式和字段映射并行，维护成本高且易口径漂移。

