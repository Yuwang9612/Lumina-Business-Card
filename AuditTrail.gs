/**
 * @file AuditTrail.gs
 * Snapshot and Monthly_Events management for audit trail.
 */

var SNAPSHOTS_HEADERS = ['month', 'card_id', 'card_name', 'status', 'opened', 'annual_fee', 'spend_range', 'assigned_category', 'bonus_collected', 'est_value', 'net', 'is_bleeding', 'is_watch', 'is_efficient', 'is_prebonus', 'lifecycle_stage', 'fee_due_month', 'created_at'];

var MONTHLY_EVENTS_HEADERS = ['month', 'card_id', 'card_name', 'event_type', 'severity', 'event_key', 'current_value_json', 'prev_value_json', 'message_key', 'created_at'];


function ensureSnapshotsSheet(ss) {
  var sheet = _getSheetByName(ss, SHEET_SNAPSHOTS);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_SNAPSHOTS);
    sheet.getRange(1, 1, 1, SNAPSHOTS_HEADERS.length).setValues([SNAPSHOTS_HEADERS]);
    sheet.getRange(1, 1, 1, SNAPSHOTS_HEADERS.length).setFontWeight('bold').setBackground('#E8E8E8');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function ensureMonthlyEventsSheet(ss) {
  var sheet = _getSheetByName(ss, SHEET_MONTHLY_EVENTS);
  _logMonthlyEventsSheetMeta_('ensureMonthlyEventsSheet.enter', sheet);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_MONTHLY_EVENTS);
    _logMonthlyEventsSheetMeta_('ensureMonthlyEventsSheet.created', sheet);
    Logger.log('[MonthlyEventsWrite] fn=ensureMonthlyEventsSheet reportMonth= eventType=INIT key=HEADER_CREATE sheet=%s', SHEET_MONTHLY_EVENTS);
    sheet.getRange(1, 1, 1, MONTHLY_EVENTS_HEADERS.length).setValues([MONTHLY_EVENTS_HEADERS]);
    sheet.getRange(1, 1, 1, MONTHLY_EVENTS_HEADERS.length).setFontWeight('bold').setBackground('#E8E8E8');
    sheet.getRange('A1').setNote('INTERNAL LOG ONLY — Monthly Report is on Reports sheet (row 150).');
    sheet.setFrozenRows(1);
  } else {
    var data = _getSheetData(sheet);
    if (data.length > 0 && data[0][0] != null && String(data[0][0]).trim().indexOf('INTERNAL LOG ONLY') === 0) {
      sheet.deleteRow(1);
      data = _getSheetData(sheet);
    }
    if (data.length > 0 && _headerIndex(data[0], 'month') < 0) {
      Logger.log('[MonthlyEventsWrite] fn=ensureMonthlyEventsSheet reportMonth= eventType=INIT key=HEADER_REPAIR sheet=%s', SHEET_MONTHLY_EVENTS);
      sheet.getRange(1, 1, 1, MONTHLY_EVENTS_HEADERS.length).setValues([MONTHLY_EVENTS_HEADERS]);
      sheet.getRange(1, 1, 1, MONTHLY_EVENTS_HEADERS.length).setFontWeight('bold').setBackground('#E8E8E8');
    }
  }
  return sheet;
}

function getCurrentMonth() {
  var now = new Date();
  var year = now.getFullYear();
  var month = now.getMonth() + 1;
  var monthStr = month < 10 ? '0' + month : String(month);
  return year + '-' + monthStr;
}

function getPreviousMonth(monthStr) {
  var parts = monthStr.split('-');
  var year = parseInt(parts[0], 10);
  var month = parseInt(parts[1], 10);
  month--;
  if (month < 1) {
    month = 12;
    year--;
  }
  var monthStrOut = month < 10 ? '0' + month : String(month);
  return year + '-' + monthStrOut;
}

function getCardId(cardName) {
  return String(cardName).trim().toLowerCase().replace(/\s+/g, '_');
}

function _parseMonthToken_(monthStr) {
  if (!monthStr || monthStr === '') return null;
  var parts = String(monthStr).trim().split('-');
  if (parts.length < 2) return null;
  var y = parseInt(parts[0], 10);
  var m = parseInt(parts[1], 10);
  if (isNaN(y) || isNaN(m) || m < 1 || m > 12) return null;
  return { year: y, month: m };
}

function _fmtMonthToken_(y, m) {
  return y + '-' + (m < 10 ? '0' + m : String(m));
}

function inferFeeDueMonth(openedStr, reportMonth) {
  var opened = _parseMonthToken_(openedStr);
  var report = _parseMonthToken_(reportMonth || getCurrentMonth());
  if (!opened || !report) return null;
  var y = report.year;
  if (opened.month < report.month) y += 1;
  return _fmtMonthToken_(y, opened.month);
}

function loadPreviousSnapshots(ss, month) {
  var sheet = _getSheetByName(ss, SHEET_SNAPSHOTS);
  if (!sheet) return {};
  var data = _getSheetData(sheet);
  if (data.length < 2) return {};
  var headers = data[0];
  var monthIdx = _headerIndex(headers, 'month');
  var cardIdIdx = _headerIndex(headers, 'card_id');
  if (monthIdx < 0 || cardIdIdx < 0) return {};
  var prevMonth = getPreviousMonth(month);
  var map = {};
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var rowMonth = row[monthIdx] ? String(row[monthIdx]).trim() : '';
    if (rowMonth === prevMonth) {
      var cardId = row[cardIdIdx] ? String(row[cardIdIdx]).trim() : '';
      if (cardId) {
        var rec = {};
        for (var h = 0; h < headers.length; h++) {
          var val = row[h];
          var headerName = headers[h];
          if (headerName === 'is_bleeding' || headerName === 'is_watch' || headerName === 'is_efficient' || headerName === 'is_prebonus') {
            rec[headerName] = val === 'TRUE' || val === true;
          } else if (headerName === 'bonus_collected') {
            rec[headerName] = val === 'Yes' || val === true;
          } else if (headerName === 'annual_fee' || headerName === 'est_value' || headerName === 'net') {
            rec[headerName] = val != null && val !== '' ? parseFloat(val) : 0;
          } else {
            rec[headerName] = val;
          }
        }
        map[cardId] = rec;
      }
    }
  }
  return map;
}

