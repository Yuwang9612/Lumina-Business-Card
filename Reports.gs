/**
 * @file Reports.gs
 * Three regions: A) First Wake-up, B) Monthly Health, C) Alerts. Row constants avoid A-region expansion overwriting B/C.
 */
var FIRST_START_ROW = 6;
var MONTHLY_START_ROW = 150;
var ALERTS_HEADER_ROW = 220;
var ALERTS_DATA_START_ROW = 221;

var ALERTS_HEADER = ['Level', 'Type', 'Card', 'Issue', '12-mo Impact', 'Action', 'Effort', ''];
var COLOR_FIRST_TITLE_BG = '#2E4053';
var COLOR_MONTHLY_TITLE = '#DDEBF7';
var COLOR_ALERTS_TITLE = '#FFF2CC';
var COLOR_ORANGE = '#FFEB9C';
var COLOR_DARK_ORANGE = '#F4B183';
var COLOR_RED = '#FFC7CE';
var WHITE = '#ffffff';
var COLOR_BLEEDING_ROW = '#FFE6E6';
var COLOR_WATCH_ROW = '#FFF9E6';
var COLOR_TABLE_HEADER = '#F0F0F0';
var COLOR_GRAY_TEXT = '#505050';

var COPY_ZH = {
  reportTitle: 'A) 本月信用卡收益体检（行动版）',
  bleedingTitle: function(name, loss, actionLabel) {
    return '止血优先：' + name + ' 正在每年亏约 $' + loss + '，建议' + actionLabel;
  },
  watchTitle: function(name) {
    return name + '：建议调整刷卡分工';
  },
  efficientTitle: function(name, net) {
    return name + '：建议继续保留';
  },
  marketTitle: function(name) {
    return '机会提示：' + name + ' 当前开卡奖励很高（可选新增）';
  },
  marketLead: '这是可选的新增卡机会（不替代止血动作）。只有当您计划未来3个月新增信用卡时才考虑。',
  marketReplaceHint: '如果要替换高年费低回报卡，可把它作为候选之一，但是否适合取决于您的信用与消费节奏。',
  marketUpdated: function(dateStr) { return '数据更新时间：' + (dateStr ? dateStr : 'Unknown'); },
  marketStaleTag: '（窗口数据可能需要更新）'
};

function _promoLevelWeight_(level) {
  if (level === 'High') return 3;
  if (level === 'Medium') return 2;
  return 1;
}

function _fmtPromoDate_(d) {
  if (!d || Object.prototype.toString.call(d) !== '[object Date]' || isNaN(d.getTime())) return 'N/A';
  return Utilities.formatDate(d, Session.getScriptTimeZone(), 'yyyy-MM-dd');
}

function getReportMonth_(now) {
  const ov = DECISION_CONFIG.REPORT_MONTH_OVERRIDE;
  if (ov && String(ov).trim()) return String(ov).trim();
  return Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyy-MM');
}

function reportMonthToAnchorDate_(reportMonth) {
  var s = String(reportMonth || '').trim();
  var parts = s.split('-');
  if (parts.length < 2) return new Date();
  var y = parseInt(parts[0], 10);
  var m = parseInt(parts[1], 10);
  if (isNaN(y) || isNaN(m) || m < 1 || m > 12) return new Date();
  return new Date(y, m - 1, 1);
}

function _logEnvLock_(tag) {
  var env = String((DECISION_CONFIG && DECISION_CONFIG.DATA_ENV) || 'PROD').toUpperCase();
  var assets = getSheetName_(SHEET_ASSETS);
  var catalog = getSheetName_(SHEET_CATALOG);
  var promo = getSheetName_(SHEET_PROMO_CATALOG);
  Logger.log('[ENV] DATA_ENV=%s assets=%s catalog=%s promo=%s tag=%s', env, assets, catalog, promo, String(tag || ''));
}

function selectTopPromos_(promos, cap) {
  var list = (promos || []).slice();
  list.sort(function(a, b) {
    var levelDiff = _promoLevelWeight_(b.promo_level) - _promoLevelWeight_(a.promo_level);
    if (levelDiff !== 0) return levelDiff;
    return (b.bonus_value_est_usd || 0) - (a.bonus_value_est_usd || 0);
  });
  var n = cap != null ? cap : (DECISION_CONFIG.PROMO_CAP || 3);
  return list.slice(0, n);
}

function buildFirstPromoLines_(promos, totalActiveCount) {
  if (!promos || promos.length === 0) {
    return ['Opportunities (Promotions)', '本周暂无可用 promotion（下次更新：每周）'];
  }
  var lines = ['Opportunities (Promotions)', '本周有 ' + totalActiveCount + ' 个可选 promotion（周更）：'];
  for (var i = 0; i < promos.length; i++) {
    var p = promos[i];
    lines.push((i + 1) + ') ' + (p.card_name || 'Unknown Card') + ' — ' + (p.promo_headline || '') + '（Est $' + _fmtNum(p.bonus_value_est_usd || 0) + '，截止 ' + _fmtPromoDate_(p.promo_end_date) + '）' + (p.affiliate_url ? ' [Apply Link] ' + p.affiliate_url : ''));
  }
  return lines;
}

function buildMonthlyPromoLine_(promos) {
  if (!promos || promos.length === 0) return '';
  var parts = promos.map(function(p) {
    return (p.card_name || 'Unknown') + '（Est $' + _fmtNum(p.bonus_value_est_usd || 0) + '，截止 ' + _fmtPromoDate_(p.promo_end_date) + '）';
  });
  return '本周机会（可选）：Top 1–3\n' + parts.join('；');
}

function getBleedingSuggestionLabel(struct) {
  return struct.downgradeOption ? '优先降级保留账户' : '取消/替换更合适的卡';
}

function getBleedingSuggestionPara(struct) {
  var fee = struct.annualFee != null ? struct.annualFee : 0;
  var spendVal = struct.annualSpendValue != null ? struct.annualSpendValue : 0;
  if (struct.downgradeOption) {
    var extra = (fee > 300 && spendVal < 10000) ? '（当前年费较高且支出较低，转换可显著减负）' : '';
    return '建议优先考虑转换为低年费版本（Product Change），以保留信用历史并减少年费支出。' + extra;
  }
  return '建议在年费到期前取消或替换此卡。';
}

function _isDevMode_() {
  return !!(DECISION_CONFIG && DECISION_CONFIG.DEV_MODE);
}

function normalizeEventType_(t) {
  if (t == null || t === '') return t;
  var raw = String(t).trim();
  var lower = raw.toLowerCase();
  var map = {
    bleeding: 'Bleeding',
    prebonus: 'PreBonus',
    feedue: 'FeeDue',
    annual_fee_due: 'FeeDue',
    datastale: 'DataStale',
    dataanomaly: 'DataAnomaly',
    marketwindow: 'MarketWindow'
  };
  if (map[lower]) return map[lower];
  if (['Bleeding', 'PreBonus', 'FeeDue', 'DataStale', 'DataAnomaly', 'MarketWindow'].indexOf(raw) < 0) {
    Logger.log('[EventType][Warn] unknown event type: ' + raw);
  }
  return raw;
}

