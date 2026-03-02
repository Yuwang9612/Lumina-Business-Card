/**
 * @file engine/lifecycleEngine.gs
 * Lifecycle layer: determine PreBonus/FirstYear/LongTerm for each card.
 */

function _monthsSinceByReportMonth_(openedDateObj, reportMonth) {
  if (!openedDateObj || openedDateObj.year == null || openedDateObj.month == null) return null;
  var parts = String(reportMonth || '').split('-');
  if (parts.length < 2) return null;
  var ry = parseInt(parts[0], 10);
  var rm = parseInt(parts[1], 10);
  if (isNaN(ry) || isNaN(rm) || rm < 1 || rm > 12) return null;
  return (ry - openedDateObj.year) * 12 + (rm - openedDateObj.month);
}

function _monthsSinceOpenedByToday_(openedMonthRaw) {
  var s = String(openedMonthRaw || '').trim();
  var m = s.match(/^(\d{4})-(\d{2})$/);
  if (!m) return null;
  var y = parseInt(m[1], 10);
  var mo = parseInt(m[2], 10);
  if (isNaN(y) || isNaN(mo) || mo < 1 || mo > 12) return null;
  var now = new Date();
  return (now.getFullYear() - y) * 12 + ((now.getMonth() + 1) - mo);
}

function runLifecycleEngine(cardsNormalized, bonusLifecycleRows, reportMonth) {
  var results = [];
  var rm = String(reportMonth || '').trim();
  if (!rm) {
    var now = new Date();
    rm = now.getFullYear() + '-' + (now.getMonth() < 9 ? '0' : '') + (now.getMonth() + 1);
  }
  if (DECISION_CONFIG && DECISION_CONFIG.TIME_ANCHOR_DEBUG) {
    Logger.log('[TimeAnchor][Lifecycle] report_month=' + rm);
  }
  var bonusMap = {};
  var rows = bonusLifecycleRows || [];
  for (var r = 0; r < rows.length; r++) {
    var br = rows[r];
    if (!br || !br.cardName) continue;
    bonusMap[String(br.cardName)] = br;
  }
  for (var i = 0; i < cardsNormalized.length; i++) {
    var card = cardsNormalized[i];
    var lifecycle = 'LongTerm';
    var statusRaw = card && card.status != null ? String(card.status).toLowerCase() : '';
    var isInactive = statusRaw.indexOf('inactive') >= 0 || statusRaw.indexOf('closed') >= 0 || statusRaw.indexOf('cancel') >= 0;
    var bonusRow = bonusMap[card.cardName];
    var bonusInProgress = !!(bonusRow && bonusRow.eligible && bonusRow.bonus_status === 'InProgress');
    var openedMonth = card.opened_month != null ? String(card.opened_month) : ((card.openedDate && card.openedDate.raw) ? String(card.openedDate.raw) : '');
    var monthsSinceOpened = _monthsSinceOpenedByToday_(openedMonth);
    if (monthsSinceOpened == null) {
      Logger.log('[Lifecycle][Warn] opened_month missing/invalid for card=' + card.cardName + ', months_since_opened=null');
    }
    var prebonusLimit = (typeof DECISION_CONFIG !== 'undefined' && DECISION_CONFIG.PREBONUS_MONTH_LIMIT != null)
      ? Number(DECISION_CONFIG.PREBONUS_MONTH_LIMIT) : 3;
    if (isNaN(prebonusLimit) || prebonusLimit < 0) prebonusLimit = 3;
    // PreBonus trigger source: derived one-time bonus lifecycle only.
    if (!isInactive && !card.bonusCollected && bonusInProgress && monthsSinceOpened !== null && monthsSinceOpened <= prebonusLimit) {
      lifecycle = 'PreBonus';
    } else if (monthsSinceOpened === null || monthsSinceOpened < 12) {
      lifecycle = 'FirstYear';
    }
    Logger.log('[Lifecycle] report_month=' + rm + ', card=' + card.cardName + ', opened_month=' + openedMonth + ', months_since_open=' + (monthsSinceOpened != null ? monthsSinceOpened : 'null') + ', bonus_collected=' + card.bonusCollected + ', lifecycle_stage=' + lifecycle);
    results.push({
      cardName: card.cardName,
      lifecycle: lifecycle,
      monthsSinceOpened: monthsSinceOpened,
      bonusCollected: card.bonusCollected
    });
  }
  return results;
}
