# 08_GAPS_AND_RECOMMENDATIONS
生成时间: 2026-02-28 09:41:58 -08:00  
Commit: `8d5b12b`

## 现状差距（基于代码）
- 双实现并存:
  - Beautiful 链路（Web DTO + 前端渲染）
  - Legacy 链路（Docs 渲染）
  - 风险: 字段口径漂移、改一处漏另一处
- 计算重复:
  - `Calc.gs` 与 `engine/* + Reports.gs` 都在算 net/fee/value
- fallback 过重:
  - `WebApp.gs` 大量 stub + `safeRun_`，错误可能被吞掉
- 资产环境默认 TEST:
  - 生产误配风险（`decisionConfig.gs:DATA_ENV='TEST'`）

## “报表不够漂亮”根因（按代码）
- 模板层面: Beautiful 与 Legacy 各自独立，视觉系统不统一（`BeautifulReportUI.html` vs `PdfReports.gs:REPORT_V3_STYLE`）。
- 数据模型层面: DTO 与 monthly/first 原模型字段映射松散（`WebApp.gs:adapt*ModelToBeautifulDTO_`）。
- section map 层面: 相同语义 section 在不同渲染器命名不同（focusItems/items/actions）。
- 渲染器限制: Legacy 受 Google Docs 样式能力限制，Beautiful 依赖浏览器 html2pdf。

## 1-3天 Vertical Slices（最小改动）
1. 建统一 Report DTO（First/Monthly共用字段），仅在 `Reports.gs` 生成一次；Beautiful 与 Legacy都消费它。
2. 把 `Calc.gs` 标注为 legacy 并停止主链调用，避免口径双轨。
3. 收敛 `WebApp.gs` fallback：保留最小 mock，仅在明确 debug flag 下启用。
4. 为 `Monthly_Events` 增加 event_type 枚举校验，写前过滤未知类型。
5. 把模板与样式 token 抽到单一配置（颜色/标题/文案 key），先覆盖 Header/KPI/Actions 三块。

## 风险点
- 改 item 字段可能破坏 `PdfReports.gs:appendPriorityActions_` 与前端 `actionCardHtml`。
- 改 event_type 可能影响 dedupe/cooldown 历史行为（`AuditTrail.gs`）。
- 改 Legacy 输出结构会影响当前客户依赖的 Drive 文件命名与链接写回（`build*FileName_`, `Reports!B5/H1`）。

## 口径不一致/重复实现/遗留链路清单
- 不一致: `Watch` 阈值使用 `BLEEDING_MIN_LOSS`（语义偏差）。
- 重复实现: `Calc.gs` 与 engine 主链。
- 遗留链路: `doGetLegacy_`, `index.html` 与 Beautiful 路由并存。
- Feature flag:
  - `DATA_ENV`, `DEV_MODE`, `PROMO_DEBUG`, `DATA_DEBUG`, `DEDUPE_DEBUG`, `TIME_ANCHOR_DEBUG`
- 测试表:
  - `Card_Assets_TEST`, `Card_Catalog_TEST`, `Promo_Catalog_TEST`

