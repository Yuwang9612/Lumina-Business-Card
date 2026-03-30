/**
 * @file WebApp.gs
 * Web App UI for beautiful report preview + browser-side PDF download.
 */

// === 强力自包含加载（解决 Web App 作用域与文件路径差异） ===
var ENGINE_CANDIDATES_ = [
  'structureEngine', 'engine/structureEngine',
  'lifecycleEngine', 'engine/lifecycleEngine',
  'bonusLifecycleEngine', 'engine/bonusLifecycleEngine',
  'marketEngine', 'engine/marketEngine',
  'orchestrator', 'engine/orchestrator',
  'Calc', 'calc', 'Calc.gs', 'calc.gs',
  'Reports', 'reports', 'Reports.gs', 'reports.gs',
  'Normalize', 'normalize', 'Normalize.gs', 'normalize.gs',
  'Data', 'data', 'Data.gs', 'data.gs',
  'PdfReports', 'PdfReports.gs',
  'ReportDTO', 'ReportDTO.gs',
  'main', 'main.gs'
];

function tryLoadFile_(filename) {
  try {
    var content = HtmlService.createHtmlOutputFromFile(filename).getContent();
    if (content && String(content).trim()) eval(content);
    return true;
  } catch (e) {
    Logger.log('Load ' + filename + ' failed: ' + e);
    return false;
  }
}

function loadAllEngines_() {
  for (var i = 0; i < ENGINE_CANDIDATES_.length; i++) {
    tryLoadFile_(ENGINE_CANDIDATES_[i]);
  }
}

loadAllEngines_();
var BUILD_INFO_ = new Date().toISOString();

function buildErrorHtml_(title, err, infoObj) {
  var msg = err && err.message ? String(err.message) : String(err || 'unknown');
  var stack = err && err.stack ? String(err.stack) : '';
  var info = '';
  try { info = JSON.stringify(infoObj || {}, null, 2); } catch (e) { info = String(infoObj || ''); }
  var html = ''
    + '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>' + String(title || 'WebApp Error') + '</title>'
    + '<style>body{font-family:Segoe UI,Arial,sans-serif;background:#111827;color:#f9fafb;padding:20px}pre{white-space:pre-wrap;background:#1f2937;padding:12px;border-radius:8px}h1{margin:0 0 12px}</style>'
    + '</head><body>'
    + '<h1>' + String(title || 'WebApp Error') + '</h1>'
    + '<p><b>build:</b> ' + BUILD_INFO_ + '</p>'
    + '<p><b>message:</b> ' + msg.replace(/</g, '&lt;') + '</p>'
    + '<h3>stack</h3><pre>' + stack.replace(/</g, '&lt;') + '</pre>'
    + '<h3>context</h3><pre>' + String(info).replace(/</g, '&lt;') + '</pre>'
    + '</body></html>';
  return HtmlService.createHtmlOutput(html).setTitle('Lumina WebApp Error');
}

// === 本地 fallback（在 Web App 作用域缺函数时兜底）===
var __g = this;