function deleteSnapshotsForMonth(ss, month) {
  var sheet = _getSheetByName(ss, SHEET_SNAPSHOTS);
  if (!sheet) return;
  var data = _getSheetData(sheet);
  if (data.length < 2) return;
  var headers = data[0];
  var monthIdx = _headerIndex(headers, 'month');
  if (monthIdx < 0) return;
  var rowsToDelete = [];
  for (var i = data.length - 1; i >= 1; i--) {
    var rowMonth = data[i][monthIdx] ? String(data[i][monthIdx]).trim() : '';
    if (rowMonth === month) {
      rowsToDelete.push(i + 1);
    }
  }
  for (var d = 0; d < rowsToDelete.length; d++) {
    sheet.deleteRow(rowsToDelete[d]);
  }
}

function _normalizeMonthStr(month) {
  if (month == null || month === '') return '';
  var s = String(month).trim();
  var parts = s.split('-');
  if (parts.length < 2) return s;
  var y = parseInt(parts[0], 10);
  var m = parseInt(parts[1], 10);
  if (isNaN(y) || isNaN(m)) return s;
  var monthStr = m < 10 ? '0' + m : String(m);
  return y + '-' + monthStr;
}

function normalizeReportMonth_(v) {
  if (v == null || v === '') return '';
  if (Object.prototype.toString.call(v) === '[object Date]' && !isNaN(v.getTime())) {
    return Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy-MM');
  }
  var s = String(v).trim();
  if (s === '') return '';
  var m = s.match(/^(\d{4})-(\d{1,2})$/);
  if (m) {
    var yy = parseInt(m[1], 10);
    var mm = parseInt(m[2], 10);
    if (!isNaN(yy) && !isNaN(mm) && mm >= 1 && mm <= 12) return yy + '-' + (mm < 10 ? '0' + mm : String(mm));
  }
  return _normalizeMonthStr(s);
}

function strictNormMonth(v) {
  if (!v) return '';
  if (Object.prototype.toString.call(v) === '[object Date]' && !isNaN(v.getTime())) {
    var y = v.getFullYear();
    var m = ('0' + (v.getMonth() + 1)).slice(-2);
    return y + '-' + m;
  }
  var s = String(v).trim();
  if (s.length >= 7) return s.substring(0, 7);
  return normalizeReportMonth_(s);
}

function strictNormKey(v) {
  return String(v == null ? '' : v).trim();
}

function _findHeaderIndexByAliasesEvents_(headers, aliases) {
  var hs = headers || [];
  for (var i = 0; i < hs.length; i++) {
    var h = hs[i] == null ? '' : String(hs[i]).trim().toLowerCase();
    for (var j = 0; j < aliases.length; j++) {
      if (h === String(aliases[j]).trim().toLowerCase()) return i;
    }
  }
  return -1;
}

function _logMonthlyEventsSheetMeta_(prefix, sheet) {
  if (!sheet) {
    Logger.log('[MonthlyEventsSheet] prefix=%s sheet=<null>', String(prefix || ''));
    return;
  }
  var ss = sheet.getParent();
  Logger.log(
    '[MonthlyEventsSheet] prefix=%s spreadsheetId=%s sheetName=%s sheetId=%s lastRow=%s lastCol=%s',
    String(prefix || ''),
    ss ? ss.getId() : '',
    sheet.getName(),
    sheet.getSheetId(),
    sheet.getLastRow(),
    sheet.getLastColumn()
  );
}

function deleteEventsForMonth(ss, month) {
  var sheet = _getSheetByName(ss, SHEET_MONTHLY_EVENTS);
  if (!sheet) return;
  _logMonthlyEventsSheetMeta_('deleteEventsForMonth', sheet);
  var data = _getSheetData(sheet);
  if (data.length < 2) return;
  var headers = data[0];
  var monthIdx = _headerIndex(headers, 'month');
  var firstDataRow = 1;
  if (monthIdx < 0 && data.length > 1) {
    headers = data[1];
    monthIdx = _headerIndex(headers, 'month');
    firstDataRow = 2;
  }
  if (monthIdx < 0) return;
  var targetMonth = _normalizeMonthStr(month);
  var rowsToDelete = [];
  for (var i = data.length - 1; i >= firstDataRow; i--) {
    var rowMonth = _normalizeMonthStr(data[i][monthIdx]);
    if (rowMonth === targetMonth) {
      rowsToDelete.push(i + 1);
    }
  }
  for (var d = 0; d < rowsToDelete.length; d++) {
    sheet.deleteRow(rowsToDelete[d]);
  }
}

/**
 * Load events for a given month from Monthly_Events sheet.
 * @return {Array.<Object>} events with month, card_id, card_name, event_type, severity, event_key, current_value_json, prev_value_json, message_key
 */
