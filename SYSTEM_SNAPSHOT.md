# SYSTEM SNAPSHOT

## 1) 文件树（仅 GAS/前端相关）

```text
.
├─ .clasp.json
├─ appsscript.json
├─ AdminTools.gs
├─ AuditTrail.gs
├─ BeautifulReportUI.html
├─ Calc.gs
├─ Data.gs
├─ Normalize.gs
├─ PdfReports.gs
├─ Reports.gs
├─ WebApp.gs
├─ decisionConfig.gs
├─ main.gs
├─ index.html
├─ ai.js
├─ calc.js
├─ catalog.js
├─ format.js
├─ generateLuminaReport.js
├─ reportGenerator.js
├─ engine/
│  ├─ bonusLifecycleEngine.gs
│  ├─ lifecycleEngine.gs
│  ├─ marketEngine.gs
│  ├─ orchestrator.gs
│  └─ structureEngine.gs
└─ templates/
   └─ lumina_report.html
```

### 关键职责（一句话）
- `main.gs`: Sheets 菜单与原始入口（含 `onOpen`、菜单生成、菜单触发链路）。
- `WebApp.gs`: Web App 路由、Web API、以及大量 fallback/自包含逻辑。
- `Reports.gs`: First/Monthly 报表模型主生成逻辑（调用三层引擎 + 审计事件）。
- `PdfReports.gs`: Google Docs -> PDF 导出与版式渲染。
- `Data.gs`: 所有 Sheet 数据读取、字段归一、TEST/PROD 环境锁。
- `decisionConfig.gs`: 阈值常量与开关配置。
- `AuditTrail.gs`: Snapshots 与 `Monthly_Events` 的生成、写入、读取。
- `engine/*.gs`: 结构/生命周期/市场/编排四层决策引擎。
- `index.html`: 轻量 Web 入口页按钮（调用 `google.script.run`）。
- `BeautifulReportUI.html`: 漂亮预览页（Tailwind + html2pdf，前端降级下载）。

---

## 2) 入口与路由

## 2.1 命中：`doGet` / `onOpen` / 菜单入口

### 命中清单
```text
WebApp.gs:192 function doGet(e)
main.gs:5 function doGet(e)
main.gs:9 function onOpen()
main.gs:31 function generateFirstReport()
main.gs:64 function generateMonthlyReport()
```

### `main.gs` 的 `doGet` 全文
```javascript
function doGet(e) {
  return HtmlService.createHtmlOutputFromFile('index').setTitle('Lumina Business Card');
}
```

### `main.gs` 的 `onOpen` 全文（菜单入口）
```javascript
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Card Profit Watch')
    .addItem('Generate First Wake-up Report', 'generateFirstReport')
    .addItem('Generate Monthly Health Report', 'generateMonthlyReport')
    .addItem('Run Alerts Check', 'runAlertsCheck')
    .addSeparator()
    .addItem('Admin: Setup Dev/Test View', 'setupDevTestView')
    .addItem('Admin: Setup Customer View', 'setupCustomerView')
    .addSeparator()
    .addItem('Confirm No Change (All Active Cards)', 'confirmNoChange')
    .addToUi();
}
```

### `WebApp.gs` 的 `doGet` 全文（路由核心）
```javascript
function doGet(e) {
  return safeRun_(function () {
    var view = '';
    if (e && e.parameter && e.parameter.view) view = String(e.parameter.view).toLowerCase();

    if (view !== 'beautiful') {
      try {
        return HtmlService.createHtmlOutputFromFile('index').setTitle('Lumina Business Card');
      } catch (err) {}
    }

    return HtmlService.createTemplateFromFile('BeautifulReportUI')
      .evaluate()
      .setTitle('Lumina Beautiful Report')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }, function () {
    return HtmlService.createHtmlOutput('<h1>Lumina Logic LLC</h1><p>Fallback Web App page.</p>');
  });
}
```

## 2.2 WebApp 路由规则（真实命中）

