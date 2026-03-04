# 99 Questions for Owner

1. `Company_Profile` 计划承载哪些业务参数？当前代码未使用该表（`Data.gs:43-53`）。
2. `Card_Assets` 的标准列模板是否有官方版本？当前实现依赖多别名与模糊匹配。
3. `fee_due_month` 是否接受“开卡月+12”近似口径，还是要按真实账单/年费扣款日？
4. `Card_Catalog` 中 `Notes/catalog_updated_at/best_for_categories/annual_fee_current/product_type` 是否应进入规则？若应进入，优先级如何？
5. “Criteria 页 A-J 列表”是否在线上 Spreadsheet 模板而非代码库中？若是，需提供模板链接或字段定义。
6. `doGet` 依赖的 `index.html` 缺失是故意（纯菜单应用）还是遗漏？
7. 是否需要统一 `Calc.gs` 与 `Normalize.gs` 的消费区间映射口径（目前不一致）？
8. MarketWindow 在 First Report 中的期望文案是什么？当前逻辑与文案冲突。