function _defaultActionByIssueType_(issueType) {
  var t = normalizeEventType_(issueType);
  if (t === 'Bleeding') return 'Cancel, downgrade, or replace before the next annual fee hits.';
  if (t === 'PreBonus') return 'Complete the required spend before the deadline to secure the bonus.';
  if (t === 'FeeDue') return 'Decide to keep or cancel before the fee posts.';
  if (t === 'DataStale') return 'Confirm your spend and fee data to ensure accuracy.';
  if (t === 'MarketWindow') return 'Review upgrade/downgrade options on your existing cards.';
  return 'Review this item and take the best next step.';
}

function _firstItemToFocus_(item) {
  var out = { type: item.type || '', cardName: item.cardName || '', title: '', status: '', action: '', impactUsd: null };
  if (item.type === 'BLEEDING' && item.structure) {
    var s = item.structure;
    var loss = Math.max(0, Math.round((s.annualFee || 0) - (s.estValue || 0)));
    out.cardName = s.cardName || out.cardName;
    out.title = out.cardName + ' - This card is losing money';
    out.status = loss > 0 ? ('Estimated annual loss is $' + _fmtNum(loss) + ' based on current inputs.') : 'Potential upside';
    out.action = s.downgradeOption ? 'Prioritize downgrade/product change before cancellation.' : 'Cancel or replace before the annual fee posts.';
    out.impactUsd = loss > 0 ? loss : null;
  } else if (item.type === 'BONUS_NOT_COLLECTED') {
    out.title = out.cardName + ' - Bonus not yet confirmed';
    out.status = 'This card appears to be in the welcome bonus period and completion is not confirmed.';
    out.action = 'Complete bonus requirements first, then revisit optimization.';
  } else if (item.type === 'WATCH' && item.structure) {
    out.cardName = item.structure.cardName || out.cardName;
    var unlockRaw = item.unlockAmount != null ? item.unlockAmount
      : (item.realizableDelta != null ? item.realizableDelta
      : (item.delta != null ? item.delta : item.impactUsd));
    var unlock = unlockRaw != null ? Number(unlockRaw) : NaN;
    if (!isNaN(unlock) && unlock > 0) {
      out.title = out.cardName + ' - Spending allocation can be improved';
      out.status = 'Moving spend to the strongest card in each category can increase your recurring return. Estimated unlock: +$' + _fmtNum(Math.round(unlock)) + '/year.';
    } else {
      out.title = out.cardName + ' - Spending structure could be simplified';
      out.status = 'We see mild overlap across cards. This won\'t increase net return immediately, but improves clarity and monitoring accuracy. Optional adjustment.';
    }
    out.action = 'Move high-return categories to a better-fit card.';
  } else if (item.type === 'EFFICIENT' && item.structure) {
    out.cardName = item.structure.cardName || out.cardName;
    out.title = out.cardName + ' - Keep as is';
    out.status = 'Current net value is positive.';
    out.action = 'Keep and review monthly.';
    var efficientImpact = Math.round(item.structure.net || 0);
    out.impactUsd = efficientImpact > 0 ? efficientImpact : null;
  } else {
    out.title = (out.cardName || 'Card') + ' - ' + (out.type || 'Item');
    out.status = 'Review needed.';
    out.action = _defaultActionByIssueType_(out.type);
  }
  if (out.impactUsd != null && Number(out.impactUsd) <= 0) out.impactUsd = null;
  if (!out.action || /check report details/i.test(String(out.action))) out.action = _defaultActionByIssueType_(out.type);
  return out;
}

function _buildFirstModel_(decisionPlan, topPromos, activePromoCount) {
  var ps = decisionPlan.portfolioSummary || {};
  var focusItems = (decisionPlan.items || []).slice(0, 5).map(_firstItemToFocus_);
  var portfolioSummaryText = 'Current net is $' + _fmtNum(ps.currentNet || 0) + '; following the plan estimates $' + _fmtNum(ps.optimizedNet || 0) + ' (delta $' + _fmtNum(ps.delta || 0) + ').';
  var promoLines = buildFirstPromoLines_(topPromos || [], activePromoCount || 0);
  var promoBlock = promoLines.slice(1).join('\n');
  var footer = 'Weekly promotions are informational. The system reviews monthly and alerts only on meaningful changes. Some adjustments may not increase net return, but improve long-term efficiency and monitoring accuracy.';
  return {
    reportDate: Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd'),
    reportTitle: 'First Wake-up Report (Action Plan)',
    keyNumbers: {
      currentNet: ps.currentNet || 0,
      optimizedNet: ps.optimizedNet || 0,
      delta: ps.delta || 0,
      currentFees: ps.currentFees || 0,
      currentValue: ps.currentValue || 0,
      oneTimeBonusAtRisk: ps.oneTimeBonusAtRisk || 0,
      missedBonusValue: ps.missedBonusValue || 0,
      totalPotentialThisYear: ps.totalPotentialThisYear || (ps.currentNet || 0)
    },
    focusItems: focusItems,
    portfolioSummaryText: portfolioSummaryText,
    promoBlock: promoBlock,
    topPromos: topPromos || [],
    promotions: (topPromos || []).map(function(p) {
      return {
        cardName: p.card_name || '',
        promo_headline: p.promo_headline || '',
        bonus_value_est_usd: p.bonus_value_est_usd,
        promo_end_date: p.promo_end_date || null,
        affiliate_url: p.affiliate_url || ''
      };
    }),
    footer: footer
  };
}

