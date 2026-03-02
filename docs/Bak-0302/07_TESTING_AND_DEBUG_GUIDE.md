# 07_TESTING_AND_DEBUG_GUIDE
生成时间: 2026-02-28 09:41:58 -08:00  
Commit: `8d5b12b`

## 当前测试方式
- 手工功能测试（主）
  - Spreadsheet 菜单触发 `generateFirstReport/generateMonthlyReport`
  - Web 页触发 `index.html`/`BeautifulReportUI.html` 按钮
- 引擎自测（仅见一处）
  - `testMarketWindowFilter()`（`engine/marketEngine.gs:187`）
- 测试数据环境
  - `DECISION_CONFIG.DATA_ENV='TEST'` + `*_TEST` sheet（`decisionConfig.gs`, `Data.gs:19`）

## 复现 First 报表
1. 确认 `Card_Assets_TEST/Card_Catalog_TEST/Promo_Catalog_TEST` 有数据。
2. 执行 `generateFirstReport`（Beautiful）或 `generateFirstReportLegacy_`（Legacy PDF）。
3. 检查 `Reports!B3/B4/B5/E1/E3/H1` 状态与链接。

## 复现 Monthly 报表
1. 执行 `generateMonthlyReport` 或 `generateMonthlyReportLegacy_`。
2. 检查:
  - `Snapshots` 写入本月快照
  - `Monthly_Events` 写入事件
  - `Reports` 状态字段
3. 若 `DEV_MODE=true`，查看 `Monthly Health Report` 文本块输出（`Reports.gs:770`）。

## Debug 关键词
- `Reports!H2`: `DEBUG assetsSheet=... | activeCards=...`
- `Reports!H4`: `DEBUG Platinum fee asset=... catalog=... final=...`
- Logger:
  - `[DataEnv] ...`
  - `[TimeAnchor] ...`
  - `[Dedupe] ...`
  - `[FreshCheck] ...`
  - `DEBUG monthlyOutlook net=...`

## 常见故障排查
- 数据为空:
  - 检查 `DATA_ENV` 与测试表名映射是否一致（`Data.gs:getSheetName_`）
  - 检查 `getActiveCards` 过滤条件是否把卡都排除了（Status）
- `fee=0` 或 `catalog=0`:
  - `Normalize.gs` 中资产年费优先于 catalog；catalog字段别名是否匹配
- promotions=0:
  - 看 `filterActivePromos_` 的状态/起止日期过滤
  - 看 market freshness `promo_last_checked_at` 是否超 `MARKET_FRESH_DAYS`
- 输出错乱 / 重复提醒:
  - 查 `Monthly_Events` header 是否损坏（`ensureMonthlyEventsSheet` 会修复）
  - 查 dedupe key 与 `BLEEDING_MAX_EVENTS_PER_MONTH`
- PDF 异常:
  - 模板 ID、输出文件夹、共享权限错误会写 `Reports!B4` warning（`PdfReports.gs`）

