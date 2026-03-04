# Test Cases

Source of truth for scenario definitions referenced by TEST_PROTOCOL.

## 6. Scenario Tests

All scenario tests use this structure:

- Intent
- Input Setup
- Execution
- Assertions
- Artifacts
- Class (`FULL-AUTO` or `USER-INTERVENTION`)

### S1 Negative Net Portfolio

Intent
- Ensure loss-making portfolio/cards produce required risk emphasis and actions.

Input Setup
- At least one active card with recurring net < 0 and material loss.

Execution
- Run standard sequence (load + regenerate + PDF).

Assertions
- System status is not stable-only.
- At least one attention action exists for bleeding/loss context.
- Impact text follows hard rules (no zero-impact literals).

Artifacts
- Dashboard screenshot (status + cards section).
- PDF copy.
- Current cycle `Dashboard_Snapshots` row.

Class
- `USER-INTERVENTION`

### S2 Signup Bonus Phase (PreBonus)

Intent
- Ensure in-progress welcome bonus context is surfaced correctly.

Input Setup
- Card eligible for bonus lifecycle in progress with valid opened-month window.

Execution
- Run standard sequence.

Assertions
- Relevant action/issue shows PreBonus intent.
- No contradictory “completed” language for in-progress case.

Artifacts
- Cards section screenshot.
- Related `Monthly_Events` rows.

Class
- `USER-INTERVENTION`

### S3 Data Stale Detection

Intent
- Ensure stale customer data triggers confidence downgrade and health warning.

Input Setup
- `assets_last_confirmed` older than `STALE_DAYS` threshold.

Execution
- Run standard sequence.

Assertions
- Data Health shows outdated state.
- Caution message present.
- System status/subline reflects stale-data confidence downgrade.

Artifacts
- Data Health screenshot.
- Snapshot JSON excerpt for `dashboard.data_health`.

Class
- `FULL-AUTO`

### S4 Annual Fee Timing

Intent
- Ensure near-term fee timing produces fee-due attention signal.

Input Setup
- Card with fee due month inside configured window (`fee_due_window_months`).

Execution
- Run standard sequence.

Assertions
- FeeDue event/action exists when conditions are met.
- No duplicate uncontrolled FeeDue spam in same cycle run.

Artifacts
- `Monthly_Events` rows for FeeDue.
- Cards/action screenshot.

Class
- `FULL-AUTO`

### S5 Portfolio Optimization / Scenario Comparison

Intent
- Ensure comparison table is populated from DTO source and math fields are present.

Input Setup
- Dataset with non-trivial action delta and/or bonus component.

Execution
- Run standard sequence.

Assertions
- `scenario_comparison.do_nothing` and `.act` both populated.
- Strategy Snapshot table renders these DTO values.
- UI does not rely on ad-hoc guessed numbers.

Artifacts
- Strategy Snapshot screenshot.
- DTO JSON snippet (stored snapshot payload).

Class
- `FULL-AUTO`

### S6 Long Promotion Wrap

Intent
- Prevent layout break from long promo text/headline/url.

Input Setup
- One or more promotions with very long headline text.

Execution
- Run standard sequence including PDF.

Assertions
- UI text wraps; no overlap over KPIs/actions.
- PDF remains readable; no clipped critical rows.

Artifacts
- UI screenshot (offers section).
- PDF page capture.

Class
- `USER-INTERVENTION`

### S7 Snapshot Pointer Repair (Legacy -> row_id)

Intent
- Ensure legacy pointer compatibility and auto-repair remains working.

Input Setup
- Set snapshot pointer property to legacy row-number format for active client/cycle.

Execution
- Trigger data fetch without force regenerate.

Assertions
- Snapshot resolves successfully.
- Pointer is repaired to `row_id` string.
- No crash on read path.

Artifacts
- Before/after pointer value.
- Dashboard_Snapshots row evidence.

Class
- `FULL-AUTO`

### S8 Empty Portfolio

Intent
- Ensure system handles no active cards gracefully.

Input Setup
- No active rows in `Card_Assets` after status filtering.

Execution
- Run standard sequence.

Assertions
- Dashboard renders without crash.
- Empty-state copy appears in card-related blocks.
- Snapshot still generated for cycle.

Artifacts
- Full dashboard screenshot.
- Snapshot row.

Class
- `FULL-AUTO`

### S9 Missing System Tabs Recovery

Intent
- Verify system-managed sheet auto-create behavior.

Input Setup
- Keep operational input sheets valid.
- Remove one or more system-managed sheets: `Snapshots`, `Monthly_Events`, `System_Tracking`, `Dashboard_Snapshots`.

Execution
- Run standard sequence.

Assertions
- Missing system-managed sheets are auto-created.
- Dashboard generation still succeeds.
- No user-input sheet data loss.

Artifacts
- Sheet list before/after.
- New sheet headers screenshot.

Class
- `FULL-AUTO`

### S10 Multi-Employee Same Card Name

Intent
- Ensure duplicate card-name assets do not silently corrupt totals/events/tracking behavior.

Input Setup
- Multiple active asset rows sharing same card name (different spend/fee contexts).