function _buildMonthlyModelItems_(events, catalogMap) {
  var displayTypes = ['Bleeding', 'PreBonus', 'FeeDue', 'DataStale', 'DataAnomaly'];
  var filtered = (events || []).filter(function(e) { return displayTypes.indexOf(normalizeEventType_(e.event_type)) >= 0; });
  filtered.sort(function(a, b) {
    var pa = MONTHLY_EVENT_PRIORITY[normalizeEventType_(a.event_type)] || 99;
    var pb = MONTHLY_EVENT_PRIORITY[normalizeEventType_(b.event_type)] || 99;
    return pa - pb;
  });
  var top = filtered.slice(0, 5);
  var items = [];
  for (var i = 0; i < top.length; i++) {
    var e = top[i];
    var name = e.card_name || e.card_id || 'Card';
    var data = _parseEventJson(e.current_value_json);
    var issueType = normalizeEventType_(e.event_type || '');
    var status = '';
    var action = '';
    var impactUsd = null;
    if (issueType === 'Bleeding') {
      var loss = 0;
      if (data.net != null) loss = Math.abs(parseFloat(data.net));
      else if (data.annual_fee != null && data.est_value != null) loss = Math.abs(parseFloat(data.annual_fee) - parseFloat(data.est_value));
      impactUsd = isNaN(loss) ? null : Math.round(loss);
      if (impactUsd != null && impactUsd <= 0) impactUsd = null;
      status = impactUsd != null ? ('Estimated annual loss is about $' + _fmtNum(impactUsd) + ' based on current inputs.') : 'Potential upside';
      action = _downgradeOptionFromCatalog(catalogMap, name)
        ? 'Prioritize downgrade/product change before cancellation.'
        : 'Cancel or replace before the annual fee posts.';
    } else if (issueType === 'PreBonus') {
      status = 'Bonus completion is not confirmed.';
      action = 'Complete required spend and confirm bonus status.';
    } else if (issueType === 'FeeDue') {
      var days = data.days_until != null ? parseInt(data.days_until, 10) : _daysUntilFeeDue(data.fee_due_month);
      if (days == null || isNaN(days)) days = 30;
      var feeAmt = data.annual_fee != null ? Number(data.annual_fee) : NaN;
      var feeMonth = data.fee_due_month ? String(data.fee_due_month) : '';
      status = 'Annual renewal approaching (' + (isNaN(feeAmt) ? 'amount not provided' : ('$' + _fmtNum(Math.round(feeAmt)) + ' due in ' + (feeMonth || 'upcoming cycle'))) + '). Review before renewal to confirm net value still justifies the fee.';
      action = 'Review before renewal: cancel/downgrade only if benefits don\'t justify the fee.';
    } else if (issueType === 'DataStale') {
      status = 'Data was not confirmed this month.';
      action = 'Confirm current inputs to keep recommendations accurate.';
    } else if (issueType === 'DataAnomaly') {
      status = 'A large input change was detected.';
      action = 'Verify annual fee and spend entries.';
    }
    items.push({
      cardName: name,
      issueType: issueType,
      issueTitle: issueType === 'Bleeding' ? 'This card is losing money'
        : issueType === 'PreBonus' ? 'Bonus not yet confirmed'
        : issueType === 'FeeDue' ? 'Annual renewal approaching'
        : issueType === 'DataStale' ? 'Data not confirmed'
        : issueType === 'DataAnomaly' ? 'Large change detected'
        : 'Item to review',
      status: status,
      action: action || _defaultActionByIssueType_(issueType),
      impactUsd: (impactUsd != null && Number(impactUsd) > 0) ? impactUsd : null
    });
  }
  return items;
}

function _normalizeMonthlyIssueType_(typeRaw) {
  return String(normalizeEventType_(typeRaw) || '').toLowerCase();
}

function _buildMonthlySummaryLineFromItems_(items, activeCardCount) {
  if (!items || items.length === 0) {
    if ((activeCardCount || 0) === 0) return 'No active business credit cards detected. To begin building a profitable structure, start with one core card aligned to your largest spend category.';
    return 'This month: no issues detected; your setup looks stable.';
  }
  var flags = {};
  for (var i = 0; i < items.length; i++) {
    var t = _normalizeMonthlyIssueType_(items[i].issueType || '');
    flags[t] = true;
  }
  var parts = [];
  if (flags.bleeding) parts.push('bleeding card');
  if (flags.prebonus) parts.push('bonus not yet confirmed');
  if (flags.feedue) parts.push('annual renewal approaching');
  if (flags.datastale) parts.push('data not confirmed');
  if (flags.dataanomaly) parts.push('large change detected');
  return 'This month: ' + items.length + ' item(s) need attention' + (parts.length ? ' - ' + parts.slice(0, 2).join(' + ') + '.' : '.');
}

function _buildMonthlyItemDedupeKey_(reportMonth, item) {
  var rm = String(reportMonth || '').trim();
  var issueType = String(item && item.issueType ? item.issueType : '').trim();
  var cardName = String(item && item.cardName ? item.cardName : '').trim().toLowerCase();
  return rm + '|' + issueType + '|' + cardName;
}

function _dedupeMonthlyItems_(reportMonth, items) {
  var map = {};
  var order = [];
  for (var i = 0; i < (items || []).length; i++) {
    var item = items[i];
    var key = _buildMonthlyItemDedupeKey_(reportMonth, item);
    if (!map.hasOwnProperty(key)) {
      map[key] = item;
      order.push(key);
      continue;
    }
    var curr = map[key];
    var isBleeding = String(item.issueType || '').toLowerCase() === 'bleeding';
    if (!isBleeding) continue;
    var currImpact = curr && curr.impactUsd != null ? Number(curr.impactUsd) : NaN;
    var nextImpact = item && item.impactUsd != null ? Number(item.impactUsd) : NaN;
    if (!isNaN(nextImpact) && (isNaN(currImpact) || nextImpact >= currImpact)) {
      map[key] = item;
    }
  }
  var out = [];
  for (var j = 0; j < order.length; j++) out.push(map[order[j]]);
  return out;
}

