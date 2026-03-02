/**
 * @file Data.gs
 * Read Company_Profile, Card_Assets (Active), Card_Catalog.
 */

var SHEET_PROFILE = 'Company_Profile';
var SHEET_ASSETS = 'Card_Assets';
var SHEET_CATALOG = 'Card_Catalog';
var SHEET_REPORTS = 'Debug';
var SHEET_SNAPSHOTS = 'Snapshots';
var SHEET_MONTHLY_EVENTS = 'Monthly_Events';
var SHEET_MONTHLY_REPORT = 'Monthly Health Report';
var SHEET_PROMO_CATALOG = 'Promo_Catalog';

function _isTestDataEnv_() {
  // Deprecated: environment switching removed. Always use production-named tabs.
  return false;
}

function getSheetName_(baseName) {
  var b = String(baseName || '').trim();
  // Environment switching removed: always resolve to canonical sheet names.
  return b;
}

function _getSheetByName(ss, name) {
  var sheet = ss.getSheetByName(name);
  if (sheet) return sheet;
  var sheets = ss.getSheets();
  var lower = String(name).toLowerCase().trim();
  for (var i = 0; i < sheets.length; i++) {
    if (String(sheets[i].getName()).toLowerCase().trim() === lower) return sheets[i];
  }
  return null;
}

function _getSheetData(sheet) {
  if (!sheet) return [];
  try {
    var range = sheet.getDataRange();
    return range.getValues();
  } catch (e) {
    return [];
  }
}

function _headerIndex(headers, name) {
  var lower = String(name).toLowerCase().trim();
  for (var i = 0; i < headers.length; i++) {
    if (headers[i] != null && String(headers[i]).toLowerCase().trim() === lower) return i;
  }
  return -1;
}

function getProfile(ss) {
  var sheet = _getSheetByName(ss, SHEET_PROFILE);
  var data = _getSheetData(sheet);
  var profile = {};
  for (var i = 0; i < data.length; i++) {
    var key = data[i][0];
    if (key === null || key === '' || String(key).trim() === '') continue;
    profile[String(key).trim()] = data[i][1];
  }
  return profile;
}

/**
 * @return {Array.<Object>} cards: rows from Card_Assets with Status=Active; keys = header row.
 */
function getActiveCards(ss) {
  var assetsSheetName = getSheetName_(SHEET_ASSETS);
  var sheet = _getSheetByName(ss, assetsSheetName);
  if (!sheet) throw new Error('Card Assets sheet not found: ' + assetsSheetName);
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  var lastCol = Math.max(sheet.getLastColumn(), 10);
  var data = sheet.getRange(1, 1, lastRow, lastCol).getValues();
  var headers = data[0];
  var statusCol = _headerIndex(headers, 'Status');
  if (statusCol < 0) statusCol = _headerIndex(headers, '状态');
  if (statusCol < 0) {
    for (var s = 0; s < headers.length; s++) {
      if (headers[s] != null && String(headers[s]).toLowerCase().indexOf('status') >= 0) { statusCol = s; break; }
    }
  }
  var nameCol = _headerIndex(headers, 'Card Name');
  if (nameCol < 0) nameCol = _headerIndex(headers, 'Card name');
  if (nameCol < 0) nameCol = _headerIndex(headers, '卡片名称');
  var spendCol = _headerIndex(headers, 'Current Annual Spend (Range)');
  if (spendCol < 0) spendCol = _headerIndex(headers, 'Spend Range');
  if (spendCol < 0) spendCol = _headerIndex(headers, 'Annual Spend');
  var confirmedCol = _headerIndex(headers, 'assets_last_confirmed');
  var cards = [];
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var cardNameVal = nameCol >= 0 && nameCol < row.length ? row[nameCol] : null;
    if (cardNameVal == null || String(cardNameVal).trim() === '') continue;
    if (statusCol >= 0 && statusCol < row.length) {
      var statusVal = row[statusCol];
      var statusStr = (statusVal == null ? '' : String(statusVal)).replace(/\s/g, '').toLowerCase();
      if (statusStr.indexOf('inactive') >= 0 || statusStr.indexOf('closed') >= 0 || statusStr.indexOf('cancel') >= 0 || statusStr === 'no' || statusStr === '否') continue;
    }
    var obj = {};
    for (var j = 0; j < headers.length; j++) {
      var h = headers[j];
      var key = h != null && String(h).trim() !== '' ? String(h).trim() : ('Col' + j);
      obj[key] = j < row.length ? row[j] : null;
    }
    obj['Card Name'] = cardNameVal;
    if (spendCol >= 0 && spendCol < row.length) obj['Current Annual Spend (Range)'] = row[spendCol];
    if (confirmedCol >= 0 && confirmedCol < row.length) obj['assets_last_confirmed'] = row[confirmedCol];
    cards.push(obj);
  }
  var debugReportSheet = _getSheetByName(ss, SHEET_REPORTS || 'Debug');
  if (debugReportSheet) {
    var ts = new Date().toISOString().slice(0, 19);
    debugReportSheet.getRange('H2').setValue('DEBUG assetsSheet=' + assetsSheetName + ' | activeCards=' + cards.length + ' | ts=' + ts);
  }
  return cards;
}

