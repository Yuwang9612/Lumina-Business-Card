# 90 Gaps and Risks

## 高优先级

1. Web 入口文件缺失
- 定位：`main.gs:6`
- 问题：调用 `index`，仓库无 `index.html`。
- 风险：Web App 无法通过 `doGet` 正常返回页面。
- 建议：补齐 `index.html` 或改为存在的 Html 文件名。

2. 消费区间映射口径不一致
- 定位：`Calc.gs:6-12` vs `Normalize.gs:6-17`
- 问题：同类区间映射值不同，导致 Alerts 与结构层估值不一致。
- 风险：同一张卡在不同报告中的净值/亏损不一致。
- 建议：统一到单一 mapping 常量并复用。

3. First Report 中 MarketWindow 文案反向
- 定位：`Reports.gs:162-163`, `Reports.gs:190-194`
- 问题：有市场机会时却输出“暂无高确定性新增卡建议”。
- 风险：误导业务决策。
- 建议：修正文案条件或渲染逻辑。

## 中优先级

4. `assets_last_confirmed` 依赖手工按钮补全
- 定位：`main.gs:115-119`, `AuditTrail.gs:398-403`
- 风险：未点击“Confirm No Change”时长期触发 DataStale 噪音。
- 建议：月报流程中自动回填或首次运行自动补列。

5. `Company_Profile` 存在但未进入主链
- 定位：`Data.gs:43-53`
- 风险：配置表形同虚设，维护成本增加。
- 建议：确认是否要接入参数化，否则标记弃用。

6. `Card_Catalog` 多字段未消费
- 定位：`Data.gs:116-127`
- 风险：字段定义与实现脱节，易造成“以为生效、实际未生效”。
- 建议：建立字段状态表（active/deprecated/planned）。

7. `inferFeeDueMonth` 规则简化
- 定位：`AuditTrail.gs:69-83`
- 问题：直接“opened + 12个月”，不处理实际账单日/首年豁免等复杂情况。
- 风险：FeeDue 提醒时间偏差。
- 建议：接入真实 fee posting 日期字段。

## 低优先级

8. 头字段容错依赖模糊匹配
- 定位：`Data.gs:66-71`, `73-79`, `117-127`
- 风险：轻微拼写差异即触发 silent fallback。
- 建议：增加 header 校验与告警。

9. 部分测试函数/变量未用于生产链路
- 定位：`engine/marketEngine.gs:145-198`（`testMarketWindowFilter`）
- 风险：误以为覆盖了自动测试。
- 建议：显式纳入 CI（若后续引入）或迁移到 test 文档。