function runFirstReport(ss) {
  var now = new Date();
  const reportMonth = getReportMonth_(new Date());
  _logEnvLock_('runFirstReport');
  var anchorNow = reportMonthToAnchorDate_(reportMonth);
  if (DECISION_CONFIG && DECISION_CONFIG.TIME_ANCHOR_DEBUG) {
    Logger.log('[TimeAnchor] now=' + now.toISOString() + ', tz=' + Session.getScriptTimeZone() + ', override=' + (DECISION_CONFIG.REPORT_MONTH_OVERRIDE || '') + ', report_month=' + reportMonth);
  }
  if ((typeof DECISION_CONFIG !== 'undefined' && DECISION_CONFIG && (DECISION_CONFIG.DATA_DEBUG || DECISION_CONFIG.PROMO_DEBUG))) {
    var env = String((DECISION_CONFIG && DECISION_CONFIG.DATA_ENV) || 'PROD').toUpperCase();
    Logger.log('[DataEnv] DATA_ENV=' + env);
    Logger.log('[DataEnv] assetsSheet=' + getSheetName_(SHEET_ASSETS));
    Logger.log('[DataEnv] catalogSheet=' + getSheetName_(SHEET_CATALOG));
    Logger.log('[DataEnv] promoSheet=' + getSheetName_(SHEET_PROMO_CATALOG));
  }
  var reportSheet = _getSheetByName(ss, SHEET_REPORTS);
  var cards = getActiveCards(ss);
  var catalogMap = getCatalogMap(ss);
  var catalogAll = getCatalogAll(ss);
  var cardsNormalized = normalizeCards_(cards, catalogMap);
  var structureResults = runStructureEngine(cardsNormalized);
  var promoCatalog = getPromoCatalog(ss);
  var bonusLifecycleRows = deriveBonusLifecycleForPortfolio_(cardsNormalized, promoCatalog, anchorNow, DECISION_CONFIG);
  var lifecycleResults = runLifecycleEngine(cardsNormalized, bonusLifecycleRows, reportMonth);
  var marketSignals = runMarketEngine(cardsNormalized, catalogAll, promoCatalog, reportMonth);
  var portfolioSummary = computePortfolioSummary(structureResults);
  var oneTimeBonusAtRisk = computeOneTimeBonusAtRisk_(bonusLifecycleRows);
  var missedBonusValue = computeMissedBonusValue_(bonusLifecycleRows);
  var totalPotentialThisYear = computeTotalPotentialThisYear_(portfolioSummary.currentNet, oneTimeBonusAtRisk);
  portfolioSummary.oneTimeBonusAtRisk = oneTimeBonusAtRisk;
  portfolioSummary.missedBonusValue = missedBonusValue;
  portfolioSummary.totalPotentialThisYear = totalPotentialThisYear;
  var decisionPlan = runOrchestrator(structureResults, lifecycleResults, marketSignals, portfolioSummary);
  var activePromos = filterActivePromos_(promoCatalog, anchorNow);
  var topPromos = selectTopPromos_(activePromos, DECISION_CONFIG.PROMO_CAP || 3);
  var firstModel = _buildFirstModel_(decisionPlan, topPromos, activePromos.length);
  firstModel.oneTimeBonusAtRisk = oneTimeBonusAtRisk;
  firstModel.missedBonusValue = missedBonusValue;
  firstModel.totalPotentialThisYear = totalPotentialThisYear;
  firstModel.bonusLifecycleRows = bonusLifecycleRows;
  firstModel.reportMonth = reportMonth;
  firstModel.structureResults = structureResults;
  firstModel.lifecycleResults = lifecycleResults;
  firstModel.cardsNormalized = cardsNormalized;

  if (_isDevMode_() && reportSheet) {
    reportSheet.getRange(FIRST_START_ROW, 1, MONTHLY_START_ROW - FIRST_START_ROW, 8).clearContent().clearFormat();

    writeReportFirst_(reportSheet, decisionPlan, topPromos, activePromos.length);

    reportSheet.getRange(ALERTS_HEADER_ROW, 1).setValue('C) Alerts Table 底部提醒表');
    var alertsRows = computeAlertsRows(cards, catalogMap);
    writeAlertsTable(reportSheet, alertsRows);
    applyAlertsRegionFormat(reportSheet, alertsRows.length);
  }
  return firstModel;
}

