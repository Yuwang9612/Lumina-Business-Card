DASHBOARD_TEMPLATE.md

Lumina Credit Reward — Unified System View

Aligned with SSoT v1.1

Primary Contract

This template is the single output structure contract for customer-facing DASHBOARD rendering.
There is only one user-facing mode: Dashboard.

Fixed Section Order (MUST)

1) Your Current Credit Card Setup (Next 12 Months)
2) Do Nothing vs Act (Scenario Comparison Table)
3) Cards Requiring Attention (PER-CARD ONLY)
4) Opportunity Windows
5) Strategy Snapshot
6) Next Steps

Remove everything else.
No Footer section.

1) Your Current Credit Card Setup (Next 12 Months)

Goal

Establish credibility with current recurring economics.

Rules

- Render this section as paragraph copy only; do not render a table.
- If active cards count == 1:
  write one paragraph describing that card's current state using its card name, annual fee, estimated value, net, status, and lifecycle when available.
- If active cards count > 1:
  write summary paragraph copy based on all active cards combined.
  The paragraph must reflect aggregate annual fees, aggregate estimated value, aggregate net, and an overall status.
- Status source:
  - prefer portfolio.cards[].status if available
  - fallback display only: net < 0 => Bleeding, else OK
- Fixed copy under the Current Setup paragraph block:
  "This section reflects your current setup. One-time welcome bonuses are shown separately below."
- Empty state:
  "No active cards found. Please check Card_Assets."

2) Do Nothing vs Act (Scenario Comparison Table)

Rules

- Table header must be exactly:
  Scenario | Annual Fee (Recurring) | Spend Rewards (Recurring) | Unlock Bonus (One-Time) | 12-month Net (Total)
- Row A: Do nothing (keep current)
- Row B: If you act (after fixes)
- Values must come from DTO only: scenario_comparison.*
- UI must not derive scenario math.
- Null values render as "—".
- Keep existing "How this table is calculated" bullets if already present.
- Do not add Footer explanation lines.

3) Cards Requiring Attention (PER-CARD ONLY)

Hard Rule

Only per-card items are allowed.

Must omit any item where:

- issue_type == PortfolioLoss OR event_type == PortfolioLoss
- OR card_name is empty/null
- OR scope == portfolio

Additional rules

- Keep time semantics for unexecuted recommendations (Pending for X months, etc.) when available.
- Keep explanation text card-specific.
- If no card-level items: "All cards are performing as expected."

4) Opportunity Windows

Keep as-is.
Respect market freshness rules from SSoT.

5) Strategy Snapshot

Keep as compact summary.
Do not duplicate the scenario comparison table here.

6) Next Steps

Keep as compact actionable list.
Must not reference First or Monthly.

Removed Content (MUST NOT RENDER)

- Footer section
- "12-month net = estimated value - annual fees (recurring only)."
- "Optimized net and unlock are estimates based on suggested actions."

End of Template
