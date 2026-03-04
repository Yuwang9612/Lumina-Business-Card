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

### v1.1 — 2026-03-03 (Extension: State Tracking + Unified Dashboard)

Introduced State Tracking Layer to persist temporal metadata for events/actions (first_seen, last_seen, streak months, completed_at).

Defined Unified Dashboard as the primary presentation surface (replacing separate First/Monthly navigation), while preserving FIRST/MONTHLY templates as internal layout profiles.

Added Dashboard output contract sections:

System Status

Strategy Snapshot

Card Actions (risk + action tracker merged)

Opportunity Windows

Data Health

Clarified that state tracking must not modify financial calculations, thresholds, lifecycle classification, or event canonicalization.

Added rendering rules for:

repeated recommendations (anti-fatigue via time semantics)

stale customer data gating (DataStale suppresses precision claims and may downgrade confidence of actions)

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

## 17. State Tracking Layer (v1.1+ Extension)
17.1 Purpose

The system may persist temporal metadata to support consistent user experience across months, including:

preventing repeated-recommendation fatigue

showing action progress and time elapsed

detecting data update inactivity

ensuring deterministic dashboard messaging over time

State tracking is presentation-support only.

17.2 Non-Interference Rule (Hard)

State tracking MUST NOT:

alter any financial calculations (est_value, net, current_net, adjusted_net, realizable_delta, unlock)

alter any constants, thresholds, lifecycle rules, or canonical event enumeration

be used as an input to change health classification

Tracking may only influence:

phrasing

display ordering

“time since” messaging

confidence / data-health banners

Tracking fields are never inputs to financial calculations; they are outputs only.

17.3 Tracking Store (Internal SSoT)

An internal store (sheet/table) named System_Tracking is authorized.

Minimum fields (per card_name + canonical_event_type):

card_name
event_type (canonical)
first_seen_ym
last_seen_ym
active_streak_months
last_computed_net
last_computed_health (Bleeding/Watch/Efficient)
recommended_action_code
recommended_action_title
recommended_action_opened_ym
action_completed_at (date, nullable)
last_status (Active/Closed/Planned)
last_status_change_at (date, nullable)
tracking_updated_at (date)
17.4 Derivation Rules (Deterministic)

first_seen_ym: set when event_type becomes active for the first time.

last_seen_ym: update whenever event_type remains active in a new report cycle.

active_streak_months: increment if active in consecutive cycles; reset to 1 when re-activated after inactive period.

recommended_action_*: derived by rule engine using existing frozen outputs (health/lifecycle/event type) and catalog flags (e.g., downgrade_option).

action_completed_at: set automatically when system detects completion via customer-visible state change, e.g.:

card status transitions Active → Closed, or

card stops triggering the event_type for N consecutive cycles (N default = 2) (optional), or

explicit “Mark as Done” UI action (if implemented; optional).

No additional customer input is required.

---

## 18. Unified Dashboard Output Contract (v1.1)
18.1 Primary Surface

The system’s primary user-facing surface is the Dashboard.

FIRST and MONTHLY templates remain valid as layout profiles, but the navigation model must not require users to choose “First vs Monthly” as separate report types.

18.2 Dashboard Sections (Canonical Order)

The Dashboard must render the following sections in this order:

system_status

strategy_snapshot

card_actions

opportunity_windows

data_health

18.3 Dashboard DTO Additions

The DTO baseline contract (Section 12) is extended with:

dashboard: {
  system_status: {...},
  strategy_snapshot: {...},
  card_actions: [...],
  opportunity_windows: [...],
  data_health: {...}
}
18.4 Section Semantics

system_status: headline state derived from portfolio health + data health gates.

strategy_snapshot: scenario comparison values must still render from scenario_comparison (v1.0.1+ rule preserved).

card_actions: merges risk context + recommended action + progress metadata (from System_Tracking).

opportunity_windows: derived from promotions, respecting market freshness rules.

data_health: derived from customer stale rules and market freshness separation.

---

## 19. Dashboard Display Rules (v1.1)
19.1 Anti-Fatigue Rule (Time Semantics Required)

When a card action repeats across months, the UI/PDF must display a time-progress phrase using tracking metadata, e.g.:

“Open for 2 months”

“Underperforming for 2 months”

“Window closes in 18 days”

The system must avoid repeating identical month-to-month wording without progress markers.

19.2 DataStale Gate (Customer Data)

If DataStale is active (Section 9.1), Dashboard must:

show data_health prominently

avoid precision claims; must include conservative/last-updated framing

optionally suppress or downgrade prominence of card_actions except for:

DataStale itself

FeeDue reminders (if confidence is sufficient from assets data)

19.3 Market Freshness Gate (Offers)

Offers must follow Section 9.2:

Market freshness uses MARKET_FRESH_DAYS

Stale offers may be displayed but must be labeled “Offer data may be outdated”

bonus_valid_until remains display-only and never affects recurring calculations

19.4 Output Hard Rules Still Apply

All v1.0 Output Hard Rules remain in force (Section 11), including:

no placeholders

no “$0 impact”

correct monetary formatting

---

**End of Document**  
Lumina Credit Reward — SSoT v1.0
