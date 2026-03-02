# Lumina Credit Reward  
# System Single Source of Truth (SSoT)

**Version:** v1.0 (Frozen Baseline)  
**Effective Date:** 2026-03-02  
**Status:** Authoritative and Binding

---

## Authority Statement

This document is the single authoritative specification for the Lumina Credit Reward system.

All business logic, financial calculations, lifecycle rules, event normalization, thresholds, and reporting constraints must follow this file.

If any implementation behavior conflicts with this document, the implementation must be updated to conform to this specification.

No rule may be silently modified in engine, DTO, UI, or templates without updating this document first.

---

## Change Discipline

This document defines the frozen baseline for v1.0.

Changes require:

1. Explicit version increment.
2. Clear description of the rule being modified.
3. Synchronized update across:
   - Engine
   - Reports
   - DTO
   - UI
   - PDF
   - Email body
   - Templates

Untracked rule drift is not permitted.

---

## Version History

### v1.0 — 2026-03-02
- Established frozen baseline.
- Finalized financial calculation semantics.
- Canonical event types unified (FeeDue).
- Market freshness separated from data staleness.
- Removed "$0 impact" output.
- Prohibited technical placeholder language.
- Clarified adjusted_net v1.0 scope (top-bleeding heuristic).
- Defined lifecycle rule with PREBONUS_MONTH_LIMIT.
- Introduced opened_month missing-data safeguard (no PreBonus on null).

### v1.0.1 — 2026-03-02
- Clarified FIRST scenario comparison math closure:
  Spend Rewards (Act) must satisfy: spend_rewards_act = recurring_net_act + annual_fee_act.
- Clarified Unlock Bonus in scenario comparison may include:
  (1) achievable in-progress bonuses on existing cards, and
  (2) welcome bonuses from recommended new offers (if any).
- Report templates must read scenario_comparison from DTO; UI must not derive or guess scenario deltas.

### v1.0.2 — 2026-03-02
- Introduced single new-card constraint per 12-month horizon (default max_new_cards_per_12m = 1).
- Clarified that Scenario “Unlock Bonus (One-Time)” must only include:
  (1) achievable in-progress bonuses on existing cards, and
  (2) the bonus from a single “Recommended Now” new offer (if any).
- Best Offers may list multiple candidates (Top N), but only one may be designated as “Recommended Now”; others must be marked as Watchlist/Alternatives.
- Ensured that both comparison tables (Improvement Potential and Do Nothing vs Act) must render from the same scenario_comparison DTO source.

---

## Scope Boundary

This SSoT governs:

- Financial calculation semantics
- Health classification
- Lifecycle rules
- Event canonicalization
- Cooldown and retrigger logic
- Market freshness logic
- Reporting output hard rules
- Naming conventions
- DTO baseline contract

Report layout structure is governed separately by:

- docs/templates/FIRST_TEMPLATE.md
- docs/templates/MONTHLY_TEMPLATE.md

Templates may define structure and presentation order but must not redefine calculation semantics or thresholds.

---

## 1. Governance & Authority

This document is the **only authoritative specification** of the Lumina Credit Reward system.

All business logic, constants, terminology, lifecycle rules, event behavior, calculation formulas, and reporting constraints must follow this file.

If any rule changes:

1. Update this file first.
2. Then align engine, DTO, UI, PDF, templates.
3. Do not silently modify frozen semantics.

New capabilities may extend the system.  
Frozen definitions may not be modified without version increment.

---

## 2. Frozen System Constants (v1.0)

```text
REALIZABLE_DELTA_MIN = 200
BLEEDING_MIN_LOSS = 100
BLEEDING_RETRIGGER_DELTA = 50
STALE_DAYS = 45
MARKET_FRESH_DAYS = 120
PREBONUS_MONTH_LIMIT = 3
FEE_REMINDER_DAYS = [45, 30, 15]
```

`COOLDOWN_DAYS` must be configured per event type:

- Bleeding  
- PreBonus  
- FeeDue  
- MarketWindow  
- DataStale  
- DataAnomaly  

These values are frozen for v1.0.

---

## 3. Core Financial Calculations (Frozen)

### 3.1 Recurring Value

```text
est_value = spend × base_return (conservative)
```

- `base_return` must use conservative baseline rate.
- `spend` is projected annualized spend.
- Recurring calculations must exclude one-time bonuses.

---

### 3.2 Net Value (Recurring Only)

```text
net = est_value - annual_fee
```

- Recurring net must never include one-time bonuses.

---

### 3.3 Portfolio Level Metrics

```text
current_net = Σ(card.net) for active cards
adjusted_net = optimized portfolio net (v1.0 scope defined below)
realizable_delta = adjusted_net - current_net
```

---

## 4. Adjusted / Optimized Net Scope (v1.0 Clarification)

In v1.0:

Adjusted / Optimized Net is a **conservative structural estimate**, currently implemented using a top-bleeding saved-fee heuristic.

It does NOT aggregate all recommended actions.

Future versions (v1.1+) may implement full action aggregation.

This clarification prevents semantic conflict between specification and implementation.

---

## 5. Card Health Classification (Frozen)

### Bleeding

```text
net < 0
```

Action eligibility requires:

```text
abs(net) >= BLEEDING_MIN_LOSS
```

---

### Watch

```text
0 ≤ net < BLEEDING_MIN_LOSS
```

---

### Efficient

```text
net ≥ BLEEDING_MIN_LOSS
```

---

## 6. Lifecycle Classification (Frozen)

Lifecycle must be one of:

- PreBonus  
- FirstYear  
- LongTerm  

### PreBonus Requirements

A card qualifies as **PreBonus** only if:

