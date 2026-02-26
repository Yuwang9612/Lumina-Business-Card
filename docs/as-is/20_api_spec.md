# 20 API Spec (AS-IS)

## 结论

本仓库无 HTTP REST API（无 `server.js/routes/controllers`）。
“接口”是 Google Apps Script 可执行函数（菜单动作 + Web App `doGet`）。

---

## 1) Web App 接口

### 1.1 `doGet(e)`
- 定位：`main.gs:5-7`
- 类型：HTTP GET (GAS Web App)
- 入参：
  - `e` (GAS event object)；当前未使用。
- 出参：
  - `HtmlOutput`，来源文件名 `index`。
- 异常：
  - 若 `index.html` 不存在，运行时报错（仓库现状缺失）。
- 读写数据：无直接数据读写。

---

## 2) 菜单动作接口（非HTTP）

### 2.1 `generateFirstReport()`
- 定位：`main.gs:20-43`
- 入参：无
- 出参：无返回值（side effect 写 Sheet）
- 状态写入：`Reports!B3/B4/B5/E1/E3`
- 调用链：
  1. `runFirstReport(ss)` (`Reports.gs:57-78`)
  2. `getActiveCards` -> `Card_Assets`
  3. `getCatalogMap/getCatalogAll` -> `Card_Catalog`
  4. `normalizeCards_` -> `runStructureEngine` -> `runLifecycleEngine` -> `runMarketEngine` -> `computePortfolioSummary` -> `runOrchestrator`
  5. `writeReportFirst_` 写 `Reports`
  6. `computeAlertsRows` + `writeAlertsTable`
- 错误处理：`try/catch`，`Reports!B3=ERROR`，`B4=message`。

### 2.2 `generateMonthlyReport()`
- 定位：`main.gs:46-67`
- 入参：无
- 出参：无（写 Sheet）
- 调用链：`runMonthlyReport`（`Reports.gs:370-400`）
  - 与 First 共用前置引擎
  - 额外：`generateSnapshots`, `loadPreviousSnapshotsArray`, `generateEvents`, `writeSnapshots`, `writeMonthlyEvents`
  - 输出页：`Monthly Health Report`
- 错误处理：同上（`B3/B4`）。

### 2.3 `runAlertsCheck()`（main）
- 定位：`main.gs:69-91`
- 入参：无
- 出参：无
- 调用链：`runAlertsReport(ss)` -> `Reports.gs:408-410` -> `Reports.gs:412-422`
- 输出：刷新 `Reports` Alerts 区。

### 2.4 `confirmNoChange()`
- 定位：`main.gs:93-133`
- 入参：无
- 出参：无（UI alert）
- 逻辑：
  - 扫描 `Card_Assets` 活跃行
  - 将 `assets_last_confirmed` 置为当前时间
  - 若列缺失则自动新增列头
- 错误处理：缺 Sheet 或无数据时 `SpreadsheetApp.getUi().alert`。

---

## 3) 事件“响应结构”规范（Monthly_Events）

尽管非 HTTP 返回，`generateEvents` 形成统一事件对象，可视为系统内部 API payload：`AuditTrail.gs:405-670`。

### 3.1 通用字段
- `card_id` string
- `card_name` string
- `event_type` enum
- `severity` enum
- `event_key` string
- `current_value_json` string(JSON)
- `prev_value_json` string(JSON|null)
- `message_key` string

### 3.2 event_type -> current_value_json
1. `DataStale`：`days_stale`, `assets_last_confirmed` (`AuditTrail.gs:434-437`)
2. `Bleeding/PreBonus/FeeDue`：复用 `currentJson`，含 `est_value/net/annual_fee/is_* /spend_range/fee_due_month` (`AuditTrail.gs:442-453`)
3. `DataAnomaly`：`changed_fields[]` + `current` (`AuditTrail.gs:599-605`)
4. `MarketWindow`：`bonus_level/typical_bonus_value/bonus_last_updated/bonus_valid_until/has_low_confidence/is_stale` (`AuditTrail.gs:654-661`)

---

## 4) 错误码/状态码

- HTTP 状态码：未显式定义（GAS 默认处理）。
- 任务状态字段：`Reports!B3` 使用枚举 `RUNNING/DONE/ERROR`（`main.gs:25,31,38` 等）。

---

## 5) 接口读写表字段索引

1. `generateFirstReport`
- 读：`Card_Assets` (`Card Name/Status/Spend/assets_last_confirmed`)
- 读：`Card_Catalog` (`Annual Fee/Base Return/Bonus Level/Downgrade...`)
- 写：`Reports` 指定范围

2. `generateMonthlyReport`
- 读：`Card_Assets`, `Card_Catalog`, `Snapshots(上月)`, `Monthly_Events(历史)`
- 写：`Snapshots` 全字段、`Monthly_Events` 全字段、`Monthly Health Report`

3. `runAlertsCheck`
- 读：`Card_Assets`, `Card_Catalog`
- 写：`Reports` Alerts区

4. `confirmNoChange`
- 读：`Card_Assets` 全行头
- 写：`Card_Assets.assets_last_confirmed`