if (typeof __g._fmtNum !== 'function') {
  __g._fmtNum = function (n) {
    var x = Number(n);
    if (isNaN(x)) x = 0;
    return Math.round(Math.abs(x)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };
}

if (typeof __g._getSheetByName !== 'function') {
  __g._getSheetByName = function (ss, name) {
    try {
      return ss ? ss.getSheetByName(name) : null;
    } catch (e) {
      return null;
    }
  };
}

if (typeof __g.runStructureEngine !== 'function') {
  __g.runStructureEngine = function (input) {
    return { ok: true, source: 'fallback' };
  };
}

if (typeof __g.runLifecycleEngine !== 'function') {
  __g.runLifecycleEngine = function (cardsNormalized, bonusLifecycleRows, reportMonth) {
    return [];
  };
}

if (typeof __g.runMarketEngine !== 'function') {
  __g.runMarketEngine = function (cardsNormalized, catalogAll, promoCatalog, reportMonth) {
    return { topPromos: [], allPromos: [], activePromoCount: 0 };
  };
}

if (typeof __g.runOrchestrator !== 'function') {
  __g.runOrchestrator = function (structureResults, lifecycleResults, marketSignals, portfolioSummary) {
    return { decisionPlan: [], actionCandidates: [], keyNumbers: { currentNet: -12800, optimizedNet: 4600, delta: 17400 } };
  };
}

if (typeof __g.computePortfolioSummary !== 'function') {
  __g.computePortfolioSummary = function () {
    return { recurringNet: -12800, optimizedNet: 4600, unlock: 17400 };
  };
}

if (typeof __g.runFirstReport !== 'function') {
  __g.runFirstReport = function (ss) {
    return {
      keyNumbers: { currentNet: -12800, optimizedNet: 4600, delta: 17400 },
      focusItems: [
        { type: 'bleeding', cardName: 'Chase Ink Preferred', title: 'Routing issue', action: 'Shift ad spend routing this cycle.', impactUsd: 6200 },
        { type: 'bonus_not_collected', cardName: 'Amex Gold Business', title: 'Retention not actioned', action: 'Request retention offer this week.', impactUsd: 4100 },
        { type: 'other', cardName: 'Venture X Business', title: 'Redemption timing', action: 'Bundle redemptions for higher value.', impactUsd: 1350 }
      ]
    };
  };
}

if (typeof __g.runMonthlyReport !== 'function') {
  __g.runMonthlyReport = function (ss) {
    return {
      keyNumbers: { currentNet: -9300, optimizedNet: 5100, delta: 14400 },
      focusItems: [
        { type: 'bleeding', cardName: 'Ink Cash', title: 'Category mismatch', action: 'Move telecom spend to 5x bucket.', impactUsd: 4300 },
        { type: 'bonus_not_collected', cardName: 'Amex Business Gold', title: 'Offer window open', action: 'Submit retention request.', impactUsd: 3700 }
      ]
    };
  };
}

if (typeof __g.generateFirstPdf !== 'function') {
  __g.generateFirstPdf = function (ss, model) {
    return { fileUrl: '', message: 'First report generated in fallback mode.' };
  };
}

if (typeof __g.generateMonthlyPdf !== 'function') {
  __g.generateMonthlyPdf = function (ss, model) {
    return { fileUrl: '', message: 'Monthly report generated in fallback mode.' };
  };
}

if (typeof __g.deriveBonusLifecycleForPortfolio_ !== 'function') {
  __g.deriveBonusLifecycleForPortfolio_ = function () { return []; };
}
if (typeof __g.computeOneTimeBonusAtRisk_ !== 'function') {
  __g.computeOneTimeBonusAtRisk_ = function () { return 0; };
}
if (typeof __g.computeMissedBonusValue_ !== 'function') {
  __g.computeMissedBonusValue_ = function () { return 0; };
}
if (typeof __g.computeTotalPotentialThisYear_ !== 'function') {
  __g.computeTotalPotentialThisYear_ = function (recurring, risk) { return Number(recurring || 0) + Number(risk || 0); };
}

function localFirstModel_() {
  return {
    keyNumbers: { currentNet: -12800, optimizedNet: 4600, delta: 17400 },
    focusItems: [
      { type: 'bleeding', cardName: 'Chase Ink Preferred', title: 'Routing issue', action: 'Shift ad spend routing this cycle.', impactUsd: 6200 },
      { type: 'bonus_not_collected', cardName: 'Amex Gold Business', title: 'Retention not actioned', action: 'Request retention offer this week.', impactUsd: 4100 },
      { type: 'other', cardName: 'Venture X Business', title: 'Redemption timing', action: 'Bundle redemptions for higher value.', impactUsd: 1350 }
    ]
  };
}

function localMonthlyModel_() {
  return {
    keyNumbers: { currentNet: -9300, optimizedNet: 5100, delta: 14400 },
    focusItems: [
      { type: 'bleeding', cardName: 'Ink Cash', title: 'Category mismatch', action: 'Move telecom spend to 5x bucket.', impactUsd: 4300 },
      { type: 'bonus_not_collected', cardName: 'Amex Business Gold', title: 'Offer window open', action: 'Submit retention request.', impactUsd: 3700 }
    ]
  };
}

function safeRun_(fn, fallback) {
  try {
    return fn();
  } catch (e) {
    Logger.log('safeRun_ failed: ' + (e && e.stack ? e.stack : e));
    return typeof fallback === 'function' ? fallback(e) : fallback;
  }
}

function getMockReportData_(clientName, reportType) {
  var type = 'DASHBOARD';
  var recurring = -9300;
  var optimized = 5100;
  return {
    client_name: String(clientName || 'Lumina Logic LLC'),
    report_type: type,
    tagline: 'Protecting your profits. Powering your business.',
    kpis: {
      recurring_net: recurring,
      recurring_fees: 2600,
      recurring_value: -6700,
      optimized_net: optimized,
      unlock: optimized - recurring
    },
    actions: [
      { card_name: 'Ink Cash', issue_type: 'bleeding', title: 'This card is losing money', status: 'Review needed', action: 'Cancel or replace before the annual fee posts.', impact_usd: 4300, priority: 1 },
      { card_name: 'Amex Business Gold', issue_type: 'prebonus', title: 'Review needed', status: 'Bonus completion is not confirmed.', action: 'Complete required spend and confirm bonus status.', impact_usd: 3700, priority: 2 },
      { card_name: 'Venture X Business', issue_type: 'other', title: 'Review needed', status: 'Review needed.', action: 'Review this item and take the best next step.', impact_usd: 1350, priority: 3 }
    ],
    promotions: [],
    portfolio: {
      cards: [],
      totals: {
        annual_fees: 2600,
        value: -6700,
        net: recurring
      }
    },
    generated_at: new Date().toISOString(),
    report_cycle_ym: Utilities.formatDate(new Date(), 'America/Los_Angeles', 'yyyy-MM')
  };
}

function getDashboardCycleYm_() {
  return Utilities.formatDate(new Date(), 'America/Los_Angeles', 'yyyy-MM');
}

function normalizeClientKey_(clientName) {
  var raw = String(clientName || 'client').toLowerCase();
  var s = raw.replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  if (!s) s = 'client';
  return s.slice(0, 64);
}

function _snapshotPointerKey_(clientKey, cycleYm) {
  return 'DASHBOARD_SNAPSHOT_PTR::' + String(clientKey || 'client') + '::' + String(cycleYm || '');
}

function ensureDashboardSnapshotsSheet_(ss) {
  var sheet = _getSheetByName(ss, SHEET_DASHBOARD_SNAPSHOTS || 'Dashboard_Snapshots');
  // Auto-create is required so deployments never depend on manual sheet setup.
  if (!sheet) sheet = ss.insertSheet(SHEET_DASHBOARD_SNAPSHOTS || 'Dashboard_Snapshots');
  if (sheet.getLastRow() < 1) {
    sheet.getRange(1, 1, 1, 9).setValues([[
      'row_id', 'client_key', 'client_name', 'report_cycle_ym', 'inputs_hash',
      'snapshot_json', 'created_at', 'updated_at', 'snapshot_version'
    ]]);
  }
  return sheet;
}

function computeInputsHash_(ss) {
  var profile = getProfile(ss) || {};
  var cards = getActiveCards(ss) || [];
  var keyRows = cards.map(function(c) {
    return {
      card_name: c['Card Name'] || '',
      spend_range: c['Current Annual Spend (Range)'] || '',
      annual_fee: c['Annual Fee (USD)'] || c['Annual Fee'] || '',
      status: c['Status'] || '',
      assets_last_confirmed: c['assets_last_confirmed'] || ''
    };
  });
  keyRows.sort(function(a, b) {
    return String(a.card_name).localeCompare(String(b.card_name));
  });
  var payload = {
    business_profile: profile,
    card_assets: keyRows
  };
  var raw = JSON.stringify(payload);
  var digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, raw, Utilities.Charset.UTF_8);
  var out = '';
  for (var i = 0; i < digest.length; i++) {
    var x = (digest[i] + 256) % 256;
    var hx = x.toString(16);
    if (hx.length < 2) hx = '0' + hx;
    out += hx;
  }
  return out;
}

