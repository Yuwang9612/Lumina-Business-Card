\# FIRST Report Template (Wake Up / Purchase-driving)



\## Purpose (Psychology)

\- Shock + relief: reveal silent loss, then show clear fix path.

\- Trust: show current portfolio facts first (recurring-only).

\- Action: 3 executable priority actions on existing cards (assets), then optional best offers.



\## Data Contract (ReportDTO v1)

Required:

\- client\_name, report\_type="FIRST", generated\_at

\- kpis.recurring\_fees, kpis.recurring\_value, kpis.recurring\_net

\- kpis.optimized\_net (optional), kpis.unlock (optional)

\- portfolio.cards\[] (must include card\_name, annual\_fee, est\_value, net; status/lifecycle optional)

\- actions\[] (priority, issue\_type, card\_name, title, status, action, impact\_usd)

\- promotions\[] (issuer optional, card\_name, promo\_headline, bonus\_value\_est\_usd, promo\_end\_date, affiliate\_url)



Optional but preferred (for accuracy \& better UI):

\- portfolio.totals.annual\_fees / value / net

\- portfolio.cards\[].lifecycle\_stage, .is\_prebonus, .is\_bleeding

\- promotions\[].issuer (bank)



\## Fixed Section Order (MUST NOT CHANGE)

1\) Your Current Credit Card Setup (Next 12 Months)

2\) One-time Bonuses In Progress (Not Included Above)

3\) Your Improvement Potential (Comparison Table)

4\) Card Health (What’s Working vs What’s Leaking)

5\) Top Priority Actions (Do These First)

6\) Best Offers

7\) Do Nothing vs Act Next 12 Months



No "Next Steps". No "Footer".



---



\## 1) Your Current Credit Card Setup (Next 12 Months)

\### Goal

Establish credibility with current recurring economics.



\### IMPORTANT: Do NOT show separate totals lines above the table

Do NOT render:

\- Annual fees (next 12 months): ...

\- Estimated value (next 12 months): ...

\- Net (next 12 months): ...

Because the table already communicates these.



\### Table rules

\- If active cards count == 1:

&nbsp; Table columns:

&nbsp; Card | Annual Fee | Est. Value | Net | Status | Lifecycle

\- If active cards count > 1:

&nbsp; Table columns (NO Card and NO Lifecycle):

&nbsp; Annual Fee | Est. Value | Net | Status

&nbsp; (This table represents the total picture / aggregated view.)



\### Status column

\- Prefer portfolio.cards\[].status if available.

\- Fallback (presentation only):

&nbsp; net < 0 => "Bleeding"

&nbsp; else => "OK"



\### Copy under the table (fixed)

"This section reflects your current setup. One-time welcome bonuses are shown separately below."



\### Empty state

"No active cards found. Please check Card\_Assets."



---



\## 2) One-time Bonuses In Progress (Not Included Above)

\### Goal

Separate one-time bonuses; create urgency to finish pending bonuses on cards the customer already opened.



\### Source of truth

\- Pending bonuses = cards where is\_prebonus == true (or lifecycle\_stage == PreBonus).

\- Promotions/offers must NOT be used here.



\### Output

\- If none:

&nbsp; "No active welcome bonuses are currently pending."

\- If exists:

&nbsp; List each card with:

&nbsp; Card name + badge "Pre-Bonus"

&nbsp; Short explanation (hard but professional):

&nbsp; "If you don’t finish the spend, the bonus value disappears."

&nbsp; Optional: deadline if available; else:

&nbsp; "Deadline: Not provided — please confirm in your sheet."



---



## 3) Your Improvement Potential (Comparison Table)

### Goal

Keep the narrative currently used in FIRST.  
The scenario table must be backend-computed and mathematically closed.

### Comparison Table (MUST be rendered as a table)

Header must be exactly:

Scenario | Annual Fee (Recurring) | Spend Rewards (Recurring) | Unlock Bonus (One-Time) | 12-month Net (Total)

Rows:

A) Do nothing (keep current)  
B) If you act (after fixes)

### Backend Contract (DTO fields)

UI must read values from DTO only:

