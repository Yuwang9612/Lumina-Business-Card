# 12 DB vs Code Mismatch

## 结论

由于本项目无 SQL DB / migration，本文件改为 **Sheet Schema vs Code 预期字段** 差异。

## 差异清单

1. `index` 前端入口缺失（运行层面）
- 代码预期：`main.gs:6` 调用 `createHtmlOutputFromFile('index')`
- 仓库实际：未发现 `index.html`
- 影响：Web App `doGet` 可能运行时报错。

2. `Card_Assets` 的 `assets_last_confirmed` 字段可能不存在
- 代码预期：`Normalize.gs:140-147`、`AuditTrail.gs:424-440` 读取该字段
- 运行补偿：`main.gs:115-119` 会在执行 `confirmNoChange` 时自动补列
- 影响：若未手动点该菜单，可能长期触发 `DataStale`。

3. `Status` 字段命名不稳定（多语言/模糊匹配）
- 代码兼容：`Status` / `状态` / header 包含 status（`Data.gs:66-71`, `main.gs:108-114`）
- 风险：拼写偏差会导致活跃卡筛选失效。

4. 消费区间映射存在两套口径
- `Calc.gs` 使用 `SPEND_MAP`（`Calc.gs:6-12`）
- `Normalize.gs` 使用 `SPEND_RANGE_MAP`（`Normalize.gs:6-17`）
- 例如 `$10k-$30k` 在两处映射值不同（10000 vs 20000）
- 影响：Alerts 与结构引擎输出可能不一致。

5. 报告中 MarketWindow 文案与逻辑不一致
- `writeReportFirst_` 对 `MARKET_WINDOW` 分支直接 `continue`（`Reports.gs:162-163`）
- 后续却在 `hasAnyMarketCandidates=true` 时写“暂无高确定性新增卡建议”（`Reports.gs:190-194`）
- 影响：存在机会信号时文案语义反向。

6. `Company_Profile` 已读取但未进入核心决策链
- 读取函数：`Data.gs:43-53`
- 报告链路中无调用。
- 影响：可能是未完成功能或冗余。

7. `Card_Catalog` 多字段未被消费
- 未见代码使用：`Notes`, `catalog_updated_at`, `best_for_categories`, `annual_fee_current`, `product_type`
- 定义于 `Data.gs:116-127`
- 影响：字段价值未体现，可能与产品设计脱节。