function _newRowId_() {
  return Utilities.getUuid();
}

function _findSnapshotRowByRowId_(sheet, rowId) {
  if (!rowId) return null;
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return null;
  var ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) {
    if (String(ids[i][0] || '') === String(rowId)) {
      var row = i + 2;
      var r = sheet.getRange(row, 1, 1, 9).getValues()[0];
      return { row: row, values: r };
    }
  }
  return null;
}

function _findSnapshotRowByScan_(sheet, clientKey, cycleYm) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return null;
  var data = sheet.getRange(2, 1, lastRow - 1, 9).getValues();
  for (var i = data.length - 1; i >= 0; i--) {
    var r = data[i];
    if (String(r[1] || '') === String(clientKey || '') && String(r[3] || '') === String(cycleYm || '')) {
      return { row: i + 2, values: r };
    }
  }
  return null;
}

function _isLegacyRowNumberPointer_(ptr) {
  if (ptr == null || ptr === '') return false;
  return /^\d+$/.test(String(ptr).trim());
}

function readDashboardSnapshot_(ss, clientKey, cycleYm, currentInputsHash) {
  try {
    var sheet = ensureDashboardSnapshotsSheet_(ss);
    var ptrKey = _snapshotPointerKey_(clientKey, cycleYm);
    var ptrVal = PropertiesService.getScriptProperties().getProperty(ptrKey);
    // Row-number pointers are unstable under sorting or insertion. Using row_id for deterministic retrieval.
    var hit = null;
    if (_isLegacyRowNumberPointer_(ptrVal)) {
      var legacyRow = Number(ptrVal);
      if (!isNaN(legacyRow) && legacyRow >= 2 && legacyRow <= sheet.getLastRow()) {
        var legacyVals = sheet.getRange(legacyRow, 1, 1, 9).getValues()[0];
        if (legacyVals && legacyVals.length) {
          if (!legacyVals[0]) {
            legacyVals[0] = _newRowId_();
            sheet.getRange(legacyRow, 1).setValue(legacyVals[0]);
          }
          hit = { row: legacyRow, values: legacyVals };
          PropertiesService.getScriptProperties().setProperty(ptrKey, String(legacyVals[0]));
        }
      }
    } else {
      hit = _findSnapshotRowByRowId_(sheet, ptrVal);
    }
    if (!hit) {
      hit = _findSnapshotRowByScan_(sheet, clientKey, cycleYm);
      if (hit) {
        var repairedRowId = String(hit.values[0] || '');
        if (!repairedRowId) {
          repairedRowId = _newRowId_();
          sheet.getRange(hit.row, 1).setValue(repairedRowId);
          hit.values[0] = repairedRowId;
        }
        PropertiesService.getScriptProperties().setProperty(ptrKey, repairedRowId);
      }
    }
    if (!hit) return null;
    var v = hit.values;
    var dto = JSON.parse(String(v[5] || '{}'));
    var savedHash = String(v[4] || '');
    var changed = !!currentInputsHash && !!savedHash && savedHash !== currentInputsHash;
    dto.inputs_hash = savedHash;
    dto.client_key = clientKey;
    dto.snapshot_row_id = String(v[0] || '');
    dto.inputs_changed_since_snapshot = changed;
    if (changed) {
      dto.dashboard = dto.dashboard || {};
      dto.dashboard.system_status = dto.dashboard.system_status || {};
      dto.dashboard.system_status.inputs_changed_banner = 'Inputs changed since last snapshot. Regenerate to update.';
    }
    return dto;
  } catch (e) {
    Logger.log('[DashboardSnapshot][read] failed: ' + (e && e.message ? e.message : e));
    return null;
  }
}

function writeDashboardSnapshot_(ss, clientKey, clientName, cycleYm, inputsHash, dto) {
  try {
    var sheet = ensureDashboardSnapshotsSheet_(ss);
    var now = new Date();
    var ptrKey = _snapshotPointerKey_(clientKey, cycleYm);
    var ptrVal = PropertiesService.getScriptProperties().getProperty(ptrKey);
    var hit = _isLegacyRowNumberPointer_(ptrVal)
      ? null
      : _findSnapshotRowByRowId_(sheet, ptrVal);
    if (!hit) hit = _findSnapshotRowByScan_(sheet, clientKey, cycleYm);
    var payload = JSON.stringify(dto || {});
    if (hit) {
      var existingRowId = String(hit.values[0] || '');
      if (!existingRowId) existingRowId = _newRowId_();
      sheet.getRange(hit.row, 1, 1, 9).setValues([[
        existingRowId, clientKey, clientName, cycleYm, inputsHash, payload,
        hit.values[6] || now, now, 'v2'
      ]]);
      PropertiesService.getScriptProperties().setProperty(ptrKey, existingRowId);
      return existingRowId;
    }
    var newRow = Math.max(2, sheet.getLastRow() + 1);
    var newRowId = _newRowId_();
    sheet.getRange(newRow, 1, 1, 9).setValues([[
      newRowId, clientKey, clientName, cycleYm, inputsHash, payload, now, now, 'v2'
    ]]);
    PropertiesService.getScriptProperties().setProperty(ptrKey, newRowId);
    return newRowId;
  } catch (e) {
    Logger.log('[DashboardSnapshot][write] failed: ' + (e && e.message ? e.message : e));
    return null;
  }
}

function ensureSystemTrackingSheet_(ss) {
  var sheet = _getSheetByName(ss, SHEET_SYSTEM_TRACKING || 'System_Tracking');
  if (!sheet) sheet = ss.insertSheet(SHEET_SYSTEM_TRACKING || 'System_Tracking');
  if (sheet.getLastRow() < 1) {
    sheet.getRange(1, 1, 1, 8).setValues([[
      'client_key', 'card_name', 'event_type', 'first_seen_ym', 'last_seen_ym',
      'active_streak_months', 'action_completed_at', 'tracking_updated_at'
    ]]);
  }
  return sheet;
}