`scenario_comparison.do_nothing.annual_fee`  
`scenario_comparison.do_nothing.spend_rewards`  
`scenario_comparison.do_nothing.unlock_bonus`  
`scenario_comparison.do_nothing.net_12m`  
`scenario_comparison.act.annual_fee`  
`scenario_comparison.act.spend_rewards`  
`scenario_comparison.act.unlock_bonus`  
`scenario_comparison.act.net_12m`

UI must NOT derive deltas or scenario numbers.

If any field is `null`, UI must render `—`.

### How this table is calculated

• Annual Fee (Recurring): Your current annual fees, adjusted for recommended fee actions (cancel/downgrade/replace) plus any first-year fees from a new recommended card.

• Spend Rewards (Recurring): Projected rewards based on your reported spend categories and conservative earn rates, plus recurring uplift from structural adjustments (v1.0 does not fully re-optimize every category).

• Unlock Bonus (One-Time): Includes (1) achievable in-progress bonuses on existing cards and (2) the bonus from the single “Recommended Now” new offer, if applicable.

• 12-month Net (Total): Spend Rewards + Unlock Bonus − Annual Fee.



\## 4) Card Health (What’s Working vs What’s Leaking)

\### Goal

Create “guardian” feeling per card; explain why each matters.



\### Table columns (must include)

Card | Annual Fee | Est. Value | Net | Status | Why it matters



\### Status derivation (presentation fallback)

\- if is\_prebonus true => "Pre-Bonus"

\- else if is\_bleeding true OR net < 0 => "Bleeding"

\- else => "OK"



\### Why it matters (hard but professional)

\- Bleeding:

&nbsp; "This card is costing you money every year."

\- Pre-Bonus:

&nbsp; "If you don’t finish the spend, the bonus value disappears."

\- OK:

&nbsp; "This card is pulling its weight."



---



\## 5) Top Priority Actions (Do These First)

\### Scope rule (critical)

This section ONLY targets cards in Card Assets (including Active or Closed), and allowed actions include:

\- keep / cancel / downgrade / upgrade / product-change / replace on those existing cards

It must NOT include external market offers / new card promotions.



\### Display rules

\- Sort by priority ascending.

\- Show top 3 only.

\- Forbidden:

&nbsp; - generic placeholder action text.

&nbsp; - "$0" impact



\### Label mapping (presentation)

BLEEDING => "Stop the loss"

PREBONUS => "Finish your bonus"

FEE\_DUE => "Fee is coming"

DATA\_STALE => "Confirm your data"

MARKET\_WINDOW => "Better option (review)"

(default => "Action")



\### Action fallback (if empty / too vague)

\- BLEEDING: "Cancel, downgrade, or replace before the next annual fee hits."

\- PREBONUS: "Complete the required spend before the deadline."

\- FEE\_DUE: "Decide to keep/cancel before the fee posts."

\- DATA\_STALE: "Confirm your spend and fee data for accuracy."

\- MARKET\_WINDOW: "Review upgrade/downgrade options on your existing cards."



\### Impact display

\- impact\_usd > 0: "Saves about $X per year"

\- else: "Potential upside" (never show $0)



---



\## 6) Best Offers

\### Goal

Optional upside opportunities (new cards). Separate from Priority Actions.



\### Each offer rendering (required)

Format:

Issuer/Bank

Headline, End date: YYYY-MM-DD

Why recommended (one sentence)

Open Link



\### Why recommended (logic guidance)

\- If the report has unlock > 0, explain: "High value bonus can accelerate your next 12 months."

\- Otherwise: "Good fit when your spend pattern matches the bonus/earn categories."

(Use conservative generic copy if no extra fields available.)



\### Empty state

"No active offers right now."



---



\## 7) Do Nothing vs Act Next 12 Months

\### Layout requirement

Two-column compare table (no horizontal scroll on typical desktop modal width).



Columns:

Metric | Do nothing | Act on recommendations



Rows (minimum):

Annual Fee (12m)

Spend Rewards (12m)

Unlock Bonus (one-time)

12-month Net



Closing line under table:

\- If recurring\_net < 0:

&nbsp; "Doing nothing keeps you in the red for another year."

\- Else:

&nbsp; "A few small changes can unlock meaningful value."