```text
WebApp.gs:195 if (e && e.parameter && e.parameter.view) view = ...
WebApp.gs:199 return HtmlService.createHtmlOutputFromFile('index') ...
WebApp.gs:203 return HtmlService.createTemplateFromFile('BeautifulReportUI') ...
```

### 路由表
- 无参数 / `?view!=beautiful` -> 返回 `index.html`
- `?view=beautiful` -> 返回 `BeautifulReportUI.html`（模板 evaluate）
- 异常 -> 返回内置 fallback HTML（`<h1>Lumina Logic LLC</h1>...`）

### 风险提示
- 项目中存在 **两个 `doGet`**（`main.gs` 与 `WebApp.gs`）。Apps Script 会以最后加载版本为准，存在冲突风险。

---

## 3) Web 端 API 契约（前端 `google.script.run`）

## 3.1 前端调用命中片段

### `BeautifulReportUI.html`
```javascript
google.script.run
  .withSuccessHandler(...)
  .withFailureHandler(...)
  .getBeautifulReportData("Lumina Logic LLC");

google.script.run
  .withSuccessHandler(...)
  .withFailureHandler(...)
  .generateFirstReportForWeb();

google.script.run
  .withSuccessHandler(...)
  .withFailureHandler(...)
  .generateMonthlyReportForWeb();
```

### `index.html`
```javascript
google.script.run ... .generateFirstReportForWeb();
google.script.run ... .generateMonthlyReportForWeb();
```

## 3.2 后端函数清单（WebApp.gs）
- `getBeautifulReportData(clientName)`
- `generateFirstReportForWeb()`
- `generateMonthlyReportForWeb()`
- （内部）`generatePdfForWeb_(mode)`

## 3.3 契约详情

### A) `getBeautifulReportData(clientName)`
- 入参: `clientName: string`
- 返回: 报表数据对象（真实或 mock）

返回示例：
```json
{
  "client_name": "Lumina Logic LLC",
  "report_title": "First Wake-up Report",
  "recurring_net": "-$12,800",
  "optimized_net": "$4,600",
  "unlock": "+$17,400",
  "actions": [
    {
      "name": "Chase Ink Preferred",
      "level": "HIGH",
      "desc": "High spend is not routed to best multiplier category.",
      "todo": "Shift ad spend routing this cycle.",
      "loss": "-$6,200"
    }
  ],
  "promotions": [
    {
      "tag": "Promo Opportunity",
      "title": "Chase Ink Business Preferred 120K",
      "desc": "Strong travel transfer value for upcoming spend cycle.",
      "link": "https://...",
      "color": "indigo"
    }
  ]
}
```

### B) `generateFirstReportForWeb()` / `generateMonthlyReportForWeb()`
- 入参: 无
- 返回: 统一结果对象

返回示例（有真实 PDF URL）：
```json
{
  "ok": true,
  "type": "FIRST",
  "fileUrl": "https://drive.google.com/...",
  "forcePreviewDownload": false,
  "message": "Report generated successfully.",
  "mockData": { "client_name": "Lumina Logic LLC", "...": "..." }
}
```

返回示例（无 URL，要求前端下载预览）：
```json
{
  "ok": true,
  "type": "MONTHLY",
  "fileUrl": "",
  "forcePreviewDownload": true,
  "message": "Monthly generated in local fallback mode.",
  "mockData": { "client_name": "Lumina Logic LLC", "...": "..." }
}
```

### 关键字段说明
- `fileUrl`: 后端真实 PDF 地址（Drive URL）。为空时前端不能 `window.open`。
- `forcePreviewDownload`: `true` 表示应走前端 `html2pdf` 下载当前预览。
- `mockData`: 后端兜底数据，前端可直接渲染以避免白屏。