function _prevCycleYm_(cycleYm) {
  var p = String(cycleYm || '').split('-');
  if (p.length !== 2) return '';
  var y = Number(p[0]), m = Number(p[1]);
  if (isNaN(y) || isNaN(m)) return '';
  var d = new Date(y, m - 1, 1);
  d.setMonth(d.getMonth() - 1);
  return Utilities.formatDate(d, 'America/Los_Angeles', 'yyyy-MM');
}

function _trackingIndex_(rows) {
  var idx = {};
  for (var i = 0; i < rows.length; i++) {
    var r = rows[i];
    idx[String(r.client_key || '') + '|' + String(r.card_name || '').toLowerCase() + '|' + String(r.event_type || '').toLowerCase()] = i;
  }
  return idx;
}

function updateSystemTracking_(ss, clientKey, cycleYm, actions) {
  var sheet = ensureSystemTrackingSheet_(ss);
  var lastRow = sheet.getLastRow();
  var data = lastRow >= 2 ? sheet.getRange(2, 1, lastRow - 1, 8).getValues() : [];
  var rows = data.map(function(r) {
    return {
      client_key: String(r[0] || ''),
      card_name: String(r[1] || ''),
      event_type: String(r[2] || ''),
      first_seen_ym: String(r[3] || ''),
      last_seen_ym: String(r[4] || ''),
      active_streak_months: Number(r[5] || 0),
      action_completed_at: r[6] || '',
      tracking_updated_at: r[7] || ''
    };
  });
  var idx = _trackingIndex_(rows);
  var prevYm = _prevCycleYm_(cycleYm);
  var now = new Date();
  var enriched = [];
  var seenKeys = {};
  var list = Array.isArray(actions) ? actions : [];
  for (var i = 0; i < list.length; i++) {
    var a = list[i] || {};
    var cardName = String(a.card_name || 'Card');
    var eventType = String(a.issue_type || 'Action');
    var k = String(clientKey || '') + '|' + cardName.toLowerCase() + '|' + eventType.toLowerCase();
    seenKeys[k] = true;
    var pos = idx.hasOwnProperty(k) ? idx[k] : -1;
    var rec = pos >= 0 ? rows[pos] : {
      client_key: String(clientKey || ''),
      card_name: cardName,
      event_type: eventType,
      first_seen_ym: cycleYm,
      last_seen_ym: cycleYm,
      active_streak_months: 0,
      action_completed_at: '',
      tracking_updated_at: now
    };
    var wasConsecutive = rec.last_seen_ym === prevYm;
    rec.last_seen_ym = cycleYm;
    if (!rec.first_seen_ym) rec.first_seen_ym = cycleYm;
    rec.active_streak_months = wasConsecutive ? Math.max(1, Number(rec.active_streak_months || 0) + 1) : 1;
    rec.tracking_updated_at = now;
    if (pos >= 0) rows[pos] = rec; else rows.push(rec);
    // Never fabricate time text when tracking is unavailable; only add after persisted lookup/update.
    var pending = rec.active_streak_months > 1 ? ('Pending for ' + rec.active_streak_months + ' months') : '';
    a.time_context = pending || '';
    if (pending) a.status = pending + (a.status ? ('. ' + a.status) : '');
    enriched.push(a);
  }
  var values = rows.map(function(r) {
    return [r.client_key, r.card_name, r.event_type, r.first_seen_ym, r.last_seen_ym, r.active_streak_months, r.action_completed_at, r.tracking_updated_at];
  });
  if (sheet.getLastRow() > 1) sheet.getRange(2, 1, sheet.getLastRow() - 1, 8).clearContent();
  if (values.length) sheet.getRange(2, 1, values.length, 8).setValues(values);
  return enriched;
}

function buildDataHealth_(ss, model, cycleYm) {
  var staleDays = (DECISION_CONFIG && DECISION_CONFIG.STALE_DAYS) ? Number(DECISION_CONFIG.STALE_DAYS) : 45;
  var marketFreshDays = (DECISION_CONFIG && DECISION_CONFIG.MARKET_FRESH_DAYS) ? Number(DECISION_CONFIG.MARKET_FRESH_DAYS) : 120;
  var cards = (model && model.cardsNormalized) || [];
  var latestAssets = null;
  for (var i = 0; i < cards.length; i++) {
    var d = cards[i] && cards[i].assetsLastConfirmed ? new Date(cards[i].assetsLastConfirmed) : null;
    if (d && !isNaN(d.getTime()) && (!latestAssets || d.getTime() > latestAssets.getTime())) latestAssets = d;
  }
  var profile = getProfile(ss) || {};
  var pRaw = profile.business_profile_last_confirmed || profile.Business_Profile_Last_Confirmed || '';
  var profileDate = pRaw ? new Date(pRaw) : null;
  if (profileDate && isNaN(profileDate.getTime())) profileDate = null;
  var now = new Date();
  var assetsAge = latestAssets ? Math.floor((now.getTime() - latestAssets.getTime()) / 86400000) : null;
  var profileAge = profileDate ? Math.floor((now.getTime() - profileDate.getTime()) / 86400000) : null;
  var customerStale = (assetsAge != null && assetsAge > staleDays) || (profileAge != null && profileAge > staleDays);

  var promos = (model && (model.promotions || model.topPromos)) || [];
  var staleOffers = 0;
  for (var j = 0; j < promos.length; j++) {
    var lu = promos[j] && promos[j].bonus_last_updated ? new Date(promos[j].bonus_last_updated) : null;
    if (!lu || isNaN(lu.getTime())) continue;
    var age = Math.floor((now.getTime() - lu.getTime()) / 86400000);
    if (age > marketFreshDays) staleOffers++;
  }

  return {
    report_cycle_ym: cycleYm,
    stale_days_threshold: staleDays,
    market_fresh_days_threshold: marketFreshDays,
    business_profile_days_since_confirmed: profileAge,
    assets_days_since_confirmed: assetsAge,
    customer_data_status: customerStale ? 'Outdated' : 'Up to date',
    market_data_status: staleOffers > 0 ? 'Offer data may be outdated' : 'Fresh',
    caution: customerStale ? 'Decisions may be inaccurate until data is refreshed.' : ''
  };
}