/**
 * @return {Object} map: key = Card Name, value = { Issuer, Annual Fee (USD), Base Return (Conservative), Typical Bonus Value (USD), Bonus Level, Downgrade Option, Notes, catalog_updated_at, data_confidence, bonus_last_updated, bonus_valid_until, best_for_categories, annual_fee_current, product_type }
 */
function getCatalogMap(ss) {
  var sheet = _getSheetByName(ss, getSheetName_(SHEET_CATALOG));
  var data = _getSheetData(sheet);
  if (data.length < 2) return {};
  var headers = data[0];
  var nameIdx = _headerIndex(headers, 'Card Name');
  if (nameIdx < 0) nameIdx = _headerIndex(headers, 'Card name');
  if (nameIdx < 0) nameIdx = _headerIndex(headers, '卡片名称');
  if (nameIdx < 0) return {};
  var keyNames = ['Issuer', 'Annual Fee (USD)', 'Base Return (Conservative)', 'Typical Bonus Value (USD)', 'Bonus Level', 'Downgrade Option', 'Notes', 'catalog_updated_at', 'data_confidence', 'bonus_last_updated', 'bonus_valid_until', 'best_for_categories', 'annual_fee_current', 'product_type'];
  var keyAliases = {
    'Annual Fee (USD)': ['Annual Fee (USD)', 'Annual Fee', '年费', 'Fee'],
    'Base Return (Conservative)': ['Base Return (Conservative)', 'Base Return', '回报率'],
    'bonus_last_updated': ['bonus_last_updated', 'bonus last updated', 'last updated', 'updated'],
    'bonus_valid_until': ['bonus_valid_until', 'bonus valid until', 'valid until'],
    'catalog_updated_at': ['catalog_updated_at', 'catalog updated at', 'updated at'],
    'data_confidence': ['data_confidence', 'data confidence', 'confidence'],
    'best_for_categories': ['best_for_categories', 'best for categories', 'categories'],
    'annual_fee_current': ['annual_fee_current', 'annual fee current', 'fee current'],
    'product_type': ['product_type', 'product type', 'type']
  };
  var indices = {};
  for (var kk = 0; kk < keyNames.length; kk++) {
    var kn = keyNames[kk];
    indices[kn] = _headerIndex(headers, kn);
    if (indices[kn] < 0 && keyAliases[kn]) {
      for (var a = 0; a < keyAliases[kn].length; a++) {
        var idx = _headerIndex(headers, keyAliases[kn][a]);
        if (idx >= 0) { indices[kn] = idx; break; }
      }
    }
  }
  var map = {};
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var cardName = row[nameIdx];
    if (cardName === null || cardName === '') continue;
    var key = String(cardName).trim();
    var rec = {};
    for (var kk = 0; kk < keyNames.length; kk++) {
      var kn = keyNames[kk];
      var idx = indices[kn];
      var val = idx >= 0 ? row[idx] : undefined;
      if (val === null || val === '' || (typeof val === 'string' && String(val).trim() === '')) {
        rec[kn] = null;
      } else {
        rec[kn] = val;
      }
    }
    map[key] = rec;
  }
  return map;
}

/**
 * Find catalog record by card name (trim + case-insensitive match).
 */
function findCatalogRecord(catalogMap, cardName) {
  if (!cardName || !catalogMap) return undefined;
  var key = String(cardName).trim();
  if (catalogMap[key] !== undefined) return catalogMap[key];
  var lower = key.toLowerCase();
  for (var k in catalogMap) {
    if (catalogMap.hasOwnProperty(k) && String(k).trim().toLowerCase() === lower)
      return catalogMap[k];
  }
  return undefined;
}

/**
 * @return {Array.<Array>} Raw catalog data (including header row) for market engine.
 */
