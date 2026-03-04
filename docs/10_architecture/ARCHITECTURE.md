# Credit Card Portfolio Dashboard System
Architecture v1.0 (Stable Contract)

## 1. System Overview

The Credit Card Portfolio Dashboard System generates a structured financial dashboard and PDF report for SMB credit card portfolios.

The system analyzes:

- card assets
- annual fees
- rewards value
- lifecycle signals
- portfolio-level metrics

to produce:

- Dashboard UI (HTML)
- PDF report
- Snapshot records for historical state tracking.

The system is implemented using Google Apps Script operating on a structured Google Sheets workbook.

Primary design goals:

- deterministic reporting
- stateful snapshot history
- reproducible dashboard generation
- safe automation for non-technical users.

## 2. System Contracts (Authoritative Sources)

Two documents define the authoritative behavior of the system.

### SSOT
`docs/20_ssot/SSOT.md`

Defines:

- financial semantics
- event canonical list
- card evaluation rules
- output hard constraints.

No code or output may contradict the SSOT.

### Dashboard Template
`docs/25_templates/DASHBOARD_TEMPLATE.md`

Defines:

- report section structure
- section ordering
- copywriting constraints
- formatting rules.

The dashboard must always render these sections in this order:

- System Status
- Strategy Snapshot
- Cards Requiring Attention
- Opportunity Windows
- Data Health

## 3. Quick System Map

This section provides a rapid understanding of system flow.

### Menu Entry
`main.gs`
`onOpen()`
-> `generateDashboardReport()`
-> `openBeautiful_("DASHBOARD")`

### Web Rendering Path
`WebApp.gs`
`doGet()`
-> `getBeautifulReportData()`
-> `generateReportDataForWeb()`

### Core Computation Pipeline
`Reports.gs`
`runMonthlyReport()`

Pipeline:

Sheet Data
-> Normalize
-> Structure Engine
-> Lifecycle Engine
-> Market Engine
-> Audit Trail
-> Dashboard DTO

### PDF Generation

Two mechanisms exist.

Frontend
`html2pdf.js`

Backend
`WebApp.gs`
-> `generatePdfForWeb_()`

`PdfReports.gs`
-> `generateDashboardPdf()`

### Persistent State

System state is stored in:

- Dashboard_Snapshots
- Snapshots
- Monthly_Events
- System_Tracking
- Debug

The primary snapshot key is:

`row_id` (UUID)

## 4. Inputs & Data Sources

Primary user-maintained sheets:

### Company_Profile

Contains company metadata used by report generation and labeling.

Fields currently read by code include:

- `Company Name` (or aliases: `Business Name`, `Client Name`, `business_name`)
- `business_profile_last_confirmed` (or alias `Business_Profile_Last_Confirmed`)

Note: this sheet is key-value style (`column A = key`, `column B = value`), so additional business metadata can exist.

### Card_Assets

Primary operational dataset.

Each row represents one card asset currently considered active by status filtering.

Fields currently used by code include:

- `Card Name`
- `Status`
- `Current Annual Spend (Range)` (aliases supported, e.g. `Spend Range`)
- `Annual Fee` (optional asset override; catalog fee used if blank)
- `Opened (YYYY-MM)` (aliases supported, e.g. `Opened` / `Opened Date`)
- `Bonus Collected?` (aliases supported)
- `Assigned Category`
- `assets_last_confirmed`

### Catalog Sheets

These sheets describe card metadata and promotion metadata.

- `Card_Catalog`
- `Promo_Catalog`

These are normally created by the developer or system administrator.

## 5. Sheet Initialization Policy

The system must safely handle missing sheets without destroying user data.

Required operational sheets

Expected sheets:

Company_Profile
Card_Assets
Card_Catalog
Promo_Catalog

Behavior rules:

If Card_Catalog or Promo_Catalog exists
-> system must NOT recreate or overwrite it.

If either sheet is missing
-> system may automatically create it with required headers.

Existing user data must never be deleted.

System-managed sheets

These sheets are automatically managed:

Snapshots
Monthly_Events
System_Tracking
Dashboard_Snapshots
Debug

Behavior:

if missing -> auto-create

user editing discouraged.

Header Validation Policy

When sheets already exist:

system must not delete user data

missing headers may be appended

warnings may be logged in Debug sheet.

## 6. Core Processing Pipeline

The reporting pipeline is deterministic.

Google Sheets
↓
Normalize
↓
Business Engines
↓
Dashboard DTO
↓
Rendering Layer
↓
Dashboard / PDF

### Step 1 — Normalize

Normalizes raw spreadsheet input.

Ensures:

- field types consistent
- defaults applied
- schema alignment.

### Step 2 — Business Engines

Three engines produce decision logic.

#### Structure Engine

Evaluates per-card recurring value/net and portfolio structure health.

#### Lifecycle Engine

Detects lifecycle signals, including:

- bonus progress windows
- annual fee timing context
- lifecycle stage transitions.

#### Market Engine

Evaluates external promotion opportunities with freshness filters.

### Step 3 — Audit Trail

Records snapshots/events behind generated recommendations.

Used for:

- debugging
- traceability
- transparency.

### Step 4 — Dashboard DTO

Structured model passed to rendering.

Key sections:

- `kpis`
- `actions`
- `portfolio`
- `promotions`
- `scenario_comparison`
- `dashboard.{system_status,strategy_snapshot,card_actions,opportunity_windows,data_health}`

Field definitions are governed by SSOT + current DTO contract.

## 7. Snapshot & State Management

Snapshots ensure deterministic reports.

Primary storage table:

`Dashboard_Snapshots`

Fields:

- `row_id`
- `client_key`
- `report_cycle_ym`
- `inputs_hash`
- `snapshot_json`
- `created_at`
- `updated_at`
- `snapshot_version`

Pointer Strategy

Snapshots are retrieved using:

- `row_id`

Legacy row-number pointers are automatically migrated.

If pointer corruption occurs:

Fallback lookup:

- `client_key + report_cycle_ym`

Pointer is repaired automatically.

## 8. Rendering Layer

### UI Rendering
`BeautifulReportUI.html`

Responsibilities:

- visual layout
- section rendering
- scenario table rendering
- interactive actions (regenerate snapshot, download/send flows).

The UI must not perform authoritative financial calculations.

All authoritative metrics must originate from backend DTO.

### PDF Rendering

Two strategies:

Frontend
`html2pdf.js`

Backend
`PdfReports.gs`

Backend uses Google Docs export.

## 9. Guardrails & Non-Goals

To prevent system drift.

### Forbidden changes

Unless explicitly required:

- modifying SSOT semantics
- changing dashboard section order contract
- altering snapshot pointer design
- shifting authoritative financial computation into UI.

### Allowed changes

- UI layout adjustments
- copy improvements
- PDF formatting
- additional validation
- improved logging.

All changes must pass regression tests.

## 10. Known Risks & Future Improvements

Potential risk areas:

- duplicate card identity normalization
- employee/duplicate card entries in assets
- long promotion text layout overflow
- snapshot pointer migration edge cases.

Future improvements:

- automated regression runner
- stricter schema validation
- improved PDF layout engine.