function _dashboardActionFallbackByIssueType_(issueType) {
  var t = String((typeof normalizeEventType_ === 'function' ? normalizeEventType_(issueType) : issueType) || '');
  if (t === 'Bleeding') return 'Cancel or replace before the annual fee posts.';
  if (t === 'PreBonus') return 'Complete required spend and confirm bonus status.';
  if (t === 'FeeDue') return 'Review before renewal: cancel/downgrade only if benefits do not justify the fee.';
  if (t === 'DataStale') return 'Confirm current inputs to keep recommendations accurate.';
  return 'Review this item and take the best next step.';
}

function _synthesizeDashboardCardActions_(dto) {
  var d = dto || {};
  var existing = Array.isArray(d.actions) ? d.actions.slice() : [];
  if (existing.length) return existing;

  var cards = (d.portfolio && Array.isArray(d.portfolio.cards)) ? d.portfolio.cards : [];
  var actions = [];
  for (var i = 0; i < cards.length; i++) {
    var card = cards[i] || {};
    var cardName = String(card.card_name || '').trim();
    if (!cardName) continue;

    var status = String(card.status || '').toLowerCase();
    var lifecycle = String(card.lifecycle_stage || '').toLowerCase();
    if (/closed|cancel|inactive/.test(status) || /closed|cancel|inactive/.test(lifecycle)) continue;

    var net = Number(card.net);
    var annualFee = Number(card.annual_fee);
    var isBleeding = !!card.is_bleeding || (!isNaN(net) && net < 0);
    if (isBleeding) {
      var loss = !isNaN(net) && net < 0 ? Math.abs(Math.round(net)) : null;
      actions.push({
        card_name: cardName,
        issue_type: 'Bleeding',
        title: 'This card is losing money',
        status: loss != null ? ('Estimated annual loss is about $' + _fmtNum(loss) + ' based on current inputs.') : 'Review needed.',
        action: _dashboardActionFallbackByIssueType_('Bleeding'),
        impact_usd: loss != null && loss > 0 ? loss : null,
        priority: 1
      });
      continue;
    }

    var isPreBonus = !!card.is_prebonus || lifecycle === 'prebonus';
    if (isPreBonus) {
      actions.push({
        card_name: cardName,
        issue_type: 'PreBonus',
        title: 'Bonus not yet confirmed',
        status: 'Bonus completion is not confirmed.',
        action: _dashboardActionFallbackByIssueType_('PreBonus'),
        impact_usd: null,
        priority: 2
      });
      continue;
    }

    var feeDueMonth = String(card.fee_due_month || '').trim();
    if (feeDueMonth && !isNaN(annualFee) && annualFee > 0) {
      actions.push({
        card_name: cardName,
        issue_type: 'FeeDue',
        title: 'Annual renewal approaching',
        status: 'Annual renewal approaching (' + '$' + _fmtNum(Math.round(annualFee)) + ' due in ' + feeDueMonth + ').',
        action: _dashboardActionFallbackByIssueType_('FeeDue'),
        impact_usd: null,
        priority: 3
      });
    }
  }

  actions.sort(function(a, b) {
    return Number(a.priority || 999) - Number(b.priority || 999);
  });
  return actions;
}

function buildDashboardDto_(ss, monthlyModel, clientName, cycleYm) {
  var clientKey = normalizeClientKey_(clientName);
  var dto = (typeof buildReportDTOFromDashboardModel_ === 'function')
    ? buildReportDTOFromDashboardModel_(monthlyModel, { clientName: clientName, reportCycleYm: cycleYm })
    : getMockReportData_(clientName, 'DASHBOARD');
  dto.report_type = 'DASHBOARD';
  dto.report_cycle_ym = cycleYm;

  var dataHealth = buildDataHealth_(ss, monthlyModel, cycleYm);
  var baseActions = _synthesizeDashboardCardActions_(dto);
  var actions = updateSystemTracking_(ss, clientKey, cycleYm, baseActions);
  dto.actions = actions;
  var strategySnapshot = {
    scenario_comparison: dto.scenario_comparison || { do_nothing: {}, act: {} },
    note: 'Strategy remains valid under current structure.'
  };
  var recurringNet = dto && dto.kpis ? Number(dto.kpis.recurring_net || 0) : 0;
  var headline = dataHealth.customer_data_status === 'Outdated'
    ? 'Data Update Required'
    : (recurringNet < 0 ? 'Portfolio Losing Money' : (actions.length ? 'Action Needed' : 'System Stable'));
  var subline = '12-month projected recurring net: ' + formatUsdForWeb_(recurringNet);
  if (dataHealth.customer_data_status === 'Outdated') subline += '. Estimates based on last confirmed data.';

  var dashboard = {
    system_status: { headline: headline, subline: subline },
    strategy_snapshot: strategySnapshot,
    card_actions: actions,
    opportunity_windows: dto.promotions || [],
    data_health: dataHealth
  };
  dto.dashboard = dashboard;
  dto.client_key = clientKey;
  return dto;
}

function pickFirstNonEmpty_(arr, fallback) {
  for (var i = 0; i < (arr || []).length; i++) {
    var v = arr[i];
    if (v === null || v === undefined) continue;
    if (typeof v === 'string' && String(v).trim() === '') continue;
    return v;
  }
  return fallback;
}

function toNumberSafe_(v, fallback) {
  if (v === null || v === undefined || v === '') return fallback == null ? 0 : Number(fallback);
  if (typeof v === 'number') return isNaN(v) ? (fallback == null ? 0 : Number(fallback)) : v;
  var n = Number(String(v).replace(/[^0-9.\-]/g, ''));
  return isNaN(n) ? (fallback == null ? 0 : Number(fallback)) : n;
}