function writeReportFirst_(sheet, decisionPlan, topPromos, activePromoCount) {
  var ps = decisionPlan.portfolioSummary;
  var items = decisionPlan.items || [];
  var row = FIRST_START_ROW;

  sheet.getRange(row, 1, MONTHLY_START_ROW - FIRST_START_ROW, 8).setBackground(WHITE);
  var titleRange = sheet.getRange(row, 1, 1, 8);
  titleRange.merge();
  titleRange.setValue(COPY_ZH.reportTitle);
  titleRange.setFontWeight('bold').setFontSize(16).setFontColor('#FFFFFF').setBackground(COLOR_FIRST_TITLE_BG);
  titleRange.setBorder(false, false, true, false, false, false, null, SpreadsheetApp.BorderStyle.SOLID_MEDIUM);
  row++;

  sheet.getRange(row, 1).setValue('当前12个月净收益：$' + _fmtNum(ps.currentNet));
  sheet.getRange(row, 1, 1, 8).setWrap(false).setBackground(WHITE).setFontSize(14);
  row++;
  sheet.getRange(row, 1).setValue('调整后12个月净收益：$' + _fmtNum(ps.optimizedNet));
  sheet.getRange(row, 1, 1, 8).setWrap(false).setBackground(WHITE).setFontSize(14);
  row++;
  sheet.getRange(row, 1).setValue('差额（可实现）：$' + _fmtNum(ps.delta));
  sheet.getRange(row, 1, 1, 8).setWrap(false).setBackground(WHITE).setFontSize(16).setFontWeight('bold');
  row++;

  var scopeText = '整体来看，在当前用卡结构下：\n\n您公司一年大约支付 $' + _fmtNum(ps.currentFees) + ' 年费，\n预计可获得约 $' + _fmtNum(ps.currentValue) + ' 的积分与权益价值，\n净收益约 $' + _fmtNum(ps.currentNet) + '。\n\n如果按照本报告建议调整，\n预计净收益可提升至 $' + _fmtNum(ps.optimizedNet) + '，\n保守增加约 $' + _fmtNum(ps.delta) + '。\n\n这里的「净收益」指：积分及权益价值 – 年费成本。';
  sheet.getRange(row, 1).setValue(scopeText);
  sheet.getRange(row, 1, 2, 8).setWrap(true).setVerticalAlignment('top').setFontSize(12).setFontColor(COLOR_GRAY_TEXT).setBackground(WHITE);
  row += 2;

  row++;
  var hasPreBonus = false;
  var hasBleeding = false;
  for (var i = 0; i < items.length; i++) {
    var item = items[i];
    var isFocus = i === 0 && (item.type === 'BONUS_NOT_COLLECTED' || item.type === 'BLEEDING');
    if (item.type === 'BONUS_NOT_COLLECTED') {
      hasPreBonus = true;
      var titleLine = item.cardName + '｜奖励阶段：开卡奖励未完成（先别动）';
      sheet.getRange(row, 1).setValue(titleLine);
      sheet.getRange(row, 1, 1, 8).setFontWeight('bold').setWrap(false).setBackground(COLOR_WATCH_ROW);
      if (isFocus) sheet.getRange(row, 1, 1, 8).setBorder(true, true, true, true, true, true, '#000000', SpreadsheetApp.BorderStyle.SOLID_MEDIUM);
      row++;
      var bonusText = '这张卡当前仍处于「开卡奖励期」，优先完成奖励条件（否则可能错失一次性奖励）\n\n建议：先完成奖励 → 再进行结构优化判断\n\nEstimated Effort：15min（检查完成情况/计划消费）';
      sheet.getRange(row, 1).setValue(bonusText);
      sheet.getRange(row, 1, 3, 8).setWrap(true).setVerticalAlignment('top').setFontSize(12).setBackground(WHITE);
      row += 3;
    } else if (item.type === 'BLEEDING') {
      hasBleeding = true;
      var struct = item.structure;
      var lossAmt = Math.round(struct.annualFee - struct.estValue);
      var actionLabel = getBleedingSuggestionLabel(struct);
      var titleLine = COPY_ZH.bleedingTitle(struct.cardName, _fmtNum(lossAmt), actionLabel);
      sheet.getRange(row, 1).setValue(titleLine);
      sheet.getRange(row, 1, 1, 8).setFontWeight('bold').setWrap(false).setBackground(COLOR_BLEEDING_ROW);
      if (isFocus) sheet.getRange(row, 1, 1, 8).setBorder(true, true, true, true, true, true, '#000000', SpreadsheetApp.BorderStyle.SOLID_MEDIUM);
      row++;
      var tFee = struct.downgradeOption ? Math.round(struct.annualFee * 0.2) : 0;
      var tVal = struct.downgradeOption ? struct.estValue : 0;
      var tNet = tVal - tFee;
      var dDelta = tNet - struct.net;
      var tableStart = row;
      sheet.getRange(row, 1, 1, 4).setValues([['Plan', 'Annual Fees', 'Est. Value', 'Net Outcome']]);
      sheet.getRange(row, 1, 1, 4).setFontWeight('bold').setBackground(COLOR_TABLE_HEADER);
      row++;
      sheet.getRange(row, 1, 1, 4).setValues([['Do Nothing', '$' + _fmtNum(struct.annualFee), '$' + _fmtNum(struct.estValue), '$' + _fmtNum(struct.net)]]);
      sheet.getRange(row, 1, 1, 4).setBackground(WHITE);
      row++;
      sheet.getRange(row, 1, 1, 4).setValues([['Take Action', '$' + _fmtNum(tFee), '$' + _fmtNum(tVal), '$' + _fmtNum(tNet)]]);
      sheet.getRange(row, 1, 1, 4).setBackground(WHITE);
      sheet.getRange(tableStart, 1, 3, 4).setBorder(true, true, true, true, true, true, null, SpreadsheetApp.BorderStyle.SOLID);
      if (isFocus) sheet.getRange(tableStart, 1, 3, 4).setBorder(true, true, true, true, true, true, '#000000', SpreadsheetApp.BorderStyle.SOLID_MEDIUM);
      row++;
      var suggestionText = getBleedingSuggestionPara(struct);
      var para = '这张卡年费 $' + _fmtNum(struct.annualFee) + '，按当前支出估算一年仅产生约 $' + _fmtNum(struct.estValue) + ' 的积分价值，\n' +
        '预计净亏约 $' + _fmtNum(lossAmt) + '/年。\n\n' +
        '如果不处理，未来 12 个月将继续亏损。\n' +
        (struct.downgradeOption ? '若降级（保留账户历史），预计净结果可从 $' + _fmtNum(-lossAmt) + ' 提升至 $' + _fmtNum(tNet) + '（保守差额 $' + _fmtNum(dDelta) + '）。\n\n' : '若取消或替换，预计净结果可从 $' + _fmtNum(-lossAmt) + ' 改善至 $0（保守差额 $' + _fmtNum(lossAmt) + '）。\n\n') +
        suggestionText + '\n\n' +
        'Estimated Effort：30min\n' +
        '处理时点：建议在年费到期前 21 天完成。';
      sheet.getRange(row, 1).setValue(para);
      sheet.getRange(row, 1, 3, 8).setWrap(true).setVerticalAlignment('top').setFontSize(12).setBackground(WHITE);
      row += 3;
    } else if (item.type === 'MARKET_WINDOW') {
      continue;
    } else if (item.type === 'WATCH') {
      var struct = item.structure;
      var titleLine = COPY_ZH.watchTitle(struct.cardName);
      sheet.getRange(row, 1).setValue(titleLine);
      sheet.getRange(row, 1, 1, 8).setFontWeight('bold').setWrap(false).setBackground(COLOR_WATCH_ROW);
      row++;
      var watchText = '年度使用此卡不亏钱，但贡献偏小。\n' +
        '建议把更适合的支出放到高回报卡，此卡作为备用或低频使用。\n\n' +
        'Estimated Effort：15min';
      sheet.getRange(row, 1).setValue(watchText);
      sheet.getRange(row, 1, 3, 8).setWrap(true).setVerticalAlignment('top').setFontSize(12).setBackground(WHITE);
      row += 3;
    } else if (item.type === 'EFFICIENT') {
      var struct = item.structure;
      var titleLine = COPY_ZH.efficientTitle(struct.cardName, _fmtNum(Math.round(struct.net)));
      sheet.getRange(row, 1).setValue(titleLine);
      sheet.getRange(row, 1, 1, 8).setFontWeight('bold').setWrap(false).setBackground(WHITE);
      row++;
      var effText = '这卡目前很划算，当前结构下预计年净收益约 $' + _fmtNum(Math.round(struct.net)) + '，建议继续保留。月度复查即可。';
      sheet.getRange(row, 1).setValue(effText);
      sheet.getRange(row, 1, 1, 8).setWrap(true).setVerticalAlignment('top').setBackground(WHITE).setFontSize(11).setFontColor(COLOR_GRAY_TEXT);
      row += 2;
    }
    row++;
  }

  var hasAnyMarketCandidates = (decisionPlan.items || []).some(function(it) { return it.type === 'MARKET_WINDOW'; });
  if (hasAnyMarketCandidates) {
    sheet.getRange(row, 1).setValue('当前暂无高确定性新增卡建议。');
    sheet.getRange(row, 1, 1, 8).setWrap(false).setBackground(WHITE).setFontSize(12);
    row++;
  }

  var closeParts = ['总结：\n\n'];
  if (ps.currentNet >= 0) {
    closeParts.push('目前整体结构是赚钱的，');
  } else {
    closeParts.push('目前整体结构存在亏损，');
  }
  if (hasPreBonus) {
    closeParts.push('存在开卡奖励未完成的卡（先别动），');
  }
  if (hasBleeding) {
    closeParts.push('存在持续消耗年费却未产生对应价值的卡（必须止血）。');
  } else {
    closeParts.push('当前无需紧急调整。');
  }
  if (hasBleeding) {
    closeParts.push('\n\n只要优先处理该卡，整体收益将明显提升。');
  }
  closeParts.push('\n\n其余卡当前无需调整。系统将按月复查，只有当结构开始亏损或出现明显机会时才提醒您。');
  var closeText = closeParts.join('');
  sheet.getRange(row, 1).setValue(closeText);
  sheet.getRange(row, 1, 3, 8).setWrap(true).setVerticalAlignment('top').setFontSize(12).setBackground(WHITE);
  row += 4;

  var promoLines = buildFirstPromoLines_(topPromos || [], activePromoCount || 0);
  for (var p = 0; p < promoLines.length; p++) {
    sheet.getRange(row, 1).setValue(promoLines[p]);
    sheet.getRange(row, 1, 1, 8).setWrap(true).setVerticalAlignment('top').setBackground(WHITE).setFontSize(p === 0 ? 12 : 11).setFontWeight(p === 0 ? 'bold' : 'normal');
    row++;
  }
}

var MONTHLY_EVENT_PRIORITY = { Bleeding: 1, PreBonus: 2, FeeDue: 3, DataStale: 4, DataAnomaly: 5 };