function getCatalogAll(ss) {
  var sheet = _getSheetByName(ss, getSheetName_(SHEET_CATALOG));
  return _getSheetData(sheet);
}

/**
 * @return {Array.<Object>} rows from Promo_Catalog mapped by header.
 */
function getPromoCatalog(ss) {
  var sheet = _getSheetByName(ss, getSheetName_(SHEET_PROMO_CATALOG));
  if (!sheet) return [];
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  var maxCol = sheet.getLastColumn();
  if (maxCol < 1) return [];
  var headerRow = sheet.getRange(1, 1, 1, maxCol).getValues()[0];
  var headerWidth = headerRow.length;
  while (headerWidth > 0) {
    var hv = headerRow[headerWidth - 1];
    if (hv != null && String(hv).trim() !== '') break;
    headerWidth--;
  }
  if (headerWidth <= 0) return [];
  var data = sheet.getRange(1, 1, lastRow, headerWidth).getValues();
  if (data.length < 2) return [];
  var headers = data[0];
  if (_isPromoDebugEnabled_()) {
    var promoIdColIdx = _findHeaderIndexByAliases_(headers, ['promo_id', 'promo id', 'id']);
    var cardNameColIdx = _findHeaderIndexByAliases_(headers, ['card_name', 'card name', 'card']);
    Logger.log('[PromoCatalog][Dump] promo_id_col=' + (promoIdColIdx >= 0 ? (promoIdColIdx + 1) : -1) +
      ', card_name_col=' + (cardNameColIdx >= 0 ? (cardNameColIdx + 1) : -1));
    var dumpEnd = Math.min(lastRow, 15);
    for (var rr = 2; rr <= dumpEnd; rr++) {
      var rowVals = data[rr - 1] || [];
      var objDump = {};
      for (var dj = 0; dj < headerWidth; dj++) {
        var k = headers[dj] != null && String(headers[dj]).trim() !== '' ? String(headers[dj]).trim() : ('Col' + dj);
        objDump[k] = dj < rowVals.length ? rowVals[dj] : '';
      }
      var dumpId = _toStringOrEmpty_(_getPromoField_(objDump, ['promo_id', 'promo id', 'id']));
      var dumpCard = _toStringOrEmpty_(_getPromoField_(objDump, ['card_name', 'card name', 'card']));
      var dumpLevel = _toStringOrEmpty_(_getPromoField_(objDump, ['promo_level', 'promo level', 'level']));
      var dumpValue = _toStringOrEmpty_(_getPromoField_(objDump, ['bonus_value_est_usd', 'bonus value est usd', 'bonus value', 'est bonus value']));
      Logger.log('[PromoCatalog][Dump] row=' + rr + ' id=' + dumpId + ' card=' + dumpCard + ' level=' + dumpLevel + ' value=' + dumpValue);
    }
  }
  var out = [];
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var isEmpty = true;
    var obj = {};
    for (var j = 0; j < headerWidth; j++) {
      var key = headers[j] != null && String(headers[j]).trim() !== '' ? String(headers[j]).trim() : ('Col' + j);
      var val = j < row.length ? row[j] : '';
      if (val != null && String(val).trim() !== '') isEmpty = false;
      obj[key] = val;
    }
    if (isEmpty) continue;
    var promoIdRaw = _getPromoField_(obj, ['promo_id', 'promo id', 'id']);
    var cardNameRaw = _getPromoField_(obj, ['card_name', 'card name', 'card']);
    if (_toStringOrEmpty_(promoIdRaw).trim() === '' || _toStringOrEmpty_(cardNameRaw).trim() === '') continue;
    out.push(obj);
  }
  if (_isPromoDebugEnabled_()) {
    var startA1 = 'A1';
    var endA1 = _a1ColLabel_(headerWidth) + String(lastRow);
    Logger.log('[PromoCatalog][Debug] spreadsheetId=' + (ss && ss.getId ? ss.getId() : ''));
    Logger.log('[PromoCatalog][Debug] promotionSheetName=' + sheet.getName());
    Logger.log('[PromoCatalog][Debug] lastRow=' + lastRow + ', lastCol=' + maxCol + ', headerWidth=' + headerWidth);
    Logger.log('[PromoCatalog][Debug] readRange=' + startA1 + ':' + endA1);
    Logger.log('[PromoCatalog][Raw] total rows=' + out.length);
    _logGoldPromoDiagnostics_('[PromoCatalog][Raw]', out);
  }
  return normalizePromos_(out);
}

