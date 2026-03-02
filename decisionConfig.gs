/**
 * @file decisionConfig.gs
 * Centralized configuration for all decision thresholds and cooldown rules.
 */

var DECISION_CONFIG = {
  // Environment switching removed: all runtime reads use canonical sheet names
  // (Card_Assets / Card_Catalog / Promo_Catalog) in the current spreadsheet.
  DATA_ENV: 'PROD',
  DATA_DEBUG: false,
  DEDUPE_DEBUG: false,
  REPORT_MONTH_OVERRIDE: null, // e.g. "2026-02"
  TIME_ANCHOR_DEBUG: false,

  REALIZABLE_DELTA_MIN: 200,
  BLEEDING_MIN_LOSS: 100,
  BLEEDING_RETRIGGER_DELTA: 50,
  BLEEDING_MAX_EVENTS_PER_MONTH: 2,

  STALE_DAYS: 45,
  MARKET_FRESH_DAYS: 120,

  PREBONUS_MONTH_LIMIT: 3,

  fee_due_window_months: 1,
  FEE_REMINDER_DAYS: [45, 30, 15],

  COOLDOWN_DAYS: {
    Bleeding: 30,
    PreBonus: 30,
    FeeDue: 15,
    MarketWindow: 30,
    DataStale: 30,
    DataAnomaly: 30
  },

  MARKET_WINDOW_CAP: 5,
  PROMO_CAP: 3,
  PROMO_REQUIRE_ENDDATE: false,
  PROMO_DEBUG: false,
  DEV_MODE: false
};