function _parseEventJson(str) {
  if (!str || String(str).trim() === '') return {};
  try {
    return JSON.parse(str);
  } catch (e) {
    return {};
  }
}

function _daysUntilFeeDue(feeDueMonthStr) {
  if (!feeDueMonthStr || String(feeDueMonthStr).trim() === '') return null;
  var parts = String(feeDueMonthStr).trim().split('-');
  if (parts.length < 2) return null;
  var y = parseInt(parts[0], 10);
  var m = parseInt(parts[1], 10);
  if (isNaN(y) || isNaN(m)) return null;
  var feeDue = new Date(y, m - 1, 1);
  var now = new Date();
  return Math.ceil((feeDue.getTime() - now.getTime()) / 86400000);
}

function _downgradeOptionFromCatalog(catalogMap, cardName) {
  var rec = findCatalogRecord(catalogMap, cardName);
  if (!rec || rec['Downgrade Option'] == null) return false;
  var v = rec['Downgrade Option'];
  if (v === true) return true;
  var s = String(v).trim().toUpperCase();
  return s === 'TRUE' || s === 'YES' || s === 'Y';
}

function _shortSummaryPhrases(top5) {
  var set = {};
  for (var i = 0; i < top5.length; i++) {
    var t = normalizeEventType_(top5[i].event_type);
    if (t === 'Bleeding') set.bleeding = true;
    else if (t === 'PreBonus') set.prebonus = true;
    else if (t === 'FeeDue') set.feedue = true;
    else if (t === 'DataStale') set.datastale = true;
    else if (t === 'DataAnomaly') set.anomaly = true;
  }
  var parts = [];
  if (set.bleeding) parts.push('有卡在亏钱');
  if (set.prebonus) parts.push('有卡奖励还没拿到');
  if (set.feedue) parts.push('有卡年费快扣款');
  if (set.datastale) parts.push('本月未确认数据');
  if (set.anomaly) parts.push('本月数据变化较大');
  return parts.slice(0, 3).join(' + ');
}

/**
 * Monthly v1.1: render 4-block structure (template wording only). No logic changes.
 */
function renderMonthlyV1(reportMonth, eventsForMonth, currentMetrics, catalogMap, topPromos) {
  var displayTypes = ['Bleeding', 'PreBonus', 'FeeDue', 'DataStale', 'DataAnomaly'];
  var filtered = (eventsForMonth || []).filter(function(e) {
    var et = normalizeEventType_(e.event_type);
    if (displayTypes.indexOf(et) < 0) return false;
    if (et === 'Bleeding') {
      var data = _parseEventJson(e.current_value_json);
      var net = data.net != null ? parseFloat(data.net) : (data.annual_fee != null && data.est_value != null ? parseFloat(data.annual_fee) - parseFloat(data.est_value) : 0);
      return Math.abs(net) >= DECISION_CONFIG.BLEEDING_MIN_LOSS;
    }
    return true;
  });
  filtered.sort(function(a, b) {
    var pa = MONTHLY_EVENT_PRIORITY[normalizeEventType_(a.event_type)] || 99;
    var pb = MONTHLY_EVENT_PRIORITY[normalizeEventType_(b.event_type)] || 99;
    return pa - pb;
  });
  var top5 = filtered.slice(0, 5);
  var conclusion = top5.length === 0
    ? '本月没有发现需要处理的卡片，当前用卡结构运行正常。'
    : '本月有 ' + top5.length + ' 件事要处理：' + _shortSummaryPhrases(top5) + '。';
  var itemLines = [];
  for (var idx = 0; idx < top5.length; idx++) {
    var e = top5[idx];
    var i = idx + 1;
    var name = e.card_name || e.card_id || '';
    var title = '';
    var status = '';
    var action = '';
    var eventType = normalizeEventType_(e.event_type);
    if (eventType === 'Bleeding') {
      var data = _parseEventJson(e.current_value_json);
      var loss = 0;
      if (data.net != null) loss = Math.abs(parseFloat(data.net));
      else if (data.annual_fee != null && data.est_value != null) loss = Math.abs(parseFloat(data.annual_fee) - parseFloat(data.est_value));
      title = name + ' — 这张卡在亏钱';
      var roundedLoss = Math.round(loss);
      status = roundedLoss > 0 ? ('按当前用法估算，一年大约白亏 $' + _fmtNum(roundedLoss) + '（扣完年费后）。') : 'Potential upside';
      action = _downgradeOptionFromCatalog(catalogMap, name)
        ? '建议优先联系银行做降级/转换为低年费版本；不行再考虑取消或替换。'
        : '建议在年费扣款前取消或替换此卡。';
    } else if (eventType === 'PreBonus') {
      title = name + ' — 奖励还没确认拿到';
      status = '这张卡仍在奖励获取阶段，您尚未确认已完成奖励条件。';
      action = '建议优先完成达标消费；完成后把 Card Assets 里 Bonus Collected 改为 Yes。';
    } else if (eventType === 'FeeDue') {
      var data = _parseEventJson(e.current_value_json);
      var days = data.days_until != null ? parseInt(data.days_until, 10) : _daysUntilFeeDue(data.fee_due_month);
      if (days == null || isNaN(days)) days = 30;
      title = name + ' — 年费即将扣款';
      status = '年费预计在约 ' + days + ' 天后扣除。';
      action = '建议提前评估是否继续保留；若不留请在扣款前处理降级/取消。';
    } else if (eventType === 'DataStale') {
      title = name + ' — 本月未确认数据';
      status = '本报告基于上月数据推算。';
      action = '请花 1 分钟点击「本月数据无变化/确认」按钮。';
    } else if (eventType === 'DataAnomaly') {
      title = name + ' — 本月数据变化较大';
      status = '检测到年费或消费区间变动较大。';
      action = '建议先确认输入是否准确。';
    } else {
      title = name + ' — ' + (eventType || '');
      status = '';
      action = '';
    }
    itemLines.push(i + ') ' + title);
    itemLines.push('现状：' + status);
    itemLines.push('建议：' + action);
  }
  var itemsBlock = itemLines.length === 0 ? '（无）' : itemLines.join('\n');
  var currentNet = currentMetrics && currentMetrics.currentNet != null ? currentMetrics.currentNet : 0;
  var blockC = '不算开卡奖励这种一次性收益，仅按日常刷卡回报计算，您现在这套用卡结构一年大约能净赚 $' + _fmtNum(Math.round(currentNet)) + '（扣除全部年费后）。';
  var promoLine = buildMonthlyPromoLine_(topPromos || []);
  var blockD = '我们会每月自动复查。只有当出现：亏钱卡、奖励未完成、年费将扣款、或结构明显变差，才会提醒您。';
  var rows = [
    [conclusion],
    [''],
    ['本月需要您注意的事项'],
    [itemsBlock],
    [''],
    ['组合整体情况'],
    [blockC],
    ['']
  ];
  if (promoLine) {
    rows.push([promoLine]);
    rows.push(['']);
  }
  rows.push([blockD]);
  return rows;
}