function normalizePromos_(rows) {
  if (!rows || rows.length === 0) return [];
  var out = rows.map(function(r) {
    var rec = {};
    rec.promo_id = _getPromoField_(r, ['promo_id', 'promo id', 'id']);
    rec.status = _normPromoStatus_(_getPromoField_(r, ['status']));
    rec.promo_start_date = _toDateOrNull_(_getPromoField_(r, ['promo_start_date', 'promo start date', 'start_date', 'start date']));
    rec.promo_end_date = _toDateOrNull_(_getPromoField_(r, ['promo_end_date', 'promo end date', 'end_date', 'end date']));
    rec.promo_last_checked_at = _toDateOrNull_(_getPromoField_(r, ['promo_last_checked_at', 'promo last checked at', 'last_checked_at', 'last checked at']));
    rec.promo_level = _normPromoLevel_(_getPromoField_(r, ['promo_level', 'promo level', 'level']));
    rec.time_window_days = _toIntOrZero_(_getPromoField_(r, ['time_window_days', 'time window days', 'window_days', 'window days']));
    rec.bonus_value_est_usd = _toNumberOrZero_(_getPromoField_(r, ['bonus_value_est_usd', 'bonus value est usd', 'bonus value', 'est bonus value']));
    rec.card_name = _toStringOrEmpty_(_getPromoField_(r, ['card_name', 'card name', 'card']));
    rec.issuer = _toStringOrEmpty_(_getPromoField_(r, ['issuer']));
    rec.promo_headline = _toStringOrEmpty_(_getPromoField_(r, ['promo_headline', 'promo headline', 'headline']));
    rec.affiliate_url = _toStringOrEmpty_(_getPromoField_(r, ['affiliate_url', 'affiliate url', 'apply_link', 'apply link', 'url']));
    return rec;
  });
  if (_isPromoDebugEnabled_()) {
    Logger.log('[PromoCatalog][Normalized] total rows=' + out.length);
    _logGoldPromoDiagnostics_('[PromoCatalog][Normalized]', out);
    Logger.log('[PromoCatalog] sample ids: ' + out.slice(0, 5).map(function(p) { return p.promo_id; }).join(', '));
  }
  return out;
}

function filterActivePromos_(promos, now) {
  var n = now instanceof Date ? now : new Date();
  if (!promos || promos.length === 0) return [];
  var kept = [];
  for (var i = 0; i < promos.length; i++) {
    var p = promos[i];
    var keep = true;
    var reason = '';
    if ((p.status || 'Active') !== 'Active') {
      keep = false;
      reason = 'status!=Active';
    } else if (p.promo_end_date && n.getTime() > p.promo_end_date.getTime()) {
      keep = false;
      reason = 'promo_end_date<now';
    } else if (p.promo_start_date && n.getTime() < p.promo_start_date.getTime()) {
      keep = false;
      reason = 'promo_start_date>now';
    }
    if (keep) kept.push(p);

    var cardName = _toStringOrEmpty_(p.card_name).trim().toLowerCase();
    if (cardName === 'amex business gold') {
      if (keep) {
        Logger.log('[PromoCatalog][ActiveFilter][Gold][KEPT] id=' + _toStringOrEmpty_(p.promo_id) +
          ', status=' + _toStringOrEmpty_(p.status) +
          ', level=' + _toStringOrEmpty_(p.promo_level) +
          ', value=' + _toStringOrEmpty_(p.bonus_value_est_usd) +
          ', start=' + _fmtPromoDiagDate_(p.promo_start_date) +
          ', end=' + _fmtPromoDiagDate_(p.promo_end_date));
      } else {
        Logger.log('[PromoCatalog][ActiveFilter][Gold][FILTERED] id=' + _toStringOrEmpty_(p.promo_id) +
          ', reason=' + reason +
          ', status=' + _toStringOrEmpty_(p.status) +
          ', level=' + _toStringOrEmpty_(p.promo_level) +
          ', value=' + _toStringOrEmpty_(p.bonus_value_est_usd) +
          ', start=' + _fmtPromoDiagDate_(p.promo_start_date) +
          ', end=' + _fmtPromoDiagDate_(p.promo_end_date));
      }
    }
  }
  if (_isPromoDebugEnabled_()) {
    Logger.log('[PromoCatalog][ActiveFilter] total in=' + promos.length + ', total out=' + kept.length);
    _logGoldPromoDiagnostics_('[PromoCatalog][ActiveFilter][OUT]', kept);
  }
  return kept;
}

function _normPromoStatus_(v) {
  var s = v == null || String(v).trim() === '' ? 'Active' : String(v).trim();
  return s.toLowerCase() === 'active' ? 'Active' : s;
}