function loadEventsForMonth(ss, month) {
  var sheet = _getSheetByName(ss, SHEET_MONTHLY_EVENTS);
  if (!sheet) return [];
  _logMonthlyEventsSheetMeta_('loadEventsForMonth', sheet);
  var data = _getSheetData(sheet);
  if (data.length < 2) return [];
  var headers = data[0];
  var monthIdx = _headerIndex(headers, 'month');
  var firstDataRow = 1;
  if (monthIdx < 0 && data.length > 1) {
    headers = data[1];
    monthIdx = _headerIndex(headers, 'month');
    firstDataRow = 2;
  }
  if (monthIdx < 0) return [];
  var cardIdIdx = _headerIndex(headers, 'card_id');
  var cardNameIdx = _headerIndex(headers, 'card_name');
  var typeIdx = _headerIndex(headers, 'event_type');
  var severityIdx = _headerIndex(headers, 'severity');
  var keyIdx = _headerIndex(headers, 'event_key');
  var currentIdx = _headerIndex(headers, 'current_value_json');
  var prevIdx = _headerIndex(headers, 'prev_value_json');
  var messageIdx = _headerIndex(headers, 'message_key');
  if (cardIdIdx < 0 || typeIdx < 0) return [];
  var targetMonth = _normalizeMonthStr(month);
  var out = [];
  for (var i = firstDataRow; i < data.length; i++) {
    var row = data[i];
    var rowMonth = _normalizeMonthStr(row[monthIdx]);
    if (rowMonth !== targetMonth) continue;
    out.push({
      month: rowMonth,
      card_id: cardIdIdx >= 0 ? (row[cardIdIdx] != null ? String(row[cardIdIdx]).trim() : '') : '',
      card_name: cardNameIdx >= 0 ? (row[cardNameIdx] != null ? String(row[cardNameIdx]).trim() : '') : '',
      event_type: typeIdx >= 0 ? (row[typeIdx] != null ? String(row[typeIdx]).trim() : '') : '',
      severity: severityIdx >= 0 ? (row[severityIdx] != null ? String(row[severityIdx]).trim() : '') : '',
      event_key: keyIdx >= 0 ? (row[keyIdx] != null ? String(row[keyIdx]).trim() : '') : '',
      current_value_json: currentIdx >= 0 ? (row[currentIdx] != null ? String(row[currentIdx]).trim() : '') : '',
      prev_value_json: prevIdx >= 0 ? (row[prevIdx] != null ? String(row[prevIdx]).trim() : '') : '',
      message_key: messageIdx >= 0 ? (row[messageIdx] != null ? String(row[messageIdx]).trim() : '') : ''
    });
  }
  return out;
}

function writeSnapshots(ss, month, snapshots) {
  ensureSnapshotsSheet(ss);
  deleteSnapshotsForMonth(ss, month);
  if (snapshots.length === 0) return;
  var sheet = _getSheetByName(ss, SHEET_SNAPSHOTS);
  var now = new Date();
  var rows = [];
  for (var i = 0; i < snapshots.length; i++) {
    var snap = snapshots[i];
    rows.push([
      month,
      snap.card_id,
      snap.card_name,
      snap.status || 'Active',
      snap.opened || '',
      snap.annual_fee != null ? snap.annual_fee : '',
      snap.spend_range || '',
      snap.assigned_category || '',
      snap.bonus_collected ? 'Yes' : 'No',
      snap.est_value != null ? snap.est_value : '',
      snap.net != null ? snap.net : '',
      snap.is_bleeding ? 'TRUE' : 'FALSE',
      snap.is_watch ? 'TRUE' : 'FALSE',
      snap.is_efficient ? 'TRUE' : 'FALSE',
      snap.is_prebonus ? 'TRUE' : 'FALSE',
      snap.lifecycle_stage || '',
      snap.fee_due_month || '',
      now
    ]);
  }
  if (rows.length > 0) {
    var lastRow = sheet.getLastRow();
    var numCols = rows[0].length;
    sheet.getRange(lastRow + 1, 1, rows.length, numCols).setValues(rows);
  }
}