### 关键命中片段（按你要求关键字）
```text
WebApp.gs:264 function generateFirstReportForWeb()
WebApp.gs:283 function generateMonthlyReportForWeb()
WebApp.gs:302 function generatePdfForWeb_(mode)
WebApp.gs:269 res.forcePreviewDownload = !res.fileUrl;
WebApp.gs:337 fileUrl: pdfRes.fileUrl ? String(pdfRes.fileUrl) : ''
WebApp.gs:338 forcePreviewDownload: !(pdfRes && pdfRes.fileUrl)
WebApp.gs:212 function getBeautifulReportData(clientName)
```

---

## 4) 报表生成链路（First + Monthly）

## 4.1 First Report 主链路（Docs -> PDF）

1. 入口（Sheets 菜单）: `onOpen -> generateFirstReport` (`main.gs`)
2. 模型生成: `runFirstReport(ss)` (`Reports.gs`)
3. 引擎链路:
   - `getActiveCards/getCatalogMap/getCatalogAll/getPromoCatalog` (`Data.gs`)
   - `normalizeCards_` (`Normalize.gs`)
   - `runStructureEngine` (`engine/structureEngine.gs`)
   - `deriveBonusLifecycleForPortfolio_` + `runLifecycleEngine` (`engine/bonusLifecycleEngine.gs`, `engine/lifecycleEngine.gs`)
   - `runMarketEngine` (`engine/marketEngine.gs`)
   - `runOrchestrator` (`engine/orchestrator.gs`)
4. PDF 导出: `generateFirstPdf(ss, firstModel)` (`PdfReports.gs`)
5. 结果处理: `openPdfDialog_(pdfUrl)` + 写 `Reports!B3/B5/E1/E3` (`main.gs`)

文本流程图：
```text
Menu click
 -> main.generateFirstReport
 -> Reports.runFirstReport
 -> Data + Normalize + Structure/Lifecycle/Market + Orchestrator
 -> firstModel
 -> PdfReports.generateFirstPdf
 -> Drive PDF(fileUrl)
 -> main.openPdfDialog_ + Reports sheet status cells
```

## 4.2 Monthly Report 主链路（Docs -> PDF）

1. 入口（Sheets 菜单）: `onOpen -> generateMonthlyReport` (`main.gs`)
2. 模型生成: `runMonthlyReport(ss)` (`Reports.gs`)
3. 额外审计链路:
   - `generateSnapshots`, `loadPreviousSnapshotsArray`, `generateEvents`
   - `writeSnapshots`, `writeMonthlyEvents`（`AuditTrail.gs`）
4. PDF 导出: `generateMonthlyPdf(ss, monthlyModel)` (`PdfReports.gs`)
5. 结果处理: `openPdfDialog_(pdfUrl)` + 写 `Reports!B3/B5/E1/E3` (`main.gs`)

文本流程图：
```text
Menu click
 -> main.generateMonthlyReport
 -> Reports.runMonthlyReport
 -> Data + Normalize + Engines
 -> AuditTrail snapshots/events write
 -> monthlyModel
 -> PdfReports.generateMonthlyPdf
 -> Drive PDF(fileUrl)
 -> main.openPdfDialog_ + Reports sheet status cells
```

## 4.3 Web 漂亮预览链路（html2pdf）

- `doGet(?view=beautiful)` -> `BeautifulReportUI.html`
- 页面加载: `loadData() -> google.script.run.getBeautifulReportData(...)`
- 生成按钮:
  - `runFirst() -> generateFirstReportForWeb()`
  - `runMonthly() -> generateMonthlyReportForWeb()`
- 若 `fileUrl` 存在: `window.open(fileUrl)`
- 若无 `fileUrl` 或 `forcePreviewDownload=true`: `downloadPdf()`（前端 `html2pdf`）

主链路归属：
- **主链路(Docs->PDF)**: `main.gs + Reports.gs + PdfReports.gs + Data/engine/AuditTrail`
- **Web 漂亮预览(html2pdf)**: `WebApp.gs + BeautifulReportUI.html (+ index.html)`

---

## 5) 风险点清单（结合你点名项）

