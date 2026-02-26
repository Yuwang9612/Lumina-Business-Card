# 40 Frontend Mapping (Page -> Field -> API -> DB)

## 结论

- 仓库中未发现 `public/admin.html` / `admin.js` / `admin.css` 或其他静态前端页面。
- 当前“前端”实际为 Google Spreadsheet UI：菜单 + 多个 Sheet Tab。
- 另有 Web App `index` 入口声明，但 `index.html` 文件缺失。

证据：`main.gs:5-7`, `main.gs:9-18`。

---

## 1) UI 面板与动作映射

## 1.1 菜单：Card Profit Watch

来源：`main.gs:9-18`

1. `Generate First Wake-up Report`
- 触发函数：`generateFirstReport` (`main.gs:20`)
- 调用链：`runFirstReport` (`Reports.gs:57`)
- 写入：`Reports` Sheet A区 + C区。

2. `Generate Monthly Health Report`
- 触发函数：`generateMonthlyReport` (`main.gs:46`)
- 调用链：`runMonthlyReport` (`Reports.gs:370`)
- 写入：`Monthly Health Report`、`Snapshots`、`Monthly_Events`。

3. `Run Alerts Check`
- 触发函数：`runAlertsCheck` (`main.gs:69`)
- 调用链：`runAlertsReport -> runAlertsCheck` (`Reports.gs:408-422`)
- 写入：`Reports` C区。

4. `Confirm No Change (All Active Cards)`
- 触发函数：`confirmNoChange` (`main.gs:93`)
- 写入：`Card_Assets.assets_last_confirmed`。

---

## 2) “页面字段”映射（Sheet视角）

## 2.1 Tab: Card_Assets（输入页）

| UI字段（列） | 消费函数 | 进入中间字段 | 最终落地 |
|---|---|---|---|
| Card Name | `getActiveCards` | `cardName` | `Snapshots.card_name/card_id`, 报告文案 |
| Status | `getActiveCards` | 活跃过滤条件 | 影响是否进入全链路 |
| Current Annual Spend (Range) | `normalizeCards_` | `annualSpendValue` | `est_value/net`、Alerts |
| Opened (YYYY-MM) | `normalizeCards_` | `openedDate/monthsSinceOpened` | `lifecycle_stage`, `fee_due_month` |
| Bonus Collected? | `normalizeCards_` | `bonusCollected` | `is_prebonus` / `PreBonus` 事件 |
| Annual Fee | `normalizeCards_` | `annualFee`（优先资产表） | `net`, `Bleeding` |
| Assigned Category | `normalizeCards_` | `assignedCategory` | `Snapshots.assigned_category` |
| assets_last_confirmed | `normalizeCards_` | `assetsLastConfirmed` | `DataStale` 事件判断 |

## 2.2 Tab: Card_Catalog（参数页）

| UI字段（列） | 消费函数 | 进入中间字段 | 作用 |
|---|---|---|---|
| Annual Fee (USD) | `normalizeCards_`/`computeAlertsRows` | `annualFee` | 年费成本 |
| Base Return (Conservative) | 同上 | `baseReturn` | 回报估值 |
| Downgrade Option | 同上 | `downgradeOption` | 行动建议 |
| Bonus Level | `runMarketEngine` | `bonusLevel` | 市场机会筛选 |
| bonus_last_updated | `runMarketEngine` | `daysOld` | 新鲜度筛选 |
| bonus_valid_until | `runMarketEngine` | `isValid` | 机会有效性标识 |
| data_confidence | `generateEvents` | suppress判断 | 过期机会抑制 |

## 2.3 Tab: Reports（展示页）

- A区 First Wake-up：`Reports.gs:80-218`
- C区 Alerts Table：`Reports.gs:424-452`
- 状态位：`B3/B4/B5/E1/E3`（`main.gs`）。

## 2.4 Tab: Monthly Health Report（展示页）

- 标题：`Reports.gs:387`
- 内容：`renderMonthlyV1` 结果写入 2 行起 8 列（`Reports.gs:389-394`）。

## 2.5 Tab: Snapshots / Monthly_Events（系统日志页）

- 系统自动创建和更新，不直接面向终端用户。

---

## 3) 关键交互映射

1. 点击“Generate Monthly Health Report”
- UI -> `generateMonthlyReport`
- 读：Assets + Catalog + 上月快照/历史事件
- 算：normalize -> structure/lifecycle/market -> snapshot/event
- 写：`Snapshots`、`Monthly_Events`、`Monthly Health Report`

2. 点击“Run Alerts Check”
- UI -> `runAlertsCheck`
- 算：`computeAlertsRows`
- 写：`Reports` C区

3. 点击“Confirm No Change”
- UI -> `confirmNoChange`
- 写：`assets_last_confirmed=now`（仅 active cards）

---

## 4) 特别关注项

## 4.1 “审核标准（Criteria）页”A-J 列表与下方 Tabs

- 仓库中未发现名为 Criteria 的页面、HTML、或 A-J 结构代码。
- 可能是线上表格模板中的视觉区块，不在本仓库源代码内。
- 当前可确认的规则来源是 `DECISION_CONFIG`（`decisionConfig.gs:6-28`）与各引擎函数。

## 4.2 “Monthly Health Report” Tab 数据计算来源

- 数据源：
  - 卡片输入：`Card_Assets`
  - 参数输入：`Card_Catalog`
  - 本月事件：`generateEvents`
  - 组合净值：`computePortfolioSummary`
- 展示字段：
  - Block A：结论（事件数量+摘要）
  - Block B：Top5 事项（title/status/action）
  - Block C：组合净收益一句话
  - Block D：复查机制说明
- 代码：`Reports.gs:274-355`, `Reports.gs:370-394`
