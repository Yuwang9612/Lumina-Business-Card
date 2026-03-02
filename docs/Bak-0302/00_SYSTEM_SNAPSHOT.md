# 00_SYSTEM_SNAPSHOT
生成时间: 2026-02-28 09:41:58 -08:00  
Commit: `8d5b12b`

## 一句话定位
这是一个以 **Google Apps Script + Google Sheets + Google Docs/PDF** 为核心的企业信用卡组合体检与报表系统，支持 First/Monthly 两类报告、事件审计与 Web 预览（`Reports.gs:324`, `Reports.gs:683`, `PdfReports.gs:16`, `WebApp.gs:373`）。

## 当前可运行入口
- Apps Script WebApp 路由入口: `doGet(e)`（`WebApp.gs:373`）
- Spreadsheet 菜单入口: `onOpen()`（`main.gs:7`）
- 菜单动作:
  - Beautiful 模式: `generateFirstReport()`, `generateMonthlyReport()`（`main.gs:74`, `main.gs:78`）
  - Legacy PDF: `generateFirstReportLegacy_()`, `generateMonthlyReportLegacy_()`（`main.gs:82`, `main.gs:115`）
  - Alerts: `runAlertsCheck()`（`main.gs:148`）
- Web 前端 RPC:
  - `getBeautifulReportData`
  - `generateFirstReportForWeb`
  - `generateMonthlyReportForWeb`
  - `generateFirstLegacyPdfForWeb`
  - `generateMonthlyLegacyPdfForWeb`
  （定义见 `WebApp.gs:413` onward）
- Node 本地 PDF 脚本:
  - `generateLuminaReport.js` -> `reportGenerator.js` -> `templates/lumina_report.html`

## 主要用户路径（按当前代码）
- 路径 A（推荐）: 表格菜单 -> `openBeautiful_` 拼接 `?view=beautiful&type=...&autorun=1` -> `BeautifulReportUI.html` 自动触发生成（`main.gs:24`, `WebApp.gs:373`, `BeautifulReportUI.html:516`）。
- 路径 B（Legacy）: 表格菜单 -> `runFirstReport/runMonthlyReport` -> `generateFirstPdf/generateMonthlyPdf`（`main.gs:82`, `main.gs:115`, `Reports.gs:324`, `Reports.gs:683`, `PdfReports.gs:16`, `PdfReports.gs:39`）。
- 路径 C（首页按钮）: `index.html` 四按钮（First/Monthly/Legacy First/Legacy Monthly），对应 Web RPC（`index.html:60-131`）。

## 已实现 / 半实现 / 未实现（按代码现状）
- 已实现:
  - 结构/生命周期/市场三层引擎与编排（`engine/*.gs`, `engine/orchestrator.gs:6`）
  - 月度快照与事件去重写入（`AuditTrail.gs:648`, `AuditTrail.gs:754`, `AuditTrail.gs:340`）
  - 两类 PDF 生成（Google Docs 模板）与 Drive 输出（`PdfReports.gs:16`, `PdfReports.gs:39`, `PdfReports.gs:86`）
  - Beautiful Web 预览 + 浏览器端 html2pdf 下载（`BeautifulReportUI.html:447`）
- 半实现/并行实现:
  - Beautiful 与 Legacy 双渲染链路并存（`WebApp.gs` vs `PdfReports.gs`）
  - Dev 模式下 Monthly 文案写入独立 Sheet（`Reports.gs:770`）
  - WebApp 内大量 fallback stub（`WebApp.gs:59-157`）
- 可疑/遗留:
  - `lumina_report_generator.py` 实际内容是 HTML 模板，非 Python 脚本（文件内容与扩展名不一致）
  - `calc.js/catalog.js/ai.js/format.js` 仅空壳 IIFE（非主链路）