function writeMonthlyEvents(ss, month, events) {
  ensureMonthlyEventsSheet(ss);
  var monthNorm = _normalizeMonthStr(month);
  Logger.log('[MonthlyEvents] incoming_events=%s reportMonth=%s', (events || []).length, monthNorm);
  if (events.length === 0) return;
  var batchKeys = {};
  for (var bi = 0; bi < events.length; bi++) {
    var bk = String(events[bi] && events[bi].event_key != null ? events[bi].event_key : '').trim();
    if (bk) batchKeys[bk] = true;
  }
  Logger.log(
    '[MonthlyEventsBatch] incoming_events=%s uniqueKeysInBatch=%s rowsToWrite=%s reportMonth=%s',
    events.length,
    Object.keys(batchKeys).length,
    0,
    monthNorm
  );
  var seen = {};
  var existingKeys = {};
  var existing = loadEventsForMonth(ss, month);
  for (var e = 0; e < existing.length; e++) {
    var ex = existing[e];
    var exKey = _normalizeMonthStr(month) + '|' + (ex.event_key || '').trim() + '|' + (ex.current_value_json || '').trim();
    existingKeys[exKey] = true;
  }
  var rows = [];
  var pendingBleedingByKey = {};
  var skipped = 0;
  var keyStats = {};
  for (var i = 0; i < events.length; i++) {
    var evt = events[i];
    var rawEvtKey = String(evt.event_key || '');
    var evtKeyNormForStats = rawEvtKey.trim();
    if (!keyStats.hasOwnProperty(evtKeyNormForStats)) {
      keyStats[evtKeyNormForStats] = {
        pre: countEventsByKeyThisMonth_(ss, evtKeyNormForStats, monthNorm),
        emitted: false
      };
    }
    var dedupeCount = 0;
    var emit = true;
    var dbg = null;
    if (String(evt.event_type || '') === 'Bleeding') {
      var evtKey = String(evt.event_key || '');
      var evtKeyNorm = String(evtKey).trim();
      var existingCount = countEventsByKeyThisMonth_(ss, evtKeyNorm, monthNorm);
      var pendingCount = pendingBleedingByKey[evtKeyNorm] || 0;
      dedupeCount = existingCount + pendingCount;
      var evtData = _extractEventJsonObj_(evt.current_value_json);
      var isRetrigger = String(evtData.reason || '').toLowerCase() === 'retrigger';
      if (dedupeCount >= 1 && !isRetrigger) emit = false;
      dbg = _debugCountEventsByKeyThisMonth_(ss, evtKeyNorm, monthNorm);
      Logger.log(
        '[DedupeDecision] reportMonth=%s key=%s reportMonthIdx=%s eventKeyIdx=%s count=%s hitRows=%s decision=%s',
        monthNorm,
        evtKeyNorm,
        dbg.reportMonthIdx,
        dbg.eventKeyIdx,
        dedupeCount,
        JSON.stringify(dbg.hitRows),
        emit ? 'EMIT' : 'SKIP'
      );
    } else {
      Logger.log(
        '[DedupeDecision] reportMonth=%s key=%s reportMonthIdx=%s eventKeyIdx=%s count=%s hitRows=%s decision=%s',
        monthNorm,
        String(evt.event_key || ''),
        1,
        6,
        0,
        '[]',
        'EMIT'
      );
    }
    if (!emit) {
      skipped++;
      continue;
    }
    var key = monthNorm + '|' + (evt.event_key || '').trim() + '|' + ((evt.current_value_json || '').trim());
    if (seen[key]) {
      skipped++;
      continue;
    }
    if (existingKeys[key]) {
      skipped++;
      continue;
    }
    seen[key] = true;
    rows.push([
      monthNorm,
      evt.card_id,
      evt.card_name,
      evt.event_type,
      evt.severity,
      evt.event_key,
      evt.current_value_json || '',
      evt.prev_value_json || '',
      evt.message_key || '',
      new Date()
    ]);
    if (String(evt.event_type || '') === 'Bleeding') {
      var addKeyNorm = String(evt.event_key || '').trim();
      pendingBleedingByKey[addKeyNorm] = (pendingBleedingByKey[addKeyNorm] || 0) + 1;
    }
    if (keyStats.hasOwnProperty(evtKeyNormForStats)) keyStats[evtKeyNormForStats].emitted = true;
    Logger.log(
      '[MonthlyEventsWrite] fn=writeMonthlyEvents reportMonth=%s eventType=%s key=%s sheet=%s',
      monthNorm,
      String(evt.event_type || ''),
      String(evt.event_key || ''),
      SHEET_MONTHLY_EVENTS
    );
  }
  Logger.log(
    '[MonthlyEventsBatch] incoming_events=%s uniqueKeysInBatch=%s rowsToWrite=%s reportMonth=%s',
    events.length,
    Object.keys(batchKeys).length,
    rows.length,
    monthNorm
  );
  Logger.log('[MonthlyEvents] will_write_rows=%s', rows.length);
  if (rows.length > 0) {
    var sheet = _getSheetByName(ss, SHEET_MONTHLY_EVENTS);
    _logMonthlyEventsSheetMeta_('writeMonthlyEvents.beforeSetValues', sheet);
    var lastRow = sheet.getLastRow();
    var numCols = rows[0].length;
    sheet.getRange(lastRow + 1, 1, rows.length, numCols).setValues(rows);
    _logMonthlyEventsSheetMeta_('writeMonthlyEvents.afterSetValues', sheet);
  }
  for (var statKey in keyStats) {
    if (!keyStats.hasOwnProperty(statKey)) continue;
    var pre = keyStats[statKey].pre;
    var emitted = !!keyStats[statKey].emitted;
    var post = countEventsByKeyThisMonth_(ss, statKey, monthNorm);
    var pass = (pre === 0 && emitted && post === 1) || (pre >= 1 && !emitted && post === pre);
    Logger.log('[S9Result] key=%s pre=%s emitted=%s post=%s => %s', statKey, pre, emitted ? 'true' : 'false', post, pass ? 'PASS' : 'FAIL');
  }
  Logger.log('[MonthlyEvents] wrote_rows=%s skipped=%s reportMonth=%s', rows.length, skipped, monthNorm);
}

function buildDedupeKey_(reportMonth, eventType, cardName) {
  return _normalizeMonthStr(reportMonth) + '|' + String(eventType || '').trim() + '|' + String(cardName || '').trim().toLowerCase();
}

function _extractEventJsonObj_(jsonStr) {
  if (!jsonStr || String(jsonStr).trim() === '') return {};
  try {
    return JSON.parse(jsonStr);
  } catch (e) {
    return {};
  }
}

function _extractLossFromEventJson_(jsonStr) {
  var data = {};
  if (jsonStr && String(jsonStr).trim() !== '') {
    try {
      data = JSON.parse(jsonStr);
    } catch (e) {
      data = {};
    }
  }
  if (data.loss_usd != null) {
    var v = Number(data.loss_usd);
    return isNaN(v) ? 0 : Math.abs(v);
  }
  if (data.net != null) {
    var net = Number(data.net);
    return isNaN(net) ? 0 : Math.abs(net);
  }
  if (data.annual_fee != null && data.est_value != null) {
    var fee = Number(data.annual_fee);
    var est = Number(data.est_value);
    return (isNaN(fee) || isNaN(est)) ? 0 : Math.abs(fee - est);
  }
  return 0;
}

