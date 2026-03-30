# Test Protocol v1.3 (Regression Standard)

## 1. Purpose & Scope

This protocol defines the mandatory regression gate for Dashboard releases.

Release goals:

- protect Dashboard output contract (`docs/25_templates/DASHBOARD_TEMPLATE.md`)
- prevent SSOT logic drift (`docs/20_ssot/SSOT.md`)
- ensure snapshot determinism and pointer stability
- make most checks executable automatically

Scope:

- Dashboard generation path (menu/UI/server DTO)
- snapshot/event/tracking persistence
- Dashboard PDF path (frontend and backend)

Out of scope:

- non-Dashboard legacy presentation acceptance as primary release gate

---

## 2. Test Layers

### Layer 1 — Automatic Regression (Required Every Change)

Focus: logic and contract correctness.

Includes:

- section order contract checks
- DTO/schema and required field checks
- canonical event/output checks
- snapshot creation/reuse/pointer checks
- required sheet existence checks
- hard-rule text scan (`$0`, `-$0`, `Check report details.`)

### Layer 2 — Semi-Automatic Layout/PDF Regression

Run whenever UI/PDF code or template mapping changes.

Focus: rendering and readability.

Includes:

- long-text wrapping
- scenario table readability
- PDF section completeness
- no critical clipping/overlap

### Layer 3 — Final Human Review (Release Gate)

Run before external delivery.

Focus: high-impact business scenarios and final visual confidence.

Includes:

- negative net portfolio
- stale-data confidence downgrade
- promotion overflow behavior
- missing-sheet recovery behavior
- duplicate-card identity handling

---

## 3. Execution Procedure

Standard run sequence:

1. Prepare dataset for target scenario.
2. Open spreadsheet menu:
   - `Card Profit Watch -> Customer Credit Card Dashboard`
3. Load Dashboard dialog.
4. Open Dashboard and confirm it loads the latest generated report by default.
5. Run `Regenerate Snapshot` for an explicit forced recompute check.
   - The dialog toolbar must expose `Regenerate Snapshot` when using the in-Sheets Dashboard dialog.
6. Generate PDF:
   - in-Sheets `Download PDF` should preserve the Dashboard visual layout, including tables/cards/section structure
   - backend path `generatePdfForWeb_ -> generateDashboardPdf` remains a fallback, not the primary release artifact

Primary code path reference:

- Menu: `main.gs:onOpen -> generateDashboardReport -> openBeautiful_`
- Web: `WebApp.gs:doGet -> getBeautifulReportData -> generateReportDataForWeb`
- Core compute: `Reports.gs:runMonthlyReport`
- DTO: `ReportDTO.gs:buildReportDTOFromDashboardModel_`
- Enrichment: `WebApp.gs:buildDashboardDto_`
- PDF backend: `WebApp.gs:generatePdfForWeb_ -> PdfReports.gs:generateDashboardPdf`

---

## 4. PASS / FAIL Criteria

PASS when all required checks pass:

- Dashboard generated successfully (no fatal fallback-only state)
- section order matches template contract
- snapshot/tracking/event writes are valid for scenario
- canonical event and output hard rules hold
- required DTO fields are present
- PDF generation succeeds and major sections exist

FAIL if any of the following occurs:

- missing/reordered required sections
- broken snapshot pointer behavior
- forbidden placeholder/hard-rule text appears
- canonical event leakage/alias leakage
- critical layout break (clipped/overlapped key content)

---

## 5. Mandatory Smoke Tests (Auto)

Each smoke test must be tagged by execution ownership:

- `FULL-AUTO`: fully executable by assistant without your manual UI intervention
- `USER-INTERVENTION`: requires your interactive action/visual confirmation

SM-1 Dashboard generation succeeds.  
Class: `USER-INTERVENTION`

SM-2 Snapshot row is created/updated in `Dashboard_Snapshots` for current cycle.  
Class: `FULL-AUTO`

SM-3 Section order matches template.  
Class: `USER-INTERVENTION`

SM-4 DTO contract includes required blocks.  
Class: `FULL-AUTO`

SM-5 Event canonicalization valid.  
Class: `FULL-AUTO`

