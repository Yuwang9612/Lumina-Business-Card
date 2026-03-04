# 00 Project Overview (AS-IS)

## 1) 仓库结构快照（关键目录）

```text
.
├─ engine/
│  ├─ structureEngine.gs
│  ├─ lifecycleEngine.gs
│  ├─ marketEngine.gs
│  └─ orchestrator.gs
├─ AuditTrail.gs
├─ Calc.gs
├─ Data.gs
├─ Normalize.gs
├─ Reports.gs
├─ main.gs
├─ decisionConfig.gs
├─ README.md
├─ appsscript.json
├─ .clasp.json
├─ ai.js / calc.js / catalog.js / format.js (占位模块)
└─ docs/as-is/ (本次产物)
```

来源：`README.md`、`appsscript.json`、`.clasp.json`、`main.gs`、`Data.gs`。

## 2) 系统形态判断

- 当前仓库是 **Google Apps Script（GAS）项目**，不是 Node/Express + SQLite Web 服务。
- 执行入口是 GAS 菜单函数与 Web App `doGet`，数据存储是 Google Spreadsheet 的多个 Sheet，而非本地数据库。

证据：
- `appsscript.json:1-6`（GAS manifest）
- `main.gs:5-7`（`doGet`）
- `main.gs:9-18`（`onOpen` 菜单）
- `Data.gs:6-12`（Sheet 常量）

## 3) 前端入口 / 后端入口 / DB位置 / 配置文件

### 3.1 前端入口
- Web App 入口：`main.gs:5-7` -> `HtmlService.createHtmlOutputFromFile('index')`
- 但仓库中未找到 `index.html`，属于缺失资源（见风险文档）。

### 3.2 后端入口（GAS 服务函数）
- 菜单挂载：`main.gs:9-18`
- 报告任务入口：
  - First report: `main.gs:20-43`
  - Monthly report: `main.gs:46-67`
  - Alerts check: `main.gs:69-91`
  - Confirm no change: `main.gs:93-133`

### 3.3 DB 文件位置
- **未发现 SQLite / MySQL / Postgres 文件或连接配置**。
- 实际“数据层”是 Spreadsheet Sheet：
  - `Company_Profile`, `Card_Assets`, `Card_Catalog`, `Reports`, `Snapshots`, `Monthly_Events`, `Monthly Health Report`（`Data.gs:6-12`）。

### 3.4 配置文件
- `appsscript.json`（时区、运行时等）：`appsscript.json:1-6`
- `.clasp.json`（scriptId、本地同步配置）：`.clasp.json:1-14`
- 无 `.env` / `.env.example`。

## 4) 本地启动/部署方式、端口、依赖

### 4.1 README 声明流程
- 通过 `clasp push` 同步到 GAS：`README.md` 部署步骤第 2 点。
- GAS Web 应用部署：`README.md` 部署步骤第 4 点。

### 4.2 端口
- 无本地 HTTP server 端口定义；运行于 Google Apps Script 平台。

### 4.3 依赖
- `appsscript.json:2-3` dependencies 为空。
- 无 `package.json`，无 npm 依赖。

## 5) 运行时产出页面/表

- 报告主要写入：`Reports` Sheet（`Reports.gs:57-78`、`Reports.gs:412-452`）
- 月报独立页：`Monthly Health Report` Sheet（`Reports.gs:357-400`）
- 审计快照：`Snapshots` Sheet（`AuditTrail.gs:11-20`, `AuditTrail.gs:230-265`）
- 月度事件：`Monthly_Events` Sheet（`AuditTrail.gs:22-42`, `AuditTrail.gs:267-298`）