function _getMonthlyEventsRows_(ss, reportMonth) {
  var sheet = _getSheetByName(ss, SHEET_MONTHLY_EVENTS);
  if (!sheet) return [];
  var data = _getSheetData(sheet);
  if (data.length < 2) return [];
  var headers = data[0];
  var monthIdx = _headerIndex(headers, 'month');
  var cardNameIdx = _headerIndex(headers, 'card_name');
  var typeIdx = _headerIndex(headers, 'event_type');
  var currentIdx = _headerIndex(headers, 'current_value_json');
  var createdIdx = _headerIndex(headers, 'created_at');
  if (monthIdx < 0 || cardNameIdx < 0 || typeIdx < 0) return [];
  var targetMonth = _normalizeMonthStr(reportMonth);
  var out = [];
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var rowMonth = _normalizeMonthStr(row[monthIdx]);
    if (rowMonth !== targetMonth) continue;
    var eventType = row[typeIdx] != null ? String(row[typeIdx]).trim() : '';
    var cardName = row[cardNameIdx] != null ? String(row[cardNameIdx]).trim() : '';
    out.push({
      dedupe_key: buildDedupeKey_(targetMonth, eventType, cardName),
      current_value_json: currentIdx >= 0 ? (row[currentIdx] != null ? String(row[currentIdx]) : '') : '',
      created_at: createdIdx >= 0 ? row[createdIdx] : null
    });
  }
  return out;
}

function countEventsByKeyThisMonth_(ss, dedupeKey, reportMonth) {
  return _debugCountEventsByKeyThisMonth_(ss, dedupeKey, reportMonth).count;
}

function _debugCountEventsByKeyThisMonth_(ss, dedupeKey, reportMonth) {
  var out = {
    count: 0,
    hitRows: [],
    reportMonthIdx: 1,
    eventKeyIdx: 6,
    reportMonthNorm: strictNormMonth(reportMonth),
    keyNorm: strictNormKey(dedupeKey)
  };
  var sheet = _getSheetByName(ss, SHEET_MONTHLY_EVENTS);
  if (!sheet) return out;
  _logMonthlyEventsSheetMeta_('countEventsByKeyThisMonth', sheet);
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  if (lastRow < 2 || lastCol < 1) return out;
  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var reportMonthIdx = 0; // A
  var eventKeyIdx = 5; // F
  Logger.log(
    '[EventsHeader] headers=%s monthColIdx=%s eventKeyColIdx=%s',
    JSON.stringify((headers || []).slice(0, 15)),
    out.reportMonthIdx,
    out.eventKeyIdx
  );
  Logger.log(
    '[DedupeScan] spreadsheetId=%s sheetName=%s sheetId=%s lastRow=%s lastCol=%s reportMonthRaw=%s reportMonthType=%s reportMonthNorm=%s dedupeKey=%s',
    sheet.getParent() ? sheet.getParent().getId() : '',
    sheet.getName(),
    sheet.getSheetId(),
    lastRow,
    lastCol,
    String(reportMonth == null ? '' : reportMonth),
    Object.prototype.toString.call(reportMonth),
    out.reportMonthNorm,
    out.keyNorm
  );
  var data = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
  var start = Math.max(0, data.length - 20);
  for (var d = start; d < data.length; d++) {
    var rowDump = data[d] || [];
    var rawMonth = reportMonthIdx < rowDump.length ? rowDump[reportMonthIdx] : '';
    var rawKey = eventKeyIdx < rowDump.length ? rowDump[eventKeyIdx] : '';
    Logger.log(
      '[DedupeScan] rowNo=%s monthRaw=%s monthType=%s monthNorm=%s keyRaw=%s keyNorm=%s',
      d + 2,
      rawMonth,
      Object.prototype.toString.call(rawMonth),
      normalizeReportMonth_(rawMonth),
      rawKey,
      String(rawKey == null ? '' : rawKey).trim()
    );
  }
  for (var i = 0; i < data.length; i++) {
    var row = data[i];
    var rowMonthRaw = reportMonthIdx < row.length ? row[reportMonthIdx] : '';
    var rowKeyRaw = eventKeyIdx < row.length ? row[eventKeyIdx] : '';
    var rowMonthNorm = strictNormMonth(rowMonthRaw);
    var rowKeyNorm = strictNormKey(rowKeyRaw);
    Logger.log(
      '[DedupeCompare] rowMonthRaw=%s rowMonthNorm=%s reportMonthNorm=%s rowKeyNorm=%s dedupeKeyNorm=%s',
      rowMonthRaw,
      rowMonthNorm,
      out.reportMonthNorm,
      rowKeyNorm,
      out.keyNorm
    );
    if (rowMonthNorm === out.reportMonthNorm && rowKeyNorm === out.keyNorm) {
      out.count++;
      out.hitRows.push(i + 2);
    }
  }
  return out;
}

function getLastEventForKeyThisMonth_(ss, dedupeKey, reportMonth) {
  var rows = _getMonthlyEventsRows_(ss, reportMonth);
  var matched = [];
  for (var i = 0; i < rows.length; i++) {
    if (rows[i].dedupe_key === dedupeKey) matched.push(rows[i]);
  }
  if (matched.length === 0) return null;
  matched.sort(function(a, b) {
    var ta = a.created_at ? new Date(a.created_at).getTime() : 0;
    var tb = b.created_at ? new Date(b.created_at).getTime() : 0;
    return ta - tb;
  });
  return matched[matched.length - 1];
}

function shouldEmitEvent_(ss, dedupeKey, reportMonth, retriggerEligible, capPerMonth) {
  var count = countEventsByKeyThisMonth_(ss, dedupeKey, reportMonth);
  if (count <= 0) return { emit: true, reason: 'initial', count: count };
  if (count >= capPerMonth) return { emit: false, reason: 'capped', count: count };
  if (retriggerEligible) return { emit: true, reason: 'retrigger', count: count };
  return { emit: false, reason: 'deduped', count: count };
}