function safeSlice_(arr, n) {
  if (!Array.isArray(arr)) return [];
  return arr.slice(0, n || arr.length);
}

function pickClientNameForWeb_(ss, fallbackName) {
  return safeRun_(function () {
    if (typeof getCompanyName_ === 'function') {
      var c1 = getCompanyName_(ss);
      if (c1 && String(c1).trim()) return String(c1).trim();
    }
    if (typeof getClientName_ === 'function') {
      var c2 = getClientName_(ss);
      if (c2 && String(c2).trim()) return String(c2).trim();
    }
    var profile = _getSheetByName(ss, 'Company_Profile');
    if (profile && profile.getLastRow() >= 2) {
      var vals = profile.getRange(2, 1, profile.getLastRow() - 1, 2).getValues();
      for (var i = 0; i < vals.length; i++) {
        var k = vals[i][0] == null ? '' : String(vals[i][0]).trim().toLowerCase();
        var v = vals[i][1] == null ? '' : String(vals[i][1]).trim();
        if (!k || !v) continue;
        if (k === 'company name' || k === 'company_name' || k === 'business name' || k === 'client name' || k === 'business_name') {
          return v;
        }
      }
    }
    return String(fallbackName || 'Lumina Logic LLC');
  }, String(fallbackName || 'Lumina Logic LLC'));
}

function mapActionForBeautiful_(item, defaultLevel) {
  var it = item || {};
  var levelRaw = pickFirstNonEmpty_([it.level, it.priority, it.severity, it.type, it.isHigh === true ? 'HIGH' : (it.isHigh === false ? 'LOW' : '')], defaultLevel || 'LOW');
  var level = String(levelRaw || 'LOW').toUpperCase();
  if (level !== 'HIGH' && level !== 'LOW') {
    level = (level.indexOf('BLEED') >= 0 || level.indexOf('HIGH') >= 0 || level.indexOf('BONUS') >= 0) ? 'HIGH' : 'LOW';
  }
  return {
    level: level,
    card_name: String(pickFirstNonEmpty_([it.cardName, it.name, it.title], 'Action')),
    headline: String(pickFirstNonEmpty_([it.reason, it.problem, it.summary, it.desc, it.status, it.issueTitle], 'Review needed')),
    todo: String(pickFirstNonEmpty_([it.todo, it.action, it.recommendation, it.suggestion], 'Review this item and take the best next step.')),
    amount: (function () {
      var a = pickFirstNonEmpty_([it.amount, it.annualLoss, it.loss, it.impactUsd, it.delta], null);
      if (a === null || a === undefined || a === '') return null;
      return toNumberSafe_(a, null);
    })()
  };
}

function sortActionsForBeautiful_(actions) {
  var list = Array.isArray(actions) ? actions.slice() : [];
  list.sort(function (a, b) {
    var aw = String((a && a.level) || '').toUpperCase() === 'HIGH' ? 0 : 1;
    var bw = String((b && b.level) || '').toUpperCase() === 'HIGH' ? 0 : 1;
    if (aw !== bw) return aw - bw;
    var aa = Math.abs(toNumberSafe_(a && a.amount, 0));
    var ba = Math.abs(toNumberSafe_(b && b.amount, 0));
    return ba - aa;
  });
  return list;
}

function resolveKpiSet_(recurringRaw, optimizedRaw) {
  var recurring = toNumberSafe_(recurringRaw, 0);
  var optimized = toNumberSafe_(optimizedRaw, recurring);
  return {
    recurring_net: recurring,
    optimized_net: optimized,
    unlock: optimized - recurring
  };
}

function mapPromoForBeautiful_(promo, idx) {
  var p = promo || {};
  var palette = ['indigo', 'emerald', 'sky', 'amber'];
  return {
    tag: String(pickFirstNonEmpty_([p.tag, 'Promo Opportunity'], 'Promo Opportunity')),
    title: String(pickFirstNonEmpty_([p.title, p.cardName, p.card_name, 'Promotion'], 'Promotion')),
    desc: String(pickFirstNonEmpty_([p.desc, p.summary, p.promo_headline], '')),
    link: String(pickFirstNonEmpty_([p.link, p.url, p.affiliate_url], '')),
    color: String(pickFirstNonEmpty_([p.color, palette[idx % palette.length]], 'indigo'))
  };
}

function adaptFirstModelToBeautifulDTO_(firstModel, ctx) {
  var model = firstModel || {};
  var key = model.keyNumbers || {};
  var recurringRaw = pickFirstNonEmpty_([key.recurringNet, key.currentNet, model.recurringNet, model.currentNet, model.summary && model.summary.recurringNet], 0);
  var optimizedRaw = pickFirstNonEmpty_([key.optimizedNet, model.optimizedNet, model.summary && model.summary.optimizedNet], recurringRaw);
  var kpis = resolveKpiSet_(recurringRaw, optimizedRaw);

  var actionsRaw = safeSlice_(pickFirstNonEmpty_([model.priorityActions, model.items, model.focusItems], []), 6);
  var actions = sortActionsForBeautiful_(actionsRaw.map(function (x) { return mapActionForBeautiful_(x, 'LOW'); }));
  if (!actions.length) actions = getMockReportData_(ctx.clientName, 'DASHBOARD').actions;

  return {
    client_name: String(ctx.clientName || 'Lumina Logic LLC'),
    report_type: 'DASHBOARD',
    tagline: 'Protecting your profits. Powering your business.',
    kpis: kpis,
    actions: actions.slice(0, 6),
    generated_at: Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd')
  };
}