Execution
- Run standard sequence.

Assertions
- Portfolio totals remain internally consistent with effective model.
- Snapshots/events/tracking behavior is deterministic (no crash/overwrite loop).
- Any known aggregation limitation is documented in release note if observed.

Artifacts
- Input rows screenshot.
- Snapshot/event/tracking rows.

Class
- `FULL-AUTO`

### S11 Event Alias Canonicalization

Intent
- Ensure alias forms do not leak to output.

Input Setup
- Seed path that may include alias-like fee-due naming.

Execution
- Run standard sequence.

Assertions
- Output surfaces only canonical `FeeDue` label semantics.
- No `annual_fee_due` literal in UI/PDF/DTO output payload.

Artifacts
- Output text scan report.
- Relevant event rows.

Class
- `FULL-AUTO`

### S12 Output Hard Rules Enforcement

Intent
- Enforce SSoT hard forbidden outputs.

Input Setup
- Dataset with zero/near-zero impact and fallback-action conditions.

Execution
- Run standard sequence.

Assertions
- Never renders `$0`, `-$0`, `Check report details.`
- Uses `Potential upside` when non-positive impact.

Artifacts
- UI and PDF text scan evidence.

Class
- `FULL-AUTO`

### S13 DataStale vs Market Freshness Separation

Intent
- Ensure stale customer data and stale offer data are treated with separate thresholds.

Input Setup
- Customer data stale; offers fresh (and vice versa in second run).

Execution
- Run two standard runs with controlled dates.

Assertions
- Customer stale affects data-health confidence.
- Offer freshness labeling follows market freshness rule independently.

Artifacts
- Two run screenshots.
- Snapshot data_health excerpts.

Class
- `FULL-AUTO`

### S14 Same-Cycle Snapshot Reuse vs Force Regenerate

Intent
- Ensure deterministic same-cycle reuse and explicit regeneration behavior.

Input Setup
- Stable dataset for current cycle.

Execution
- Run load twice without force.
- Run once with regenerate.

Assertions
- Non-force path reuses snapshot for same cycle.
- Force path rewrites/updates snapshot payload/updated_at.

Artifacts
- `Dashboard_Snapshots` before/after rows.
- UI status timestamps.

Class
- `FULL-AUTO`

### S15 System_Tracking Streak Progression

Intent
- Verify action time-context progression for repeated issues.

Input Setup
- Keep same actionable issue active across sequential cycle simulations.

Execution
- Run across at least two cycles (or controlled month override workflow).

Assertions
- `active_streak_months` increments deterministically.
- `time_context`/pending phrasing appears when applicable.

Artifacts
- `System_Tracking` rows across cycles.
- Cards section screenshots.

Class
- `FULL-AUTO`

### S16 Bleeding Dedupe / Retrigger / Cap

Intent
- Protect dedupe logic from event spam regressions.

Input Setup
- Bleeding case with repeated runs in same month; one run with larger loss delta above retrigger threshold.

Execution
- Run multiple generation passes in same report month.

Assertions
- Initial event emitted.
- Non-retrigger duplicates suppressed.
- Retrigger allowed when threshold condition met.
- Monthly cap respected.

Artifacts
- `Monthly_Events` rows.
- Dedupe debug logs (`DEDUPE_DEBUG=true` run evidence).

Class
- `FULL-AUTO`

### S17 Promotion Filtering and Cap

Intent
- Ensure promotion filtering and cap behavior stays stable.

Input Setup
- Mixed promo levels, held/unheld cards, stale/fresh last-checked dates.

Execution
- Run standard sequence.

Assertions
- Included opportunities obey engine filters and cap.
- Stale/invalid/held-card promos excluded according to current rules.

Artifacts
- Offers section screenshot.
- Market-engine logs (`PROMO_DEBUG=true` optional).

Class
- `FULL-AUTO`

### S18 Backend PDF Template/Permission Failure Path

Intent
- Ensure backend PDF failure path is diagnosable and non-destructive.

Input Setup
- Invalid/missing dashboard template ID or unavailable folder permission.

Execution
- Run backend PDF generation path.

Assertions
- Process returns controlled warning/fallback behavior.
- No data corruption in snapshot/event state.

Artifacts
- Debug/warning cells and logs.
- Returned result payload.

Class
- `FULL-AUTO`

### S19 Required Sheets Presence Contract

Intent
- Ensure required operational sheets are validated before release run.

Input Setup
- Remove or rename one required operational input sheet in a controlled sandbox copy.

Execution
- Run generation.

Assertions
- Failure is explicit and diagnosable (not silent success with bad data).
- No destructive auto-overwrite of user-maintained sheets.

Artifacts
- Error message screenshot/log.

Class
- `FULL-AUTO`

### S20 No Silent Fallback Acceptance

Intent
- Ensure release PASS cannot rely on mock/fallback-only data.

Input Setup
- Healthy dataset run under normal environment.

Execution
- Run full standard sequence.

Assertions
- Final accepted artifact comes from main compute path.
- If fallback path is taken, run is marked FAIL for release gate.

Artifacts
- Runtime status/log traces indicating path.

Class
- `FULL-AUTO`

---