1. **双 `doGet` 冲突**
- 命中：`main.gs:5 doGet` 与 `WebApp.gs:192 doGet`
- 风险：Web 路由实际生效版本不确定，导致 `?view=beautiful` 行为飘忽。

2. **TEST/PROD 环境锁**
- `Data.gs` 中 `_getSheetByName` 在 `DATA_ENV=TEST` 时禁止访问 PROD 表名。
- 风险：硬编码访问 `Card_Assets/Card_Catalog/Promo_Catalog` 会直接抛错。

3. **固定单元格写入耦合（Reports 状态位）**
- 命中：`main.gs` / `WebApp.gs` 写 `B3/B4/B5/E1/E3`。
- 风险：模板改动或并发写入会出现“状态误导”或冲突。

4. **fallback 与主引擎并存**
- `WebApp.gs` 在大量 `safeRun_` 下默认 `ok=true`，即便走 fallback。
- 风险：出现“generated successfully 但 fileUrl 为空”的体验；若前端未正确处理 `forcePreviewDownload`，就会“成功但无下载”。

5. **引擎加载与作用域不稳定**
- `WebApp.gs` 通过 `HtmlService.createHtmlOutputFromFile + eval` 动态加载多个候选名。
- 风险：文件名/路径变化、加载顺序或语法异常时出现 `runStructureEngine/runLifecycleEngine is not defined`。

6. **Web 空白页风险**
- 当前虽有 `FALLBACK_REPORT_DATA` 与 `window.onerror`，但如果初始化脚本早期异常，仍可能白屏。

7. **近期变更追踪能力弱**
- 本地 `git log -n 20` 仅见 1 条提交（`8d5b12b`）。
- 风险：难以精确定位“哪次改动把链路打断”。

---

## 6) 当前推荐的集成策略（美化报表）

## 推荐策略（结论）
- **主路径**: 保持 Sheets 主链路 `Docs -> PDF`（`main.gs + Reports.gs + PdfReports.gs`）作为生产事实来源。
- **美化路径**: Web 端 `BeautifulReportUI.html` 仅做“在线预览 + 前端下载兜底”。
- **回滚路径**: 任意 Web 出错，始终可回到菜单按钮走主链路生成真实 Drive PDF。

## 落地建议（可执行）
1. 路由收敛
- 只保留一个 `doGet`（建议在 `WebApp.gs`），另一个重命名为 `doGetLegacy_`。
- 影响小，回滚简单（改回函数名）。

2. API 契约稳定化
- 固定返回字段：`ok/type/fileUrl/forcePreviewDownload/message/mockData`。
- 前端统一规则：`if(fileUrl&&!forcePreviewDownload) open; else downloadPdf();`
- 回滚：前端改回仅 `window.open(fileUrl)`。

3. 引擎依赖降耦
- Web 端仅调用“已验证可用”的一层接口（例如只调 `generatePdfForWeb_`），减少前端直面引擎异常。
- 失败时后端返回 `forcePreviewDownload=true + mockData`，保证可用性。
- 回滚：禁用 Web 生成按钮，仅保留“刷新预览 + 下载预览”。

---

## 附：关键字命中速查（原始命中摘要）

```text
doGet:
- main.gs:5
- WebApp.gs:192

onOpen:
- main.gs:9

generateFirstReport:
- main.gs:31
- Reports.gs:322 (runFirstReport)

generateMonthlyReport:
- main.gs:64
- Reports.gs:679 (runMonthlyReport)

generateFirstReportForWeb:
- WebApp.gs:264

generateMonthlyReportForWeb:
- WebApp.gs:283

generatePdfForWeb_:
- WebApp.gs:302

getBeautifulReportData:
- WebApp.gs:212

forcePreviewDownload:
- WebApp.gs:269, 288, 338, 349
- BeautifulReportUI.html:298, 331

fileUrl:
- WebApp.gs:337 等
- PdfReports.gs:34, 55
- main.gs:47, 48, 80, 81
- BeautifulReportUI.html:298, 331
```
