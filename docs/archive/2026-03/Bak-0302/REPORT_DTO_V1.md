# REPORT_DTO_V1
生成时间: 2026-02-28 09:41:58 -08:00  
Commit: `8d5b12b`

## Schema
```ts
type ReportDTOv1 = {
  client_name: string;                    // required
  report_type: "FIRST" | "MONTHLY";      // required
  tagline: string;                        // required
  generated_at: string;                   // required, ISO string
  kpis: {                                 // required
    recurring_net: number;                // required
    recurring_fees: number;               // required
    recurring_value: number;              // required
    optimized_net?: number;               // optional
    unlock?: number;                      // optional
  };
  actions: Array<{                        // required (can be empty)
    card_name: string;                    // required
    issue_type: string;                   // required
    title: string;                        // required
    status: string;                       // required
    action: string;                       // required
    impact_usd: number;                   // required
    priority: number;                     // required
  }>;
  promotions: Array<{                     // required (can be empty)
    promo_id?: string;
    promo_headline?: string;
    bonus_value_est_usd?: number;
    promo_end_date?: string;
    affiliate_url?: string;
    card_name?: string;
    issuer?: string;
  }>;
  portfolio: {                            // required
    cards: Array<{                        // required (can be empty)
      card_id?: string;
      card_name: string;
      annual_fee: number;
      est_value: number;
      net: number;
      status?: string;
      lifecycle_stage?: string;
      is_bleeding?: boolean;
      is_prebonus?: boolean;
      fee_due_month?: string;
    }>;
    totals: {                             // required
      annual_fees: number;
      value: number;
      net: number;
    };
  };
}
```

## Field Mapping Notes
- `kpis.recurring_*`:
  - FIRST: `firstModel.keyNumbers.currentNet/currentFees/currentValue`
  - MONTHLY: `monthlyModel.monthlyOutlook.net/fees/value`（fallback `portfolioSummary`）
- `kpis.optimized_net/unlock`:
  - `optimized_net`: `keyNumbers.optimizedNet` or `portfolioSummary.optimizedNet`
  - `unlock`: `optimized_net - recurring_net`（或原 `delta`）
- `actions`:
  - FIRST: `focusItems`（fallback `items/priorityActions`）
  - MONTHLY: `items`（fallback `actions/focusItems`）
  - `priority` 按当前顺序 `1..N`，不改变原有排序来源
- `promotions`:
  - 来自 `promotions` 或 `topPromos`，按字段映射，不改过滤逻辑
- `portfolio.cards`:
  - 优先使用模型中的 `structureResults/lifecycleResults/cardsNormalized/snapshots` 组装
  - 只做映射，不做新计算逻辑
- `portfolio.totals`:
  - 与当前 `portfolioSummary/currentMetrics/monthlyOutlook` 对齐

## Example JSON - FIRST
```json
{
  "client_name": "Lumina Logic LLC",
  "report_type": "FIRST",
  "tagline": "Protecting your profits. Powering your business.",
  "generated_at": "2026-02-28T17:41:58.000Z",
  "kpis": {
    "recurring_net": -12800,
    "recurring_fees": 2200,
    "recurring_value": 9400,
    "optimized_net": 4600,
    "unlock": 17400
  },
  "actions": [
    {
      "card_name": "Chase Ink Preferred",
      "issue_type": "BLEEDING",
      "title": "This card is losing money",
      "status": "Estimated annual loss is about $6,200 based on current inputs.",
      "action": "Cancel or replace before the annual fee posts.",
      "impact_usd": 6200,
      "priority": 1
    }
  ],
  "promotions": [],
  "portfolio": {
    "cards": [],
    "totals": {
      "annual_fees": 2200,
      "value": 9400,
      "net": -12800
    }
  }
}
```

## Example JSON - MONTHLY
```json
{
  "client_name": "Lumina Logic LLC",
  "report_type": "MONTHLY",
  "tagline": "Protecting your profits. Powering your business.",
  "generated_at": "2026-02-28T17:41:58.000Z",
  "kpis": {
    "recurring_net": -9300,
    "recurring_fees": 2600,
    "recurring_value": 16700,
    "optimized_net": 5100,
    "unlock": 14400
  },
  "actions": [
    {
      "card_name": "Ink Cash",
      "issue_type": "bleeding",
      "title": "This card is losing money",
      "status": "Estimated annual loss is about $4,300 based on current inputs.",
      "action": "Cancel or replace before the annual fee posts.",
      "impact_usd": 4300,
      "priority": 1
    }
  ],
  "promotions": [],
  "portfolio": {
    "cards": [],
    "totals": {
      "annual_fees": 2600,
      "value": 16700,
      "net": -9300
    }
  }
}
```

## 验收自测（执行清单）
1. 打开 `?view=beautiful&type=FIRST&autorun=1`，应可渲染 KPI / Actions / Portfolio Table（Promotions 可为空）。
2. 打开 `?view=beautiful&type=MONTHLY&autorun=1`，应可渲染 KPI / Actions / Portfolio Table（Promotions 可为空）。
3. Console 不应出现渲染异常；Apps Script 日志不应出现被吞掉的致命错误。
4. 对比改造前后 `net/fees/value`：数值应一致（仅字段映射变化，不改口径）。

本次提交状态:
- 已完成代码侧映射改造与前端字段切换。
- 已完成静态检查（函数引用、字段命名、调用链）。
- 未在真实 WebApp 部署 URL 上执行在线点击验收（需在 GAS 运行环境执行上述 1-4）。