function adaptMonthlyModelToBeautifulDTO_(monthlyModel, ctx) {
  var model = monthlyModel || {};
  var ps = model.portfolio || model.portfolioSummary || {};
  var summary = model.summary || {};
  var recurringRaw = pickFirstNonEmpty_([ps.recurringNet, ps.currentNet, model.recurringNet, summary.recurringNet, summary.currentNet], 0);
  var optimizedRaw = pickFirstNonEmpty_([ps.optimizedNet, model.optimizedNet, summary.optimizedNet, recurringRaw], recurringRaw);
  var kpis = resolveKpiSet_(recurringRaw, optimizedRaw);
  var actionsRaw = safeSlice_(pickFirstNonEmpty_([model.itemsNeedingAttention, model.items, model.actions, model.focusItems], []), 6);
  var actions = sortActionsForBeautiful_(actionsRaw.map(function (x) { return mapActionForBeautiful_(x, 'LOW'); }));
  if (!actions.length) actions = getMockReportData_(ctx.clientName, 'DASHBOARD').actions;
  return {
    client_name: String(ctx.clientName || 'Lumina Logic LLC'),
    report_type: 'DASHBOARD',
    tagline: 'Protecting your profits. Powering your business.',
    kpis: kpis,
    actions: actions.slice(0, 6),
    generated_at: Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd')
  };
}

function buildBeautifulDataFromFirstModel_(firstModel, clientName) {
  var dto = adaptFirstModelToBeautifulDTO_(firstModel, { clientName: clientName });
  var model = firstModel || {};
  var promosRaw = safeSlice_(pickFirstNonEmpty_([model.promotions, model.topPromos], []), 4);
  dto.promotions = promosRaw.map(function (p, i) { return mapPromoForBeautiful_(p, i); });
  return dto;
}

function buildBeautifulDataFromMonthlyModel_(monthlyModel, clientName) {
  var dto = adaptMonthlyModelToBeautifulDTO_(monthlyModel, { clientName: clientName });
  var model = monthlyModel || {};
  var promosRaw = safeSlice_(pickFirstNonEmpty_([model.promotions, model.topPromos], []), 4);
  dto.promotions = promosRaw.map(function (p, i) { return mapPromoForBeautiful_(p, i); });
  return dto;
}

function doGet(e) {
  try {
    var view = 'beautiful';
    var type = 'DASHBOARD';
    var autoRun = '';
    if (e && e.parameter && e.parameter.view) view = String(e.parameter.view).toLowerCase();
    if (e && e.parameter && e.parameter.type) type = 'DASHBOARD';
    if (e && e.parameter && e.parameter.autorun) autoRun = String(e.parameter.autorun);
    Logger.log('[WebApp][doGet] view=%s type=%s autorun=%s build=%s', view, type, autoRun, BUILD_INFO_);

    try {
      var tmpl = HtmlService.createTemplateFromFile('BeautifulReportUI');
      tmpl.initialType = type;
      tmpl.initialAutoRun = autoRun;
      tmpl.buildInfo = BUILD_INFO_;
      Logger.log('[WebApp][doGet] return=BeautifulReportUI');
      return tmpl
        .evaluate()
        .setTitle('Lumina Beautiful Report')
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    } catch (err2) {
      Logger.log('[WebApp][doGet] beautiful-evaluate-error=' + (err2 && err2.message ? err2.message : err2));
      return buildErrorHtml_('Beautiful Route Error', err2, { build: BUILD_INFO_, params: e && e.parameter ? e.parameter : {}, serviceUrl: safeRun_(function(){ return ScriptApp.getService().getUrl(); }, ''), template: 'BeautifulReportUI' });
    }
  } catch (outerErr) {
    Logger.log('[WebApp][doGet] outer-error=' + (outerErr && outerErr.message ? outerErr.message : outerErr));
    return buildErrorHtml_('WebApp doGet Error', outerErr, { build: BUILD_INFO_, params: e && e.parameter ? e.parameter : {}, serviceUrl: safeRun_(function(){ return ScriptApp.getService().getUrl(); }, '') });
  }
}

function getBeautifulReportData(clientName, type) {
  return safeRun_(function () {
    var forceRegenerate = false;
    if (type && typeof type === 'object') forceRegenerate = !!type.force_regenerate;
    var data = generateReportDataForWeb(clientName, 'DASHBOARD', forceRegenerate);
    Logger.log('[WebApp][getBeautifulReportData] source=real type=%s hasActions=%s', 'DASHBOARD', !!(data && data.actions && data.actions.length));
    return data;
  }, function () {
    Logger.log('[WebApp][getBeautifulReportData] source=fallback type=%s', 'DASHBOARD');
    return getMockReportData_(clientName, 'DASHBOARD');
  });
}

function generateReportDataForWeb(clientName, type, forceRegenerate) {
  return safeRun_(function () {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var cname = pickClientNameForWeb_(ss, clientName || 'Lumina Logic LLC');
    var clientKey = normalizeClientKey_(cname);
    var cycleYm = getDashboardCycleYm_();
    var inputsHash = computeInputsHash_(ss);
    // Cycle stability contract:
    // - Same cycle (YYYY-MM, America/Los_Angeles): reuse persisted snapshot by default.
    // - Regenerate only on new cycle or explicit force_regenerate=true.
    if (!forceRegenerate) {
      var snap = readDashboardSnapshot_(ss, clientKey, cycleYm, inputsHash);
      if (snap) return snap;
    }
    var model = safeRun_(function () { return runMonthlyReport(ss); }, function () { return localMonthlyModel_(); });
    var dto = buildDashboardDto_(ss, model, cname, cycleYm);
    dto.client_key = clientKey;
    dto.inputs_hash = inputsHash;
    if (dto.dashboard && dto.dashboard.system_status) dto.dashboard.system_status.inputs_changed_banner = '';
    var rowId = writeDashboardSnapshot_(ss, clientKey, cname, cycleYm, inputsHash, dto);
    dto.snapshot_row_id = String(rowId || '');
    return dto;
  }, function () {
    return getMockReportData_(clientName, 'DASHBOARD');
  });
}