function ensureMonthlyReportSheet(ss) {
  var sheet = _getSheetByName(ss, SHEET_MONTHLY_REPORT);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_MONTHLY_REPORT);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

/**
 * Runs on "Generate Monthly Health Report" menu. Writes the customer-facing
 * 4-block text (A/B/C/D) to a dedicated "Monthly Health Report" tab. For future email use.
 */
function runMonthlyReport(ss) {
  var now = new Date();
  const reportMonth = getReportMonth_(new Date());
  Logger.log(
    '[ENV] DATA_ENV=%s assets=%s catalog=%s promo=%s',
    String((DECISION_CONFIG && DECISION_CONFIG.DATA_ENV) || ''),
    getSheetName_(SHEET_ASSETS),
    getSheetName_(SHEET_CATALOG),
    getSheetName_(SHEET_PROMO_CATALOG)
  );
  _logEnvLock_('runMonthlyReport');
  var anchorNow = reportMonthToAnchorDate_(reportMonth);
  if (DECISION_CONFIG.TIME_ANCHOR_DEBUG) {
    Logger.log('[TimeAnchor] now=%s override=%s report_month=%s',
      new Date(),
      DECISION_CONFIG.REPORT_MONTH_OVERRIDE,
      reportMonth
    );
  }
  if ((typeof DECISION_CONFIG !== 'undefined' && DECISION_CONFIG && (DECISION_CONFIG.DATA_DEBUG || DECISION_CONFIG.PROMO_DEBUG))) {
    var env = String((DECISION_CONFIG && DECISION_CONFIG.DATA_ENV) || 'PROD').toUpperCase();
    Logger.log('[DataEnv] DATA_ENV=' + env);
    Logger.log('[DataEnv] assetsSheet=' + getSheetName_(SHEET_ASSETS));
    Logger.log('[DataEnv] catalogSheet=' + getSheetName_(SHEET_CATALOG));
    Logger.log('[DataEnv] promoSheet=' + getSheetName_(SHEET_PROMO_CATALOG));
  }
  var cards = getActiveCards(ss);
  var catalogMap = getCatalogMap(ss);
  var catalogAll = getCatalogAll(ss);
  var cardsNormalized = normalizeCards_(cards, catalogMap);
  var structureResults = runStructureEngine(cardsNormalized);
  var promoCatalog = getPromoCatalog(ss);
  var bonusLifecycleRows = deriveBonusLifecycleForPortfolio_(cardsNormalized, promoCatalog, anchorNow, DECISION_CONFIG);
  var lifecycleResults = runLifecycleEngine(cardsNormalized, bonusLifecycleRows, reportMonth);
  var marketSignals = runMarketEngine(cardsNormalized, catalogAll, promoCatalog, reportMonth);
  var currentMonth = reportMonth;
  var snapshots = generateSnapshots(cards, cardsNormalized, structureResults, lifecycleResults, currentMonth);
  var prevSnapshots = loadPreviousSnapshotsArray(ss, currentMonth);
  var events = generateEvents(ss, snapshots, prevSnapshots, marketSignals, catalogMap, currentMonth);
  writeSnapshots(ss, currentMonth, snapshots);
  writeMonthlyEvents(ss, currentMonth, events);
  var portfolioSummary = computePortfolioSummary(structureResults);
  var currentMetrics = {
    currentNet: portfolioSummary.currentNet != null ? portfolioSummary.currentNet : 0,
    currentFees: portfolioSummary.currentFees != null ? portfolioSummary.currentFees : 0,
    currentValue: portfolioSummary.currentValue != null ? portfolioSummary.currentValue : 0
  };
  var monthlyOutlook = {
    net: currentMetrics.currentNet,
    fees: currentMetrics.currentFees,
    value: currentMetrics.currentValue
  };
  var oneTimeBonusAtRisk = computeOneTimeBonusAtRisk_(bonusLifecycleRows);
  var missedBonusValue = computeMissedBonusValue_(bonusLifecycleRows);
  var totalPotentialThisYear = computeTotalPotentialThisYear_(currentMetrics.currentNet, oneTimeBonusAtRisk);
  var activePromos = filterActivePromos_(promoCatalog, anchorNow);
  var topPromos = selectTopPromos_(activePromos, DECISION_CONFIG.PROMO_CAP || 3);
  var monthlyItems = _buildMonthlyModelItems_(events, catalogMap);
  monthlyItems = _dedupeMonthlyItems_(currentMonth, monthlyItems);
  if ((!monthlyItems || monthlyItems.length === 0) && monthlyOutlook && typeof monthlyOutlook.net === 'number' && monthlyOutlook.net < 0) {
    monthlyItems = monthlyItems || [];
    monthlyItems.push({
      type: 'PortfolioLoss',
      severity: 'High',
      title: 'Portfolio is losing money',
      body: 'Your recurring annual net return is negative. Review fees vs. value and consider cancelling or replacing the loss-making card(s).',
      impactUsd: Math.abs(monthlyOutlook.net),
      meta: { net: monthlyOutlook.net, fees: monthlyOutlook.fees, value: monthlyOutlook.value }
    });
  }
  var stableNoIssues = monthlyItems.length === 0 && monthlyOutlook.net >= 0;
  var monthlyHeadline = stableNoIssues
    ? 'Everything looks stable this month.'
    : (monthlyOutlook.net < 0 ? 'Portfolio is losing money' : 'This month, ' + monthlyItems.length + ' items require attention.');
  var monthlyBody = stableNoIssues
    ? 'Monitoring stays low-noise. You will only be notified on meaningful changes.'
    : (monthlyOutlook.net < 0
      ? 'Your recurring annual net return is negative. Review fees vs. value and consider cancelling or replacing the loss-making card(s).'
      : '');
  var summaryLine = stableNoIssues
    ? 'This month: no issues detected; your setup looks stable.'
    : (monthlyOutlook.net < 0
      ? 'This month: portfolio is losing money and needs attention.'
      : _buildMonthlySummaryLineFromItems_(monthlyItems, cards.length));
  var portfolioLine = 'Portfolio (recurring only): estimated annual net is $' + _fmtNum(Math.round(currentMetrics.currentNet || 0)) + ' after fees.';
  var footer = 'Weekly promotions are informational. The system reviews monthly and alerts only on meaningful changes.';

  if (_isDevMode_()) {
    var lines = renderMonthlyV1(currentMonth, events, currentMetrics, catalogMap, topPromos);
    var monthlySheet = ensureMonthlyReportSheet(ss);
    monthlySheet.clear();
    monthlySheet.getRange(1, 1).setValue('Monthly Health 每月安心').setFontWeight('bold').setFontSize(12).setBackground(COLOR_MONTHLY_TITLE);
    var data = padRowsToCols(lines, 8);
    if (data.length > 0) {
      monthlySheet.getRange(2, 1, data.length, 8).setValues(data);
      monthlySheet.getRange(2, 1, data.length, 8).setWrap(true).setVerticalAlignment('top');
    }
  }
  return {
    reportDate: Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyy-MM-dd'),
    reportMonth: currentMonth,
    summaryLine: summaryLine,
    headline: monthlyHeadline,
    body: monthlyBody,
    topItems: '',
    portfolioLine: portfolioLine,
    promoBlock: '',
    footer: footer,
    topPromos: topPromos,
    promotions: topPromos.map(function(p) {
      return {
        cardName: p.card_name || '',
        promo_headline: p.promo_headline || '',
        bonus_value_est_usd: p.bonus_value_est_usd,
        promo_end_date: p.promo_end_date || null,
        affiliate_url: p.affiliate_url || ''
      };
    }),
    activeCardCount: cards.length,
    items: monthlyItems,
    monthlyOutlook: monthlyOutlook,
    portfolioSummary: {
      currentNet: currentMetrics.currentNet,
      currentFees: currentMetrics.currentFees,
      currentValue: currentMetrics.currentValue,
      optimizedNet: portfolioSummary.optimizedNet != null ? portfolioSummary.optimizedNet : currentMetrics.currentNet,
      delta: portfolioSummary.delta != null ? portfolioSummary.delta : 0,
      oneTimeBonusAtRisk: oneTimeBonusAtRisk,
      missedBonusValue: missedBonusValue,
      totalPotentialThisYear: totalPotentialThisYear
    },
    recurringNet: currentMetrics.currentNet,
    oneTimeBonusAtRisk: oneTimeBonusAtRisk,
    missedBonusValue: missedBonusValue,
    totalPotentialThisYear: totalPotentialThisYear,
    currentFees: currentMetrics.currentFees,
    currentValue: currentMetrics.currentValue,
    bonusLifecycleRows: bonusLifecycleRows,
    structureResults: structureResults,
    lifecycleResults: lifecycleResults,
    cardsNormalized: cardsNormalized,
    snapshots: snapshots,
    generatedAt: now
  };
}

