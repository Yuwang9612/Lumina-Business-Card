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
    var monthsSinceOpened = _monthsSinceByReportMonth_(card.openedDate, rm);
    if (monthsSinceOpened == null) monthsSinceOpened = card.monthsSinceOpened;
    // PreBonus trigger source: derived one-time bonus lifecycle only.
    if (!isInactive && !card.bonusCollected && bonusInProgress) {
      lifecycle = 'PreBonus';
    } else if (monthsSinceOpened !== null && monthsSinceOpened < 12) {
      lifecycle = 'FirstYear';
    }
    var openedMonth = (card.openedDate && card.openedDate.raw) ? card.openedDate.raw : '';
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