function generateSnapshots(cards, cardsNormalized, structureResults, lifecycleResults, reportMonth) {
  var snapshots = [];
  var structureMap = {};
  var lifecycleMap = {};
  var cardMap = {};
  for (var i = 0; i < structureResults.length; i++) {
    structureMap[structureResults[i].cardName] = structureResults[i];
  }
  for (var i = 0; i < lifecycleResults.length; i++) {
    lifecycleMap[lifecycleResults[i].cardName] = lifecycleResults[i];
  }
  for (var i = 0; i < cardsNormalized.length; i++) {
    cardMap[cardsNormalized[i].cardName] = cardsNormalized[i];
  }
  for (var i = 0; i < cardsNormalized.length; i++) {
    var card = cardsNormalized[i];
    var cardName = card.cardName;
    var cardId = getCardId(cardName);
    var structure = structureMap[cardName] || {};
    var lifecycle = lifecycleMap[cardName] || {};
    var openedStr = card.openedDate ? card.openedDate.raw : '';
    var feeDueMonth = inferFeeDueMonth(openedStr, reportMonth || getCurrentMonth());
    var spendRangeStr = '';
    for (var j = 0; j < cards.length; j++) {
      if (cards[j]['Card Name'] === cardName) {
        spendRangeStr = cards[j]['Current Annual Spend (Range)'] || cards[j]['Spend Range'] || '';
        break;
      }
    }
    snapshots.push({
      card_id: cardId,
      card_name: cardName,
      status: card.status || 'Active',
      opened: openedStr,
      annual_fee: structure.annualFee != null ? structure.annualFee : 0,
      spend_range: spendRangeStr,
      assigned_category: card.assignedCategory || '',
      bonus_collected: card.bonusCollected || false,
      est_value: structure.estValue != null ? structure.estValue : 0,
      net: structure.net != null ? structure.net : 0,
      is_bleeding: structure.stage === 'Bleeding',
      is_watch: structure.stage === 'Watch',
      is_efficient: structure.stage === 'Efficient',
      is_prebonus: lifecycle.lifecycle === 'PreBonus',
      lifecycle_stage: lifecycle.lifecycle || 'LongTerm',
      fee_due_month: feeDueMonth,
      assets_last_confirmed: card.assetsLastConfirmed
    });
  }
  return snapshots;
}

function loadEventHistory(ss, eventKey, currentMonth) {
  var sheet = _getSheetByName(ss, SHEET_MONTHLY_EVENTS);
  if (!sheet) return [];
  _logMonthlyEventsSheetMeta_('loadEventHistory', sheet);
  var data = _getSheetData(sheet);
  if (data.length < 2) return [];
  var headers = data[0];
  var eventKeyIdx = _headerIndex(headers, 'event_key');
  var monthIdx = _headerIndex(headers, 'month');
  var createdIdx = _headerIndex(headers, 'created_at');
  var currentJsonIdx = _headerIndex(headers, 'current_value_json');
  if (eventKeyIdx < 0 || monthIdx < 0) return [];
  var history = [];
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var rowEventKey = row[eventKeyIdx] ? String(row[eventKeyIdx]).trim() : '';
    var rowMonth = row[monthIdx] ? String(row[monthIdx]).trim() : '';
    if (rowEventKey === eventKey && rowMonth !== currentMonth) {
      var rec = {
        month: rowMonth,
        created_at: createdIdx >= 0 ? row[createdIdx] : null,
        current_value_json: currentJsonIdx >= 0 ? row[currentJsonIdx] : null
      };
      history.push(rec);
    }
  }
  return history;
}

function daysBetween(date1, date2) {
  if (!date1 || !date2) return null;
  var d1 = date1 instanceof Date ? date1 : new Date(date1);
  var d2 = date2 instanceof Date ? date2 : new Date(date2);
  if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return null;
  return Math.floor((d2.getTime() - d1.getTime()) / 86400000);
}

function monthsBetween(month1, month2) {
  var parts1 = month1.split('-');
  var parts2 = month2.split('-');
  var year1 = parseInt(parts1[0], 10);
  var mon1 = parseInt(parts1[1], 10);
  var year2 = parseInt(parts2[0], 10);
  var mon2 = parseInt(parts2[1], 10);
  return (year2 - year1) * 12 + (mon2 - mon1);
}

function isStale(assetsLastConfirmed) {
  if (!assetsLastConfirmed) return true;
  var now = new Date();
  var days = daysBetween(assetsLastConfirmed, now);
  return days == null || days > DECISION_CONFIG.STALE_DAYS;
}