function _normPromoLevel_(v) {
  var s = v == null ? '' : String(v).trim().toLowerCase();
  if (s === 'high') return 'High';
  if (s === 'low') return 'Low';
  return 'Medium';
}

function _toNumberOrZero_(v) {
  if (typeof v === 'number' && !isNaN(v)) return v;
  if (v == null || String(v).trim() === '') return 0;
  var n = parseFloat(String(v).replace(/[$,\s]/g, ''));
  return isNaN(n) ? 0 : n;
}

function _toDateOrNull_(v) {
  if (v == null || v === '') return null;
  if (Object.prototype.toString.call(v) === '[object Date]') {
    return isNaN(v.getTime()) ? null : v;
  }
  var s = String(v).trim();
  if (!s) return null;
  var d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

function _toIntOrZero_(v) {
  if (typeof v === 'number' && !isNaN(v)) return Math.max(0, Math.round(v));
  if (v == null || String(v).trim() === '') return 0;
  var n = parseInt(String(v).replace(/[^0-9-]/g, ''), 10);
  if (isNaN(n)) return 0;
  return Math.max(0, n);
}

function _toStringOrEmpty_(v) {
  return v == null ? '' : String(v);
}

function _getPromoField_(row, aliases) {
  if (!row) return null;
  var keys = Object.keys(row);
  for (var i = 0; i < aliases.length; i++) {
    var target = String(aliases[i]).toLowerCase().trim().replace(/\s+/g, '_');
    for (var k = 0; k < keys.length; k++) {
      var rawKey = keys[k];
      var normKey = String(rawKey).toLowerCase().trim().replace(/\s+/g, '_');
      if (normKey === target) return row[rawKey];
    }
  }
  return null;
}

function _fmtPromoDiagDate_(d) {
  if (!d || Object.prototype.toString.call(d) !== '[object Date]' || isNaN(d.getTime())) return '';
  return Utilities.formatDate(d, Session.getScriptTimeZone(), 'yyyy-MM-dd');
}

function _logGoldPromoDiagnostics_(label, rows) {
  var list = rows || [];
  var gold = [];
  for (var i = 0; i < list.length; i++) {
    var r = list[i] || {};
    var cardName = _toStringOrEmpty_(_getPromoField_(r, ['card_name', 'card name', 'card'])).trim().toLowerCase();
    if (cardName === 'amex business gold') gold.push(r);
  }
  var ids = gold.map(function(r) {
    return _toStringOrEmpty_(_getPromoField_(r, ['promo_id', 'promo id', 'id']));
  });
  Logger.log(label + ' gold count=' + gold.length + ', gold promo_ids=' + ids.join(', '));
  for (var j = 0; j < gold.length; j++) {
    var g = gold[j];
    Logger.log(label + ' gold row[' + j + ']: id=' + _toStringOrEmpty_(_getPromoField_(g, ['promo_id', 'promo id', 'id'])) +
      ', end=' + _toStringOrEmpty_(_getPromoField_(g, ['promo_end_date', 'promo end date', 'end_date', 'end date'])) +
      ', status=' + _toStringOrEmpty_(_getPromoField_(g, ['status'])) +
      ', level=' + _toStringOrEmpty_(_getPromoField_(g, ['promo_level', 'promo level', 'level'])) +
      ', value=' + _toStringOrEmpty_(_getPromoField_(g, ['bonus_value_est_usd', 'bonus value est usd', 'bonus value', 'est bonus value'])));
  }
}

function _a1ColLabel_(colNumber) {
  var n = colNumber;
  var label = '';
  while (n > 0) {
    var rem = (n - 1) % 26;
    label = String.fromCharCode(65 + rem) + label;
    n = Math.floor((n - 1) / 26);
  }
  return label || 'A';
}

function _isPromoDebugEnabled_() {
  return !!(typeof DECISION_CONFIG !== 'undefined' && DECISION_CONFIG && DECISION_CONFIG.PROMO_DEBUG === true);
}

function _findHeaderIndexByAliases_(headers, aliases) {
  var hs = headers || [];
  for (var i = 0; i < hs.length; i++) {
    var hk = hs[i] == null ? '' : String(hs[i]).toLowerCase().trim().replace(/\s+/g, '_');
    for (var j = 0; j < aliases.length; j++) {
      var ak = String(aliases[j]).toLowerCase().trim().replace(/\s+/g, '_');
      if (hk === ak) return i;
    }
  }
  return -1;
}
