# Lumina Credit Reward — Frozen Spec v1.0 (System Final)
Last Updated: 2026-03-02

## Scope
- This is the implementation baseline for thresholds, event semantics, lifecycle, and reporting consistency.
- New versions may extend behavior, but v1.0 semantics are frozen.

## Canonical Event Types
- `Bleeding`, `PreBonus`, `FeeDue`, `DataStale`, `DataAnomaly`, `MarketWindow`
- Input aliases are allowed (`annual_fee_due`, `feedue`) but must normalize to `FeeDue` before output/render.

## Staleness Semantics
- `MARKET_FRESH_DAYS` is the only threshold for market-offer freshness/staleness.
- `STALE_DAYS` is only for customer data staleness (`DataStale`).

## Reporting Hard Rules
- Never output placeholder action text.
- Never show `$0 impact`; for non-positive impact use `Potential upside` or omit the amount.
- USD negatives must use `-$400` format.

## Optimized/Adjusted Net v1.0 Range Statement
- In v1.0, `optimized_net` / `adjusted_net` is a conservative heuristic based on top-bleeding fee-save estimation (`topBleeding savedFee`), not a full multi-action scenario aggregator.
- A full actions-based scenario estimator is explicitly deferred to v1.1+.
