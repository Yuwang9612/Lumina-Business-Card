/**
 * @file engine/bonusLifecycleEngine.gs
 * One-time welcome bonus derived layer (no persistence).
 */

function _bonusLevelWeight_(level) {
  var s = level == null ? '' : String(level).trim().toLowerCase();
  if (s === 'high') return 3;
  if (s === 'medium') return 2;
  if (s === 'low') return 1;
  return 0;
}

function _normalizedCardKey_(name) {
  return name == null ? '' : String(name).trim().toLowerCase();
}

function _dateOrNull_(v) {
  if (!v) return null;
  if (Object.prototype.toString.call(v) === '[object Date]') return isNaN(v.getTime()) ? null : v;
  var d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

function _openedDateToNative_(openedDateObj) {
  if (!openedDateObj || openedDateObj.year == null || openedDateObj.month == null) return null;
  return new Date(openedDateObj.year, openedDateObj.month - 1, openedDateObj.day || 1);
}

function _isPromoActiveNow_(promo, now) {
  if (!promo) return false;
  if ((promo.status || 'Active') !== 'Active') return false;
  var start = _dateOrNull_(promo.promo_start_date);
  var end = _dateOrNull_(promo.promo_end_date);
  if (start && now.getTime() < start.getTime()) return false;
  if (end && now.getTime() > end.getTime()) return false;
  return true;
}

function matchPromoForCard_(cardName, promoCatalog, now) {
  var nameKey = _normalizedCardKey_(cardName);
  if (!nameKey || !promoCatalog || promoCatalog.length === 0) return null;
  var active = promoCatalog.filter(function(p) {
    return _normalizedCardKey_(p.card_name) === nameKey && _isPromoActiveNow_(p, now);
  });
  if (String(cardName || '').toUpperCase().indexOf('GOLD') >= 0) {
    Logger.log('Gold promos count: ' + active.length);
    Logger.log(active.map(function(p) {
      return {
        id: p.promo_id,
        level: p.promo_level,
        value: p.bonus_value_est_usd
      };
    }));
  }
  if (!active.length) return null;
  var levelRank = { High: 3, Medium: 2, Low: 1 };
  active.sort(function(a, b) {
    var aLevel = levelRank[String(a && a.promo_level != null ? a.promo_level : '').trim()] || _bonusLevelWeight_(a && a.promo_level);
    var bLevel = levelRank[String(b && b.promo_level != null ? b.promo_level : '').trim()] || _bonusLevelWeight_(b && b.promo_level);
    if (aLevel !== bLevel) return bLevel - aLevel; // desc: High > Medium > Low

    var bChecked = _dateOrNull_(b.promo_last_checked_at);
    var aChecked = _dateOrNull_(a.promo_last_checked_at);
    var aCheckedTs = aChecked ? aChecked.getTime() : 0;
    var bCheckedTs = bChecked ? bChecked.getTime() : 0;
    if (aCheckedTs !== bCheckedTs) return bCheckedTs - aCheckedTs; // desc: latest first

    var aStart = _dateOrNull_(a.promo_start_date);
    var bStart = _dateOrNull_(b.promo_start_date);
    var aStartTs = aStart ? aStart.getTime() : 0;
    var bStartTs = bStart ? bStart.getTime() : 0;
    return bStartTs - aStartTs; // desc: latest first
  });
  return active[0];
}

function deriveBonusLifecycleForCard_(card, promo, now, config) {
  var cfg = config || {};
  var eligibilityBufferDays = cfg.BONUS_ELIGIBILITY_BUFFER_DAYS != null
    ? Number(cfg.BONUS_ELIGIBILITY_BUFFER_DAYS)
    : 30;
  if (isNaN(eligibilityBufferDays) || eligibilityBufferDays < 0) eligibilityBufferDays = 30;
  var unknownStatus = 'Unknown';
  var base = {
    cardName: card && card.cardName ? card.cardName : '',
    matchedPromo: promo || null,
    eligible: false,
    bonus_value: null,
    deadline: null,
    bonus_status: unknownStatus
  };
  if (!card || !promo) return base;

  var openedDate = _openedDateToNative_(card.openedDate);
  var timeWindowDays = promo.time_window_days != null ? Number(promo.time_window_days) : NaN;
  if (!openedDate || isNaN(timeWindowDays) || timeWindowDays <= 0) return base;

  var gateDays = timeWindowDays + eligibilityBufferDays;
  var gateStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  gateStart.setDate(gateStart.getDate() - gateDays);
  var eligible = openedDate.getTime() >= gateStart.getTime();
  if (!eligible) return base;

  var deadline = new Date(openedDate.getTime());
  deadline.setDate(deadline.getDate() + timeWindowDays);
  var bonusValue = promo.bonus_value_est_usd != null ? Number(promo.bonus_value_est_usd) : NaN;
  if (isNaN(bonusValue) || bonusValue <= 0) bonusValue = 0;

  var status;
  if (card.bonusCollected) status = 'Completed';
  else if (now.getTime() <= deadline.getTime()) status = 'InProgress';
  else status = 'Expired';

  return {
    cardName: card.cardName,
    matchedPromo: promo,
    eligible: true,
    bonus_value: bonusValue,
    deadline: deadline,
    bonus_status: status
  };
}

function deriveBonusLifecycleForPortfolio_(cards, promoCatalog, now, config) {
  var ts = now instanceof Date ? now : new Date();
  var rows = [];
  var list = cards || [];
  var catalog = promoCatalog || [];
  Logger.log('[BonusLifecycle][InputCatalog] total promos=' + catalog.length);
  var goldCount = catalog.filter(function(p) {
    return _normalizedCardKey_(p && p.card_name).indexOf('gold') >= 0;
  }).length;
  Logger.log('[BonusLifecycle] Gold promos in promoCatalog: ' + goldCount);
  Logger.log('[BonusLifecycle][InputCatalog] Gold promo_ids=' + catalog.filter(function(p) {
    return _normalizedCardKey_(p && p.card_name).indexOf('gold') >= 0;
  }).map(function(p) { return p && p.promo_id ? p.promo_id : ''; }).join(', '));
  for (var i = 0; i < list.length; i++) {
    var card = list[i] || {};
    var promo = matchPromoForCard_(card.cardName, catalog, ts);
    rows.push(deriveBonusLifecycleForCard_(card, promo, ts, config));
  }
  return rows;
}

function computeOneTimeBonusAtRisk_(rows) {
  var sum = 0;
  var list = rows || [];
  for (var i = 0; i < list.length; i++) {
    var r = list[i];
    if (!r || !r.eligible || r.bonus_status !== 'InProgress') continue;
    var v = Number(r.bonus_value);
    if (!isNaN(v) && v > 0) sum += v;
  }
  return sum;
}

function computeMissedBonusValue_(rows) {
  var sum = 0;
  var list = rows || [];
  for (var i = 0; i < list.length; i++) {
    var r = list[i];
    if (!r || !r.eligible || r.bonus_status !== 'Expired') continue;
    var v = Number(r.bonus_value);
    if (!isNaN(v) && v > 0) sum += v;
  }
  return sum;
}

function computeTotalPotentialThisYear_(recurringNet, bonusAtRisk) {
  var rec = Number(recurringNet);
  var bonus = Number(bonusAtRisk);
  if (isNaN(rec)) rec = 0;
  if (isNaN(bonus)) bonus = 0;
  return rec + bonus;
}