SM-6 PDF generation works (frontend + backend release check).  
Class: `USER-INTERVENTION` (frontend), `FULL-AUTO` (backend path check)

SM-7 Required sheets exist or auto-created where system-managed.  
Class: `FULL-AUTO`

SM-8 Card identity key behavior remains stable (no silent overwrite in snapshots/events/tracking).  
Class: `FULL-AUTO`

SM-9 No silent fallback as final output in normal healthy run.  
Class: `FULL-AUTO`

SM-10 Output hard-rule scan passes (`$0`, `-$0`, `Check report details.` absent).  
Class: `FULL-AUTO`

---

## 6. Scenario Tests

Scenario definitions are maintained in:

- `docs/40_tests/TEST_CASES.md`

Release execution must run the IDs listed in section 10.
## 7. Output Verification Checklist

Verify all below per release candidate:

Structure:

- 5 required Dashboard sections present
- section order exactly matches template
- no missing primary block

Logic/Copy:

- scenario table populated
- stale-data messaging correct when stale
- positive/non-positive impact wording correct
- no forbidden placeholder/hard-rule text
- no non-canonical event alias leakage

Layout/PDF:

- long text wraps correctly
- no clipping/overlap in key cards/tables
- PDF readable and section-complete

Persistence:

- snapshot row valid for cycle
- events/snapshots/tracking updated as expected

---

## 8. Debugging

Primary inspection points:

- `Debug` sheet
- `System_Tracking`
- `Dashboard_Snapshots`
- `Snapshots`
- `Monthly_Events`
- Logger logs

Useful debug flags (`decisionConfig.gs`):

- `DATA_DEBUG`
- `DEDUPE_DEBUG`
- `TIME_ANCHOR_DEBUG`
- `PROMO_DEBUG`
- `DEV_MODE`

Look for:

- pointer repair behavior
- dedupe/retrigger decisions
- freshness calculations
- sheet auto-create/header repair events
- schema/field warnings

---

## 9. Adding New Test Cases

Every new scenario must include:

- Intent
- Input Setup
- Execution
- Assertions
- Artifacts
- Class (`FULL-AUTO` or `USER-INTERVENTION`)

Authoring rules:

1. Assign next ID (`S21+`).
2. Map the case to at least one contract source:
   - SSOT rule
   - Dashboard template rule
   - runtime persistence contract
3. Tag execution ownership:
   - `FULL-AUTO` (assistant can run end-to-end)
   - `USER-INTERVENTION` (needs your interactive operation/visual decision)
4. If high-frequency/high-impact, promote it into mandatory smoke tests.
---

## 10. Release One-Click Order

Use this fixed order for every release candidate.

Step A — Run all `FULL-AUTO` tests first

1. Run mandatory smoke tests tagged `FULL-AUTO`:
   - SM-2, SM-4, SM-5, SM-7, SM-8, SM-9, SM-10
2. Run scenario tests tagged `FULL-AUTO`:
   - S3, S4, S5, S7, S8, S9, S10, S11, S12, S13, S14, S15, S16, S17, S18, S19, S20
3. If any `FULL-AUTO` test fails:
   - stop release
   - open bug ticket(s)
   - rerun from Step A after fix

Step B — Produce `USER-INTERVENTION` checklist

After Step A passes, run only the following manual checks:

- Smoke:
  - SM-1, SM-3, SM-6 (frontend visual/download confirmation)
- Scenarios:
  - S1, S2, S6

For each `USER-INTERVENTION` item, record:

- PASS/FAIL
- screenshot/PDF evidence
- short note (if fail, exact visible break)

Step C — Release decision

Release is allowed only when:

- all `FULL-AUTO` tests pass
- all `USER-INTERVENTION` checks pass
- no open blocker from section 4 FAIL conditions

Step D — Output format (required)

Every regression run should end with this summary block:

- Full-Auto Result: `PASS` / `FAIL`
- User-Intervention Result: `PASS` / `FAIL`
- Overall Gate: `PASS` / `FAIL`
- Failed IDs: `[ ... ]`
- Evidence Links: `[ ... ]`


