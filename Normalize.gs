/**
 * @file Normalize.gs
 * Normalize Card Assets data: parse spend ranges, enrich from catalog.
 */

var SPEND_RANGE_MAP = {
  '<$10000': 5000,
  '<$10k': 5000,
  '$10000-$30000': 20000,
  '$10k-$30k': 20000,
  '$30000-$60000': 45000,
  '$30k-$60k': 45000,
  '$60000-$100000': 80000,
  '$60k-$100k': 80000,
  '$100000+': 120000,
  '$100k+': 120000
};

function _parseSpendRange(rangeStr) {
  if (!rangeStr || rangeStr === '') return 0;
  var s = String(rangeStr).trim().replace(/[–—]/g, '-');
  var normalized = s.replace(/\s/g, '');
  if (SPEND_RANGE_MAP[normalized] !== undefined) return SPEND_RANGE_MAP[normalized];
  normalized = s.toLowerCase();
  if (SPEND_RANGE_MAP[normalized] !== undefined) return SPEND_RANGE_MAP[normalized];
  for (var k in SPEND_RANGE_MAP) {
    if (normalized.indexOf(k.toLowerCase().replace(/\$/g, '').replace(/k/g, '000')) >= 0) {
      return SPEND_RANGE_MAP[k];
    }
  }
  return 0;
}

function _parseDate(dateStr) {
  if (!dateStr || dateStr === '') return null;
  var s = String(dateStr).trim();
  var parts = s.split('-');
  if (parts.length >= 2) {
    var year = parseInt(parts[0], 10);
    var month = parseInt(parts[1], 10);
    if (!isNaN(year) && !isNaN(month) && month >= 1 && month <= 12) {
      var day = parts.length >= 3 ? parseInt(parts[2], 10) : 1;
      if (isNaN(day) || day < 1 || day > 31) day = 1;
      return { year: year, month: month, day: day, raw: s };
    }
  }
  return null;
}

function _normalizeDowngradeOption(val) {
  if (val === null || val === undefined || val === '') return null;
  var s = String(val).trim().toUpperCase();
  if (s === 'TRUE' || s === 'YES' || s === 'Y' || s === '1') return true;
  if (s === 'FALSE' || s === 'NO' || s === 'N' || s === '0') return false;
  return null;
}

function _normalizeBonusLevel(val) {
  if (val === null || val === undefined || val === '') return null;
  var s = String(val).trim().toUpperCase();
  if (s === 'HIGH' || s === 'H') return 'High';
  if (s === 'MEDIUM' || s === 'M') return 'Medium';
  if (s === 'LOW' || s === 'L') return 'Low';
  return String(val).trim();
}

function _monthsSince(dateObj, referenceDate) {
  if (!dateObj) return null;
  var ref = referenceDate || new Date();
  var cardDate = new Date(dateObj.year, dateObj.month - 1, 1);
  var months = (ref.getFullYear() - cardDate.getFullYear()) * 12 + (ref.getMonth() - cardDate.getMonth());
  return months;
}

function _parseBonusCollected(val) {
  if (val === null || val === undefined) return false;
  var s = String(val).trim().toUpperCase();
  if (s === '') return false;
  return s === 'YES' || s === 'Y' || s === 'TRUE' || s === '1' || s === '是';
}

function _openedToDateObj(val) {
  if (val == null || val === '') return null;
  if (val && val.getFullYear && val.getMonth) {
    var d = val;
    return { year: d.getFullYear(), month: d.getMonth() + 1, day: 1, raw: d.getFullYear() + '-' + (d.getMonth() < 9 ? '0' : '') + (d.getMonth() + 1) };
  }
  return _parseDate(val);
}

