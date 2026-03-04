DASHBOARD_TEMPLATE.md

Lumina Credit Reward — Unified System View

Aligned with SSoT v1.1

Purpose (Psychology)

Stability: Same structure every time.

Clarity: Know in 2 seconds if action is needed.

Guardian effect: “Your system is being monitored.”

Time awareness: No repeated static advice.

Integrity: No silent inaccurate projection.

This template replaces separate FIRST and MONTHLY reports.

Data Contract (ReportDTO v2)

Required:

client_name

report_type = "DASHBOARD"

generated_at

dashboard.system_status

dashboard.strategy_snapshot

dashboard.card_actions[]

dashboard.opportunity_windows[]

dashboard.data_health

Tracking fields (System_Tracking, internal):

first_seen_ym

active_streak_months

recommended_action_title

recommended_action_opened_ym

action_completed_at

last_status_change_at

Fixed Section Order (MUST NOT CHANGE)

System Status

Strategy Snapshot

Cards Requiring Attention

Opportunity Windows

Data Health

No extra sections.

1) System Status
Goal

One-glance clarity.

Headline options:

“System Stable”

“Action Needed”

“Portfolio Losing Money”

“Data Update Required”

Sub-line:

12-month projected recurring net: $X

If DataStale is active:

Append:

“Estimates based on last confirmed data.”

No table here.

2) Strategy Snapshot

Preserve FIRST math integrity.

Render scenario_comparison table exactly per SSoT.

Do not derive values.

Under table:

If unchanged:
“Strategy remains valid under current structure.”

If recalculated:
“Strategy updated based on revised inputs.”

No extra explanation.

3) Cards Requiring Attention
CRITICAL RULE: Time Semantics Required (MUST)

Any card appearing in this section MUST include time-based context.

The system must NEVER repeat identical static recommendations month-to-month.

Every persistent issue must include at least one of:

“Underperforming for X months”

“Open for X months”

“Fee posts in X days”

“Bonus window closes in X days”

“Pending for X months”

Time values must derive from System_Tracking or lifecycle computation.

If tracking unavailable → do not fabricate.

Display Conditions

Render only cards where:

health = Bleeding

lifecycle = PreBonus

FeeDue active

recommended_action exists

If none:

“All cards are performing as expected.”

Card Block Structure

Card Name
Annual Fee: $X
Estimated Recurring Net: $X

Status label:

Bleeding

Pre-Bonus

Fee Reminder

Watch

Time indicator (MANDATORY if issue persists):

Underperforming for X months

Recommended Action:

From recommended_action_title.

If absent, fallback per event type.

Impact:

If impact_usd > 0:
“Saves about $X per year”

Else:
“Potential upside”

Never show "$0".

Completed Actions (MUST Preserve)

If action_completed_at exists:

Display:

Completed on YYYY-MM-DD
Impact reflected in current projection.

Completed actions must remain visible for at least 1 cycle.

4) Opportunity Windows

Only show active, fresh promotions.

For each:

Issuer
Headline
Estimated bonus value: $X
Expires in X days

One-line rationale:

“High-value window under current structure.”

Do not stack multiple new cards in projection math.

If none:

“No high-value windows at this time.”

5) Data Health
CRITICAL RULE: Health Semantics Required (MUST)

The system must always display data freshness status.

Render:

Business profile last updated: X days ago
Card list last updated: X days ago

If STALE_DAYS exceeded:

Status: Outdated

And MUST include:

“Decisions may be inaccurate until data is refreshed.”

If stale, System Status must downgrade confidence tone.

If current:

Status: Up to date.

Global Rendering Constraints

Recurring and one-time must never mix.

Monetary format: -$400 (no space).

Never render:
"$0"
"-$0"
"Check report details."

Impact ≤ 0 → “Potential upside”.

Time phrases must come from tracking fields.

Dashboard must not reference “First Report” or “Monthly Report”.

Behavioral Guarantees

The Dashboard must:

Show progression over time.

Never repeat static advice without time context.

Downgrade confidence when data stale.

Preserve structural consistency across months.

Avoid explanation redundancy.

End of Template

Lumina Credit Reward — Dashboard Template v1.1
Requires SSoT v1.1 State Tracking Extension