function generateEvents(ss, snapshots, prevSnapshots, marketSignals, catalogMap, reportMonth) {
  var events = [];
  var currentMonth = reportMonth || getCurrentMonth();
  var prevMap = {};
  for (var i = 0; i < prevSnapshots.length; i++) {
    var prev = prevSnapshots[i];
    prevMap[prev.card_id] = prev;
  }
  var marketMap = {};
  for (var i = 0; i < marketSignals.length; i++) {
    var sig = marketSignals[i];
    var cardId = getCardId(sig.cardName);
    if (!marketMap[cardId]) marketMap[cardId] = [];
    marketMap[cardId].push(sig);
  }
  var staleCards = {};
  for (var i = 0; i < snapshots.length; i++) {
    var snap = snapshots[i];
    var prev = prevMap[snap.card_id];
    var isCardStale = isStale(snap.assets_last_confirmed);
    if (isCardStale) {
      staleCards[snap.card_id] = true;
      var daysStale = snap.assets_last_confirmed ? daysBetween(snap.assets_last_confirmed, new Date()) : null;
      events.push({
        card_id: snap.card_id,
        card_name: snap.card_name,
        event_type: 'DataStale',
        severity: 'Medium',
        event_key: snap.card_id + ':DataStale',
        current_value_json: JSON.stringify({
          days_stale: daysStale,
          assets_last_confirmed: snap.assets_last_confirmed ? snap.assets_last_confirmed.toISOString() : null
        }),
        prev_value_json: null,
        message_key: 'datastale'
      });
    }
    var currentJsonObj = {
      est_value: snap.est_value,
      net: snap.net,
      annual_fee: snap.annual_fee,
      is_bleeding: snap.is_bleeding,
      is_watch: snap.is_watch,
      is_efficient: snap.is_efficient,
      is_prebonus: snap.is_prebonus,
      lifecycle_stage: snap.lifecycle_stage,
      spend_range: snap.spend_range,
      fee_due_month: snap.fee_due_month || null
    };
    var currentJson = JSON.stringify(currentJsonObj);
    var prevJson = null;
    var prevEstValue = 0;
    var prevNet = 0;
    var prevAnnualFee = 0;
    var prevIsBleeding = false;
    var prevIsPrebonus = false;
    var prevSpendRange = '';
    if (prev) {
      prevEstValue = prev.est_value != null ? (typeof prev.est_value === 'number' ? prev.est_value : parseFloat(prev.est_value)) : 0;
      prevNet = prev.net != null ? (typeof prev.net === 'number' ? prev.net : parseFloat(prev.net)) : 0;
      prevAnnualFee = prev.annual_fee != null ? (typeof prev.annual_fee === 'number' ? prev.annual_fee : parseFloat(prev.annual_fee)) : 0;
      prevIsBleeding = prev.is_bleeding === 'TRUE' || prev.is_bleeding === true;
      prevIsPrebonus = prev.is_prebonus === 'TRUE' || prev.is_prebonus === true;
      prevSpendRange = prev.spend_range || '';
      prevJson = JSON.stringify({
        est_value: prevEstValue,
        net: prevNet,
        annual_fee: prevAnnualFee,
        is_bleeding: prevIsBleeding,
        is_watch: prev.is_watch === 'TRUE' || prev.is_watch === true,
        is_efficient: prev.is_efficient === 'TRUE' || prev.is_efficient === true,
        is_prebonus: prevIsPrebonus,
        lifecycle_stage: prev.lifecycle_stage || '',
        spend_range: prevSpendRange
      });
    }
    var loss = snap.is_bleeding ? (snap.annual_fee - snap.est_value) : 0;
    if (snap.is_bleeding && (!isCardStale || loss >= DECISION_CONFIG.BLEEDING_MIN_LOSS)) {
      var dedupeKey = buildDedupeKey_(currentMonth, 'Bleeding', snap.card_name);
      var monthlyCap = DECISION_CONFIG.BLEEDING_MAX_EVENTS_PER_MONTH != null
        ? parseInt(DECISION_CONFIG.BLEEDING_MAX_EVENTS_PER_MONTH, 10) : 2;
      if (isNaN(monthlyCap) || monthlyCap < 1) monthlyCap = 2;
      var retriggerEligible = false;
      var lastEventThisMonth = getLastEventForKeyThisMonth_(ss, dedupeKey, currentMonth);
      if (lastEventThisMonth) {
        var lastLoss = _extractLossFromEventJson_(lastEventThisMonth.current_value_json);
        var lossDelta = Math.abs(loss) - Math.abs(lastLoss);
        retriggerEligible = lossDelta >= DECISION_CONFIG.BLEEDING_RETRIGGER_DELTA;
      }
      var emitDecision = shouldEmitEvent_(ss, dedupeKey, currentMonth, retriggerEligible, monthlyCap);
      if (DECISION_CONFIG && DECISION_CONFIG.DEDUPE_DEBUG) {
        Logger.log(
          '[Dedupe] reportMonth=%s dedupeKey=%s count=%s decision=%s',
          _normalizeMonthStr(currentMonth),
          dedupeKey,
          countEventsByKeyThisMonth_(ss, dedupeKey, currentMonth),
          emitDecision.emit ? 'emit' : 'skip'
        );
      }
      if (emitDecision.emit) {
        var writeCurrent = {};
        for (var cKey in currentJsonObj) {
          if (currentJsonObj.hasOwnProperty(cKey)) writeCurrent[cKey] = currentJsonObj[cKey];
        }
        writeCurrent.loss_usd = Math.abs(loss);
        if (emitDecision.reason === 'retrigger') writeCurrent.reason = 'retrigger';
        var severity = Math.abs(loss) >= DECISION_CONFIG.BLEEDING_MIN_LOSS ? 'High' : 'Medium';
        events.push({
          card_id: snap.card_id,
          card_name: snap.card_name,
          event_type: 'Bleeding',
          severity: severity,
          event_key: dedupeKey,
          current_value_json: JSON.stringify(writeCurrent),
          prev_value_json: prevJson,
          message_key: isCardStale ? 'bleeding_stale' : 'bleeding'
        });
      }
    }
    if (snap.is_prebonus) {
      var eventKey = snap.card_id + ':PreBonus';
      var history = loadEventHistory(ss, eventKey, currentMonth);
      var shouldFire = true;
      if (history.length > 0) {
        var lastEvent = history[history.length - 1];
        var lastMonth = lastEvent.month;
        var monthsSince = monthsBetween(lastMonth, currentMonth);
        var cooldownMonths = Math.ceil(DECISION_CONFIG.COOLDOWN_DAYS.PreBonus / 30);
        if (monthsSince < cooldownMonths) {
          shouldFire = false;
        }
      }
      if (shouldFire) {
        events.push({
          card_id: snap.card_id,
          card_name: snap.card_name,
          event_type: 'PreBonus',
          severity: 'Medium',
          event_key: eventKey,
          current_value_json: currentJson,
          prev_value_json: prevJson,
          message_key: 'prebonus'
        });
      }
    }
    if (snap.fee_due_month) {
      var feeAmt = snap.annual_fee != null ? Number(snap.annual_fee) : 0;
      if (!isNaN(feeAmt) && feeAmt > 0) {
        var monthsUntil = monthsBetween(currentMonth, snap.fee_due_month);
        var feeWindowMonths = (DECISION_CONFIG && DECISION_CONFIG.fee_due_window_months != null)
          ? parseInt(DECISION_CONFIG.fee_due_window_months, 10) : 1;
        if (isNaN(feeWindowMonths) || feeWindowMonths < 0) feeWindowMonths = 1;
        if (monthsUntil >= 0 && monthsUntil <= feeWindowMonths) {
          var feeDueParts = snap.fee_due_month.split('-');
          var feeDueDate = new Date(parseInt(feeDueParts[0], 10), parseInt(feeDueParts[1], 10) - 1, 1);
          var daysUntil = daysBetween(new Date(), feeDueDate);
          var eventKey = snap.card_id + ':AnnualFeeDue:' + snap.fee_due_month;
          var history = loadEventHistory(ss, eventKey, currentMonth);
          if (history.length === 0) {
            var feeJsonObj = JSON.parse(currentJson);
            feeJsonObj.days_until = daysUntil;
            feeJsonObj.reason = 'Annual fee $' + Math.round(feeAmt) + ' due around ' + snap.fee_due_month;
            events.push({
              card_id: snap.card_id,
              card_name: snap.card_name,
              event_type: 'annual_fee_due',
              severity: 'Medium',
              event_key: eventKey,
              current_value_json: JSON.stringify(feeJsonObj),
              prev_value_json: prevJson,
              message_key: 'annual_fee_due'
            });
          }
        }
      }
    }
    if (prev) {
      var anomalyFields = [];
      if (prevAnnualFee !== snap.annual_fee) {
        anomalyFields.push({
          field: 'annual_fee',
          old_value: prevAnnualFee,
          new_value: snap.annual_fee
        });
      }
      if (prevSpendRange !== snap.spend_range) {
        anomalyFields.push({
          field: 'spend_range',
          old_value: prevSpendRange,
          new_value: snap.spend_range
        });
      }
      if (anomalyFields.length > 0) {
        events.push({
          card_id: snap.card_id,
          card_name: snap.card_name,
          event_type: 'DataAnomaly',
          severity: anomalyFields.length > 1 ? 'Medium' : 'Low',
          event_key: snap.card_id + ':DataAnomaly',
          current_value_json: JSON.stringify({
            changed_fields: anomalyFields,
            current: {
              annual_fee: snap.annual_fee,
              spend_range: snap.spend_range
            }
          }),
          prev_value_json: JSON.stringify({
            annual_fee: prevAnnualFee,
            spend_range: prevSpendRange
          }),
          message_key: 'anomaly'
        });
      }
    }
  }
  for (var cardId in marketMap) {
    if (marketMap.hasOwnProperty(cardId)) {
      var signals = marketMap[cardId];
      for (var s = 0; s < signals.length; s++) {
        var sig = signals[s];
        var catalogRec = findCatalogRecord(catalogMap, sig.cardName);
        var dataConfidence = catalogRec && catalogRec['data_confidence'] ? String(catalogRec['data_confidence']).trim() : '';
        var bonusLastUpdated = sig.bonusLastUpdated;
        var shouldSuppress = false;
        if (bonusLastUpdated && bonusLastUpdated !== 'Unknown') {
          var dt = _parseYmd_(bonusLastUpdated);
          if (dt) {
            var daysOld = daysBetween(dt, new Date());
            if (daysOld != null && daysOld > DECISION_CONFIG.MARKET_FRESH_DAYS && dataConfidence.toUpperCase() !== 'HIGH') {
              shouldSuppress = true;
            }
          }
        }
        if (!shouldSuppress) {
          var eventKey = cardId + ':MarketWindow';
          var history = loadEventHistory(ss, eventKey, currentMonth);
          var shouldFire = true;
          if (history.length > 0) {
            var lastEvent = history[history.length - 1];
            var lastMonth = lastEvent.month;
            var monthsSince = monthsBetween(lastMonth, currentMonth);
            var cooldownMonths = Math.ceil(DECISION_CONFIG.COOLDOWN_DAYS.MarketWindow / 30);
            if (monthsSince < cooldownMonths) {
              shouldFire = false;
            }
          }
          if (shouldFire) {
            var severity = sig.hasLowConfidence ? 'Low' : (sig.isStale ? 'Low' : 'Medium');
            events.push({
              card_id: cardId,
              card_name: sig.cardName,
              event_type: 'MarketWindow',
              severity: severity,
              event_key: eventKey,
              current_value_json: JSON.stringify({
                bonus_level: sig.bonusLevel,
                typical_bonus_value: sig.typicalBonusValue,
                bonus_last_updated: sig.bonusLastUpdated,
                bonus_valid_until: sig.bonusValidUntil,
                has_low_confidence: sig.hasLowConfidence,
                is_stale: sig.isStale
              }),
              prev_value_json: null,
              message_key: 'marketwindow'
            });
          }
        }
      }
    }
  }
  return events;
}

function loadPreviousSnapshotsArray(ss, month) {
  var map = loadPreviousSnapshots(ss, month);
  var arr = [];
  for (var cardId in map) {
    if (map.hasOwnProperty(cardId)) {
      arr.push(map[cardId]);
    }
  }
  return arr;
}