function applyMonthlyRegionFormat(reportSheet) {
  reportSheet.getRange(MONTHLY_START_ROW, 1, 1, 8).setFontWeight('bold').setFontSize(12).setBackground(COLOR_MONTHLY_TITLE);
  reportSheet.getRange(MONTHLY_START_ROW, 1, ALERTS_HEADER_ROW - MONTHLY_START_ROW, 8).setBorder(true, true, true, true, true, true, null, SpreadsheetApp.BorderStyle.SOLID_MEDIUM);
  reportSheet.getRange(MONTHLY_START_ROW + 1, 1, 15, 8).setWrap(true).setVerticalAlignment('top');
}

function runAlertsReport(ss) {
  runAlertsCheck(ss);
}

function runAlertsCheck(ss) {
  var cards = getActiveCards(ss);
  var catalogMap = getCatalogMap(ss);
  var alertsRows = computeAlertsRows(cards, catalogMap);
  var reportSheet = _getSheetByName(ss, SHEET_REPORTS);
  if (!reportSheet) throw new Error('Sheet "' + String(SHEET_REPORTS || 'Debug') + '" not found');
  reportSheet.getRange(ALERTS_HEADER_ROW, 1, 1, 8).clearContent();
  reportSheet.getRange(ALERTS_HEADER_ROW, 1).setValue('C) Alerts Table 底部提醒表');
  writeAlertsTable(reportSheet, alertsRows);
  applyAlertsRegionFormat(reportSheet, alertsRows.length);
}

function writeAlertsTable(reportSheet, alertsRows) {
  reportSheet.getRange(ALERTS_DATA_START_ROW, 1, 1, 8).setValues([ALERTS_HEADER]);
  reportSheet.getRange(ALERTS_DATA_START_ROW + 1, 1, 50, 8).clearContent().clearFormat();
  if (alertsRows.length === 0) {
    reportSheet.getRange(ALERTS_HEADER_ROW, 1, 2, 8).setBorder(true, true, true, true, true, true, null, SpreadsheetApp.BorderStyle.SOLID_MEDIUM);
    reportSheet.getRange(ALERTS_HEADER_ROW, 1, 1, 8).setFontWeight('bold').setFontSize(12).setBackground(COLOR_ALERTS_TITLE);
    reportSheet.getRange(ALERTS_DATA_START_ROW, 1, 1, 8).setFontWeight('bold');
    return;
  }
  var data = alertsRows.map(function(r) {
    return [r.level, r.type || 'Bleeding', r.cardName, r.issue || 'Fee exceeds reward', Math.round(r.netLoss), r.action || 'Consider downgrade', r.effort !== undefined ? r.effort : 2, ''];
  });
  reportSheet.getRange(ALERTS_DATA_START_ROW + 1, 1, data.length, 8).setValues(data);
  for (var i = 0; i < alertsRows.length; i++) {
    var rowRange = reportSheet.getRange(ALERTS_DATA_START_ROW + 1 + i, 1, 1, 8);
    var level = alertsRows[i].level;
    if (level === 'RED') rowRange.setBackground(COLOR_RED);
    else if (level === 'DARK_ORANGE') rowRange.setBackground(COLOR_DARK_ORANGE);
    else rowRange.setBackground(COLOR_ORANGE);
  }
}

function applyAlertsRegionFormat(reportSheet, dataRowCount) {
  reportSheet.getRange(ALERTS_HEADER_ROW, 1, 1, 8).setFontWeight('bold').setFontSize(12).setBackground(COLOR_ALERTS_TITLE);
  var endRow = dataRowCount > 0 ? ALERTS_DATA_START_ROW + dataRowCount : ALERTS_DATA_START_ROW + 1;
  var alertNumRows = endRow - ALERTS_HEADER_ROW + 1;
  reportSheet.getRange(ALERTS_HEADER_ROW, 1, alertNumRows, 8).setBorder(true, true, true, true, true, true, null, SpreadsheetApp.BorderStyle.SOLID_MEDIUM);
  reportSheet.getRange(ALERTS_DATA_START_ROW, 1, 1, 8).setFontWeight('bold').setBorder(true, true, true, true, true, true, null, SpreadsheetApp.BorderStyle.SOLID);
}

function padRowsToCols(rows, cols) {
  var out = [];
  for (var i = 0; i < rows.length; i++) {
    var row = rows[i];
    var r = [];
    for (var c = 0; c < cols; c++) r.push(row[c] != null ? row[c] : '');
    out.push(r);
  }
  return out;
}