- Card is active  
- Bonus not collected  
- Bonus in progress  
- `months_since_opened` is not null  
- `months_since_opened ≤ PREBONUS_MONTH_LIMIT`

If:

```text
months_since_opened > PREBONUS_MONTH_LIMIT
```

The card must NOT be classified as PreBonus.

---

### Missing `opened_month` Rule (Strategy A)

If `opened_month` is missing:

- `months_since_opened` must be treated as `null`.
- The card must NOT be classified as PreBonus.
- A warning must be logged.
- Lifecycle must fall back to `FirstYear` (or non-PreBonus state).

This prevents false high-priority alerts caused by missing data.

---

## 7. Events (Canonical Enumeration)

Allowed canonical event types:

- Bleeding  
- PreBonus  
- FeeDue  
- DataStale  
- DataAnomaly  
- MarketWindow  

Alias compatibility is allowed for input normalization only:

```text
annual_fee_due → FeeDue
```

### Alias Governance Rule

The literal alias `annual_fee_due`:

- May exist only in input normalization or migration code.
- Must never appear in stored events, DTO output, UI rendering, PDF, email body, or external reports.

All output must use canonical event types.

---

## 8. Cooldown & Retrigger Rules

- Events are suppressed during `COOLDOWN_DAYS`.
- Bleeding may retrigger early if:

```text
loss increase ≥ BLEEDING_RETRIGGER_DELTA
```

---

## 9. Data Freshness Rules

### 9.1 Customer Data Stale

Uses:

```text
STALE_DAYS
```

If:

```text
today - assets_last_confirmed > STALE_DAYS
```

Trigger `DataStale` event.

---

### 9.2 Market Offer Freshness

Uses:

```text
MARKET_FRESH_DAYS
```

If:

```text
today - bonus_last_updated > MARKET_FRESH_DAYS
```

Offer is considered stale.

Important:

- Market freshness must NOT use `STALE_DAYS`.
- `bonus_valid_until` is display-only.
- `bonus_valid_until` must never affect recurring net calculations.

---

## 10. One-Time Bonus Rules

One-time bonuses:

- Must be displayed separately.
- Must not be mixed into recurring net.
- May be included in scenario comparison tables.
- Must not alter recurring health classification.

In scenario comparison tables, Unlock Bonus may be shown as a combined one-time total that includes
both achievable in-progress bonuses (existing cards) and recommended new-offer bonuses (if any).
Recurring Net must remain recurring-only and exclude one-time bonuses.

### Reporting Constraint (v1.0.2)

In FIRST scenario comparison tables:

- Unlock Bonus must not assume multiple simultaneous new card openings.
- Only one new offer may be counted toward Unlock Bonus within a 12-month projection.
- If multiple offers are displayed, exactly one may be marked as "Recommended Now".
- All other offers must be labeled as "Watchlist" or "Alternative" and excluded from scenario math.

This rule prevents unrealistic multi-card stacking assumptions and ensures behavioral realism.

### Offer Recommendation Tiers

Promotions must be categorized into:

- Recommended Now (max 1 per 12 months)
- Watchlist / Alternative

Only "Recommended Now" affects Scenario Unlock Bonus calculations.
Watchlist offers are informational and must not influence projected net calculations.

---

## 11. Reporting Output Hard Rules (Frozen)

The system must never output:

- `"Check report details."`
- `"$0 impact"`
- `"-$0"`
- Undefined placeholder tokens (e.g., TODO, TBD, lorem ipsum, DEBUG, or development artifacts)

Placeholder tokens refer strictly to unfinished development markers or debug remnants.  
Neutral fallback messaging (e.g., "Review this item to prevent value leakage.") is allowed if it represents intentional user-facing guidance.
Allowed missing-value markers: Business-meaningful missing-value markers (e.g., N/A, Not available, None) are allowed only for optional fields such as promo dates, optional metadata, or missing market fields. They must not be used as placeholders for actions, recommendations, or primary report conclusions.

If:

```text
impact_usd ≤ 0
```

Then:

- `impact_usd` must be set to `null`
- UI must display `"Potential upside"` or omit the impact field entirely

### Monetary Formatting Rule

Correct:

```text
-$400
```

Incorrect:

```text
- $400
```

All monetary formatting rules must remain consistent across UI, PDF, email body, and web rendering.

---

## 12. DTO Baseline Contract

Standardized fields:

```text
recurring_*
optimized_net
unlock
portfolio.cards[]
actions[]
promotions[]
```

All monetary values remain numeric until render stage.

---

## 13. Naming Conventions

**Constants:**  
```text
UPPER_SNAKE_CASE
```

**Fields:**  
```text
snake_case
```

**Canonical enums:**  
```text
PascalCase
```

Input may allow aliases but must normalize before storage and output.

---

## 14. Report Structure Governance

FIRST and MONTHLY report structure must follow:

- `docs/templates/FIRST_TEMPLATE.md`
- `docs/templates/MONTHLY_TEMPLATE.md`

Templates define:

- Section order  
- Field usage  
- Display rules  
- Empty state messaging  

Templates must not redefine financial calculations or thresholds.

---

## 15. Version Policy

This file defines v1.0.

If any of the following change:

- Constant values  
- Health thresholds  
- Event enumeration  
- Lifecycle rules  
- Calculation formulas  

The version must increment.

---

## 16. System Integrity Principle

Recurring logic, lifecycle classification, event normalization, and reporting constraints must remain consistent across:

- Engine  
- Reports  
- DTO  
- UI  
- PDF  
- Web output  
- Email body  

The system must be deterministic, consistent, and financially trustworthy.

---

**End of Document**  
Lumina Credit Reward — SSoT v1.0