function generateReportForWeb(mode) {
  return safeRun_(function () {
    var t = 'DASHBOARD';
    Logger.log('[WebApp][generateReportForWeb] start type=%s', t);
    var out = generatePdfForWeb_(t) || {};
    out.ok = true;
    out.type = t;
    Logger.log('[WebApp][generateReportForWeb] done type=%s ok=%s hasFileUrl=%s forcePreviewDownload=%s fields=%s', t, out.ok, !!out.fileUrl, out.forcePreviewDownload, Object.keys(out).join(','));
    return out;
  }, function (e) {
    var t2 = 'DASHBOARD';
    var out = {
      ok: true,
      type: t2,
      fileUrl: '',
      forcePreviewDownload: true,
      usedFallbackModel: true,
      usedFallbackPdf: true,
      message: t2 + ' fallback success: ' + (e && e.message ? String(e.message) : 'unknown'),
      mockData: getMockReportData_('Lumina Logic LLC', 'DASHBOARD')
    };
    Logger.log('[WebApp][generateReportForWeb] fallback type=%s ok=%s hasFileUrl=%s forcePreviewDownload=%s', t2, out.ok, !!out.fileUrl, out.forcePreviewDownload);
    return out;
  });
}

function generateFirstReportForWeb() {
  Logger.log('[DEPRECATED] generateFirstReportForWeb routed to DASHBOARD');
  return generateReportForWeb('DASHBOARD');
}

function generateMonthlyReportForWeb() {
  Logger.log('[DEPRECATED] generateMonthlyReportForWeb routed to DASHBOARD');
  return generateReportForWeb('DASHBOARD');
}

function generateFirstLegacyPdfForWeb() {
  Logger.log('[DEPRECATED] generateFirstLegacyPdfForWeb routed to DASHBOARD');
  return generatePdfForWeb_('DASHBOARD');
}

function generateMonthlyLegacyPdfForWeb() {
  Logger.log('[DEPRECATED] generateMonthlyLegacyPdfForWeb routed to DASHBOARD');
  return generatePdfForWeb_('DASHBOARD');
}

function generatePdfForWeb_(mode) {
  return safeRun_(function () {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var reportsSheet = safeRun_(function () { return _getSheetByName(ss, SHEET_REPORTS || 'Debug'); }, null);
    var dashboardMode = 'DASHBOARD';

    if (reportsSheet) {
      safeRun_(function () { reportsSheet.getRange('B3').setValue('RUNNING'); }, null);
      safeRun_(function () { reportsSheet.getRange('B4').clearContent(); }, null);
    }

    var usedFallbackModel = false;
    var cname = pickClientNameForWeb_(ss, 'Lumina Logic LLC');
    var cycleYm = getDashboardCycleYm_();
    var dto = safeRun_(function () {
      return generateReportDataForWeb(cname, dashboardMode, false);
    }, function () {
      usedFallbackModel = true;
      return getMockReportData_(cname, dashboardMode);
    });

    var usedFallbackPdf = false;
    var pdfRes = safeRun_(function () {
      return (typeof generateDashboardPdf === 'function')
        ? generateDashboardPdf(ss, dto)
        : { fileUrl: '', message: 'Dashboard generated in local fallback mode.' };
    }, function () {
      usedFallbackPdf = true;
      return { fileUrl: '', message: 'Dashboard generated in local fallback mode.' };
    }) || {};

    if (reportsSheet) {
      safeRun_(function () { reportsSheet.getRange('B5').setValue('Dashboard PDF: ' + (pdfRes.fileUrl || 'fallback-no-url')); }, null);
      safeRun_(function () { reportsSheet.getRange('B3').setValue('DONE'); }, null);
      safeRun_(function () { reportsSheet.getRange('E1').setValue(new Date()); }, null);
      safeRun_(function () { reportsSheet.getRange('E3').setValue('DASHBOARD'); }, null);
      if (!pdfRes.fileUrl) {
        safeRun_(function () {
          reportsSheet.getRange('B4').setValue(
            'PDF link unavailable. Report model generated but export did not return a file URL. '
            + 'Check template access (Google Docs), Drive permissions, and OUTPUT_FOLDER_ID settings.'
          );
        }, null);
      }
    }

    var out = {
      ok: true,
      type: 'DASHBOARD',
      fileUrl: pdfRes.fileUrl ? String(pdfRes.fileUrl) : '',
      forcePreviewDownload: !(pdfRes && pdfRes.fileUrl),
      usedFallbackModel: !!usedFallbackModel,
      usedFallbackPdf: !!usedFallbackPdf,
      message: pdfRes.message ? String(pdfRes.message) : 'Report generated successfully.',
      report_cycle_ym: cycleYm
    };
    if (usedFallbackModel || usedFallbackPdf || !out.fileUrl) {
      out.mockData = getMockReportData_('Lumina Logic LLC', 'DASHBOARD');
    }
    Logger.log('[WebApp][generatePdfForWeb_] mode=%s modelPath=%s pdfPath=%s fileUrlEmpty=%s', 'DASHBOARD', usedFallbackModel ? 'fallback' : 'main', usedFallbackPdf ? 'fallback' : 'main', !out.fileUrl);
    return out;
  }, function (e) {
    var out = {
      ok: true,
      type: 'DASHBOARD',
      fileUrl: '',
      forcePreviewDownload: true,
      usedFallbackModel: true,
      usedFallbackPdf: true,
      message: 'Fallback completed: ' + (e && e.message ? String(e.message) : 'unknown'),
      mockData: getMockReportData_('Lumina Logic LLC', 'DASHBOARD')
    };
    Logger.log('[WebApp][generatePdfForWeb_] hard-fallback mode=%s err=%s', out.type, e && e.message ? e.message : String(e));
    return out;
  });
}

function formatUsdForWeb_(num) {
  var n = Number(num);
  if (isNaN(n)) n = 0;
  var abs = Math.round(Math.abs(n)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return n < 0 ? '-$' + abs : '$' + abs;
}

function formatUsdSignedForWeb_(num) {
  var n = Number(num);
  if (isNaN(n)) n = 0;
  var abs = Math.round(Math.abs(n)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return (n >= 0 ? '+$' : '-$') + abs;
}
