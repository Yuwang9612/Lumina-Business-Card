# 30 Data Layer (Field Flow)

## 结论

项目无独立 `submissionStore.js`。数据层由 `Data.gs + AuditTrail.gs` 承担，基于 Spreadsheet API 读写。

---

## 1) 读取函数（Read）

### `getProfile(ss)`
- 定位：`Data.gs:43-53`
- 输入：Spreadsheet
- 输出：`{ [key]: value }`
- 来源：`Company_Profile` A/B 两列。

### `getActiveCards(ss)`
- 定位：`Data.gs:58-102`
- 输入：Spreadsheet
- 输出：`Array<Object>`（每行转对象）
- 关键规则：
  - 仅保留活跃状态（排除 inactive/closed/cancel/no/否）
  - 字段名来自 header，兼容中英文别名
- 涉及字段：`Card Name`, `Status`, `Current Annual Spend (Range)`, `assets_last_confirmed` 等。

### `getCatalogMap(ss)`
- 定位：`Data.gs:107-159`
- 输出：`{ [cardName]: catalogRecord }`
- 记录字段见 `keyNames`（`Data.gs:116`）。

### `findCatalogRecord(catalogMap, cardName)`
- 定位：`Data.gs:164-174`
- 输出：大小写不敏感匹配记录。

### `getCatalogAll(ss)`
- 定位：`Data.gs:179-182`
- 输出：原始二维数组（含表头）。

### `loadPreviousSnapshots(ss, month)`
- 定位：`AuditTrail.gs:85-121`
- 输出：上个月 `card_id -> snapshot` map。

### `loadEventsForMonth(ss, month)`
- 定位：`AuditTrail.gs:186-228`
- 输出：目标月事件数组。

### `loadEventHistory(ss, eventKey, currentMonth)`
- 定位：`AuditTrail.gs:352-378`
- 输出：历史同 `event_key` 事件。

---

## 2) 写入函数（Write）

### `writeSnapshots(ss, month, snapshots)`
- 定位：`AuditTrail.gs:230-265`
- 先删后写：`deleteSnapshotsForMonth`（`AuditTrail.gs:123-141`）
- 写入表：`Snapshots`
- 写入列：完全匹配 `SNAPSHOTS_HEADERS`。

### `writeMonthlyEvents(ss, month, events)`
- 定位：`AuditTrail.gs:267-298`
- 先删后写：`deleteEventsForMonth`（`AuditTrail.gs:155-180`）
- 去重：`month|event_key`（`AuditTrail.gs:276-278`）
- 写入表：`Monthly_Events`

### `confirmNoChange()`（增量写）
- 定位：`main.gs:93-133`
- 写入表：`Card_Assets`
- 写入字段：`assets_last_confirmed`（若缺列先建列头）。

---

## 3) 生成函数（Transform）

### `normalizeCards_(cards, catalogMap)`
- 定位：`Normalize.gs:91-167`
- 输入：`Card_Assets` 行对象 + catalog
- 输出：标准卡对象：
  - `cardName, annualFee, annualSpendValue, baseReturn, downgradeOption, bonusLevel, typicalBonusValue, issuer, openedDate, monthsSinceOpened, bonusCollected, assignedCategory, status, assetsLastConfirmed`

### `generateSnapshots(cards, cardsNormalized, structureResults, lifecycleResults)`
- 定位：`AuditTrail.gs:300-350`
- 输出：可落表 Snapshot 对象。

### `generateEvents(...)`
- 定位：`AuditTrail.gs:405-670`
- 输出：可落表 Event 对象。

---

## 4) 字段来源分类：系统生成 vs 前端/人工输入

## 4.1 系统生成字段
- `Snapshots`: `month, card_id, est_value, net, is_*, lifecycle_stage, fee_due_month, created_at`
- `Monthly_Events`: 全字段均由系统规则生成（除 `card_name` 源自输入维表）
- `Card_Assets.assets_last_confirmed`（通过菜单动作系统写入）

## 4.2 人工输入字段（来自 Sheet）
- `Card_Assets`: `Card Name`, `Status`, `Current Annual Spend (Range)`, `Opened*`, `Bonus Collected*`, `Annual Fee`, `Assigned Category`
- `Card_Catalog`: 套件参数字段（年费/回报率/奖励等级/更新时间等）

---

## 5) “SQL 语句”情况

- 本项目无 SQL/query-builder；使用 SpreadsheetApp 的 `getRange().getValues()/setValues()`。
- 等价 CRUD 调用分布：
  - C/U：`setValues`, `setValue`, `insertSheet`, `deleteRow`
  - R：`getDataRange().getValues()`, `getRange().getValues()`