function normalizeCards_(cards, catalogMap) {
  var normalized = [];
  var now = new Date();
  var platinumDebugLine = null;
  for (var i = 0; i < cards.length; i++) {
    var card = cards[i];
    var cardName = card['Card Name'] ? String(card['Card Name']).trim() : '';
    if (!cardName) continue;
    var catalogRec = findCatalogRecord(catalogMap, cardName);
    var spendRange = card['Current Annual Spend (Range)'] || card['Spend Range'] || '';
    var annualSpendValue = _parseSpendRange(spendRange);
    var openedRaw = card['Opened (YYYY-MM)'] || card['Opened'] || card['Opened Date'] || '';
    var openedDate = _openedToDateObj(openedRaw);
    var monthsSinceOpened = openedDate ? _monthsSince(openedDate, now) : null;
    var bonusCollected = _parseBonusCollected(card['Bonus Collected?'] || card['Bonus Collected'] || card['Bonus collected']);
    var assetFeeRaw = card['Annual Fee'];
    var assetFee = (assetFeeRaw !== null && assetFeeRaw !== undefined && assetFeeRaw !== '')
      ? Number(assetFeeRaw)
      : null;
    if (assetFee !== null && isNaN(assetFee)) {
      assetFee = null;
    }
    var catalogFee = Number((catalogRec && catalogRec.annual_fee_current) || 0);
    if (isNaN(catalogFee)) catalogFee = 0;
    var annualFee = (assetFee !== null) ? assetFee : catalogFee;
    var baseReturn = 0.01;
    if (catalogRec && catalogRec['Base Return (Conservative)'] != null && catalogRec['Base Return (Conservative)'] !== '') {
      var br = parseFloat(String(catalogRec['Base Return (Conservative)']).replace(/[^0-9.-]/g, ''));
      if (!isNaN(br)) {
        baseReturn = br > 1 ? br / 100 : br;
      }
    }
    var downgradeOption = false;
    if (catalogRec && catalogRec['Downgrade Option'] != null) {
      var dOpt = _normalizeDowngradeOption(catalogRec['Downgrade Option']);
      downgradeOption = dOpt === true;
    }
    var bonusLevel = 'Unknown';
    if (catalogRec && catalogRec['Bonus Level'] != null) {
      var bl = _normalizeBonusLevel(catalogRec['Bonus Level']);
      bonusLevel = bl != null ? bl : 'Unknown';
    }
    var typicalBonusValue = 0;
    if (catalogRec && catalogRec['Typical Bonus Value (USD)'] != null && catalogRec['Typical Bonus Value (USD)'] !== '') {
      var tbv = parseFloat(String(catalogRec['Typical Bonus Value (USD)']).replace(/[^0-9.-]/g, ''));
      if (!isNaN(tbv)) typicalBonusValue = tbv;
    }
    var issuer = '';
    if (catalogRec && catalogRec['Issuer']) {
      issuer = String(catalogRec['Issuer']).trim();
    }
    var assetsLastConfirmed = null;
    if (card['assets_last_confirmed']) {
      var confirmedVal = card['assets_last_confirmed'];
      if (confirmedVal instanceof Date) {
        assetsLastConfirmed = confirmedVal;
      } else if (typeof confirmedVal === 'string' || typeof confirmedVal === 'number') {
        var dt = new Date(confirmedVal);
        if (!isNaN(dt.getTime())) assetsLastConfirmed = dt;
      }
    }
    normalized.push({
      cardName: cardName,
      annualFee: annualFee,
      annualSpendValue: annualSpendValue,
      baseReturn: baseReturn,
      downgradeOption: downgradeOption,
      bonusLevel: bonusLevel,
      typicalBonusValue: typicalBonusValue,
      issuer: issuer,
      openedDate: openedDate,
      monthsSinceOpened: monthsSinceOpened,
      bonusCollected: bonusCollected,
      assignedCategory: card['Assigned Category'] || '',
      status: card['Status'] || 'Active',
      assetsLastConfirmed: assetsLastConfirmed
    });
    if (cardName.toLowerCase().indexOf('platinum') >= 0) {
      platinumDebugLine = 'DEBUG Platinum fee asset=' + assetFee +
        ' catalog=' + catalogFee +
        ' final=' + annualFee;
    }
  }
  if (platinumDebugLine) {
    try {
      var dbgSs = SpreadsheetApp.getActiveSpreadsheet();
      var dbgSheet = dbgSs ? dbgSs.getSheetByName('Reports') : null;
      if (dbgSheet) dbgSheet.getRange('H4').setValue(platinumDebugLine);
    } catch (e) {}
  }
  return normalized;
}
