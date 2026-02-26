/**
 * @file engine/marketEngine.gs
 * Market window layer: find high bonus opportunities.
 */

function _parseYmd_(s) {
  if (!s) return null;
  var str = String(s).trim();
  var m = str.match(/^(\d{4})-(\d{2})(?:-(\d{2}))?$/);
  if (!m) return null;
  var y = parseInt(m[1], 10);
  var mo = parseInt(m[2], 10);
  var d = m[3] ? parseInt(m[3], 10) : 1;
  if (isNaN(y) || isNaN(mo) || isNaN(d)) return null;
  if (mo < 1 || mo > 12) return null;
  if (d < 1 || d > 31) return null;
  return new Date(y, mo - 1, d);
}

function _normalizeBonusLevel(val) {
  if (val === null || val === undefined || val === '') return 'Low';
  var s = String(val).trim().toUpperCase();
  if (s === 'HIGH' || s === 'H') return 'High';
  if (s === 'MEDIUM' || s === 'M') return 'Medium';
  if (s === 'LOW' || s === 'L') return 'Low';
  return 'Low';
}

function _normalizeCardNameForHoldCheck(name) {
  return String(name || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function _isHeldByCustomer(cardName, activeCardNamesNormalized) {
  var key = _normalizeCardNameForHoldCheck(cardName);
  if (activeCardNamesNormalized[key]) return true;
  for (var k in activeCardNamesNormalized) {
    if (activeCardNamesNormalized.hasOwnProperty(k) && k.replace(/\s+/g, ' ') === key) return true;
  }
  return false;
}

function _reportMonthAnchorForMarket_(reportMonth) {
  var s = String(reportMonth || '').trim();
  var parts = s.split('-');
  if (parts.length < 2) return new Date();
  var y = parseInt(parts[0], 10);
  var m = parseInt(parts[1], 10);
  if (isNaN(y) || isNaN(m) || m < 1 || m > 12) return new Date();
  return new Date(y, m - 1, 1);
}

function _fmtFreshLogDate_(d) {
  if (!d || Object.prototype.toString.call(d) !== '[object Date]' || isNaN(d.getTime())) return '';
  return Utilities.formatDate(d, Session.getScriptTimeZone(), 'yyyy-MM-dd');
}

function runMarketEngine(cardsNormalized, catalogAll, promoCatalog, reportMonth) {
  var activeCardNamesNormalized = {};
  for (var i = 0; i < cardsNormalized.length; i++) {
    var n = _normalizeCardNameForHoldCheck(cardsNormalized[i].cardName);
    activeCardNamesNormalized[n] = true;
  }
  var signals = [];
  if (!catalogAll || catalogAll.length === 0) {
    Logger.log('[MarketLayer] total candidates before filters: 0 (no catalog)');
    return signals;
  }
  var headers = catalogAll[0];
  var nameIdx = -1;
  var bonusLevelIdx = -1;
  var typicalBonusIdx = -1;
  var issuerIdx = -1;
  var bonusValidUntilIdx = -1;
  for (var h = 0; h < headers.length; h++) {
    var hLower = String(headers[h] || '').toLowerCase();
    if (hLower.indexOf('card name') >= 0 || hLower.indexOf('name') >= 0) nameIdx = h;
    if (hLower.indexOf('bonus level') >= 0) bonusLevelIdx = h;
    if (hLower.indexOf('typical bonus') >= 0 || hLower.indexOf('bonus value') >= 0) typicalBonusIdx = h;
    if (hLower.indexOf('issuer') >= 0) issuerIdx = h;
    if (hLower.indexOf('bonus_valid_until') >= 0 || hLower.indexOf('bonus valid until') >= 0 || hLower.indexOf('valid until') >= 0) bonusValidUntilIdx = h;
  }
  if (nameIdx < 0) {
    Logger.log('[MarketLayer] total candidates before filters: 0 (no name column)');
    return signals;
  }
  var totalCandidates = catalogAll.length - 1;
  Logger.log('[MarketLayer] total candidates before filters: ' + totalCandidates);
  var anchorDate = _reportMonthAnchorForMarket_(reportMonth);
  Logger.log('[MarketLayer] freshness_source=promo_last_checked_at (Promo_Catalog), report_month=' + String(reportMonth || '') + ', anchor=' + _fmtFreshLogDate_(anchorDate));
  var promoFreshByCard = {};
  for (var p = 0; p < (promoCatalog || []).length; p++) {
    var promo = promoCatalog[p] || {};
    var pCard = promo.card_name == null ? '' : String(promo.card_name).trim();
    if (!pCard) continue;
    var key = _normalizeCardNameForHoldCheck(pCard);
    var raw = promo.promo_last_checked_at;
    if (raw == null || String(raw).trim() === '') continue;
    var parsed = new Date(raw);
    if (isNaN(parsed.getTime())) {
      Logger.log('[FreshCheck] parse_error promo_id=' + String(promo.promo_id || '') + ', raw_last_checked=' + String(raw));
      continue;
    }
    var curr = promoFreshByCard[key];
    if (!curr || parsed.getTime() > curr.parsed.getTime()) {
      promoFreshByCard[key] = {
        promo_id: String(promo.promo_id || ''),
        raw_last_checked: String(raw),
        parsed: parsed
      };
    }
  }
  var freshDays = typeof DECISION_CONFIG !== 'undefined' ? DECISION_CONFIG.MARKET_FRESH_DAYS : 120;
  var cap = typeof DECISION_CONFIG !== 'undefined' ? DECISION_CONFIG.MARKET_WINDOW_CAP : 5;
  var afterNotHeld = 0;
  var afterBonusLevelHigh = 0;
  var afterFresh = 0;
  for (var r = 1; r < catalogAll.length; r++) {
    var row = catalogAll[r];
    var cardName = row[nameIdx] ? String(row[nameIdx]).trim() : '';
    if (!cardName) continue;
    if (_isHeldByCustomer(cardName, activeCardNamesNormalized)) continue;
    afterNotHeld++;
    var bonusLevel = _normalizeBonusLevel(bonusLevelIdx >= 0 ? row[bonusLevelIdx] : null);
    if (bonusLevel !== 'High') continue;
    afterBonusLevelHigh++;
    var typicalBonus = 0;
    if (typicalBonusIdx >= 0 && row[typicalBonusIdx] != null && String(row[typicalBonusIdx]).trim() !== '') {
      var tb = parseFloat(String(row[typicalBonusIdx]).replace(/[^0-9.-]/g, ''));
      if (!isNaN(tb)) typicalBonus = tb;
    }
    var promoFresh = promoFreshByCard[_normalizeCardNameForHoldCheck(cardName)];
    if (!promoFresh) {
      Logger.log('[FreshCheck] promo_id= raw_last_checked= parsed_date= days_diff= threshold=' + freshDays + ' is_fresh=false');
      continue;
    }
    var daysOld = Math.floor((anchorDate.getTime() - promoFresh.parsed.getTime()) / 86400000);
    var isFresh = daysOld <= freshDays;
    Logger.log('[FreshCheck] promo_id=' + promoFresh.promo_id +
      ' raw_last_checked=' + promoFresh.raw_last_checked +
      ' parsed_date=' + _fmtFreshLogDate_(promoFresh.parsed) +
      ' days_diff=' + daysOld +
      ' threshold=' + freshDays +
      ' is_fresh=' + isFresh);
    if (!isFresh) continue;
    afterFresh++;
    var bonusValidUntil = null;
    if (bonusValidUntilIdx >= 0 && row[bonusValidUntilIdx] != null && String(row[bonusValidUntilIdx]).trim() !== '') {
      bonusValidUntil = String(row[bonusValidUntilIdx]).trim();
    }
    var isStale = false;
    var isValid = true;
    if (daysOld > (typeof DECISION_CONFIG !== 'undefined' ? DECISION_CONFIG.STALE_DAYS : 45)) isStale = true;
    if (bonusValidUntil) {
      var validDt = _parseYmd_(bonusValidUntil);
      if (validDt && validDt < anchorDate) isValid = false;
    }
    var one_time_bonus_potential = typicalBonus || 0;
    var why = 'bonus_level=High, freshness_days=' + daysOld + ', not_held';
    signals.push({
      cardName: cardName,
      issuer: issuerIdx >= 0 && row[issuerIdx] ? String(row[issuerIdx]).trim() : '',
      bonusLevel: bonusLevel,
      typicalBonusValue: typicalBonus,
      one_time_bonus_potential: one_time_bonus_potential,
      bonusLastUpdated: promoFresh.raw_last_checked,
      bonusValidUntil: bonusValidUntil || null,
      isStale: isStale,
      hasLowConfidence: false,
      isValid: isValid,
      why: why,
      estimatedEffort: 15,
      _daysOld: daysOld
    });
  }
  Logger.log('[MarketLayer] after filter not_held: ' + afterNotHeld + ', after bonus_level=High: ' + afterBonusLevelHigh + ', after promo_last_checked_at present and fresh: ' + afterFresh + ', included: ' + signals.length);
  for (var s = 0; s < signals.length; s++) {
    Logger.log('[MarketLayer] included: ' + signals[s].cardName + ' | ' + signals[s].why + ' | typicalBonus=' + signals[s].typicalBonusValue);
  }
  signals.sort(function(a, b) { return (b.typicalBonusValue || 0) - (a.typicalBonusValue || 0); });
  if (signals.length > cap) {
    signals = signals.slice(0, cap);
  }
  Logger.log('[MarketLayer] after cap (' + cap + '): ' + signals.length);
  return signals;
}

function testMarketWindowFilter() {
  var catalogAll = [
    ['Card Name', 'Bonus Level', 'Typical Bonus Value (USD)', 'bonus_last_updated'],
    ['Card A', 'High', 500, '2025-01-15'],
    ['Card B', 'High', 300, ''],
    ['Card C', 'Medium', 400, '2025-02-01'],
    ['Card D', 'High', 600, 'Unknown'],
    ['Card E', 'High', 450, '2025-06-01'],
    ['Card F', 'Low', 200, '2025-01-01'],
    ['Card G', 'High', 550, '2024-01-01']
  ];
  var cardsNormalizedHoldingA = [{ cardName: 'Card A' }];
  var cardsNormalizedHoldingAB = [{ cardName: 'Card A' }, { cardName: 'Card B' }];
  var cardsNormalizedEmpty = [];
  var promoCatalog = [
    { promo_id: 'P-A', card_name: 'Card A', promo_last_checked_at: '2025-01-15' },
    { promo_id: 'P-C', card_name: 'Card C', promo_last_checked_at: '2025-02-01' },
    { promo_id: 'P-E', card_name: 'Card E', promo_last_checked_at: '2025-06-01' },
    { promo_id: 'P-F', card_name: 'Card F', promo_last_checked_at: '2025-01-01' },
    { promo_id: 'P-G', card_name: 'Card G', promo_last_checked_at: '2024-01-01' }
  ];
  var reportMonth = '2025-07';
  var now = new Date();
  var freshDays = typeof DECISION_CONFIG !== 'undefined' ? DECISION_CONFIG.MARKET_FRESH_DAYS : 120;
  var july2025 = new Date(2025, 6, 15);
  var signalsEmpty = runMarketEngine(cardsNormalizedEmpty, catalogAll, promoCatalog, reportMonth);
  var signalsHoldingA = runMarketEngine(cardsNormalizedHoldingA, catalogAll, promoCatalog, reportMonth);
  var signalsHoldingAB = runMarketEngine(cardsNormalizedHoldingAB, catalogAll, promoCatalog, reportMonth);
  var ok = true;
  if (signalsEmpty.length > 5) {
    Logger.log('FAIL: expected at most 5 MarketWindow when holding none, got ' + signalsEmpty.length);
    ok = false;
  }
  if (signalsHoldingA.length > 5) {
    Logger.log('FAIL: expected at most 5 MarketWindow when holding Card A, got ' + signalsHoldingA.length);
    ok = false;
  }
  var hasCardB = signalsEmpty.some(function(s) { return s.cardName === 'Card B'; });
  if (hasCardB) {
    Logger.log('FAIL: Card B has blank bonus_last_updated, should be excluded');
    ok = false;
  }
  var hasCardD = signalsEmpty.some(function(s) { return s.cardName === 'Card D'; });
  if (hasCardD) {
    Logger.log('FAIL: Card D has Unknown bonus_last_updated, should be excluded');
    ok = false;
  }
  var hasCardC = signalsEmpty.some(function(s) { return s.cardName === 'Card C'; });
  if (hasCardC) {
    Logger.log('FAIL: Card C is Medium, should be excluded (only High)');
    ok = false;
  }
  var hasCardAWhenHoldingA = signalsHoldingA.some(function(s) { return s.cardName === 'Card A'; });
  if (hasCardAWhenHoldingA) {
    Logger.log('FAIL: Card A is held by customer, should not appear in MarketWindow');
    ok = false;
  }
  if (ok) {
    Logger.log('testMarketWindowFilter: all checks passed. MarketWindow count (no hold)=' + signalsEmpty.length + ', (holding A)=' + signalsHoldingA.length + ', (holding A+B)=' + signalsHoldingAB.length);
  }
  return ok;
}
