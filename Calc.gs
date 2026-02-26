/**
 * @file Calc.gs
 * Spend range -> value, annualRewardValue, netLoss, alertsRows, stub text for FIRST/MONTHLY.
 */

var SPEND_MAP = {
  '<$10k': 5000,
  '$10k–$30k': 10000,
  '$30k–$60k': 30000,
  '$60k–$100k': 60000,
  '$100k+': 100000
};

var SPEND_HEADER = 'Current Annual Spend (Range)';
var FEE_HEADER = 'Annual Fee (USD)';
var BASE_RETURN_HEADER = 'Base Return (Conservative)';
var TYPICAL_BONUS_HEADER = 'Typical Bonus Value (USD)';
var DOWNGRADE_HEADER = 'Downgrade Option';
var DEFAULT_BASE_RETURN = 0.01;

var SPEND_HEADER_ALIASES = ['Current Annual Spend (Range)', 'Current annual spend (Range)', 'Spend Range', 'Annual Spend', 'Spend'];

function _fmtNum(x) {
  var n = Math.round(Number(x));
  if (isNaN(n)) return '0';
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function _parseNum(val) {
  if (val === null || val === undefined || val === '') return NaN;
  if (typeof val === 'number' && !isNaN(val)) return val;
  var s = String(val).trim().replace(/^[$%\s]+|\s*%$/g, '');
  var n = parseFloat(s);
  return isNaN(n) ? NaN : n;
}

function spendRangeToValue(rangeStr) {
  if (rangeStr == null || rangeStr === '') return 0;
  var s = String(rangeStr).trim();
  return SPEND_MAP[s] != null ? SPEND_MAP[s] : 0;
}

function _getSpendRange(card) {
  for (var i = 0; i < SPEND_HEADER_ALIASES.length; i++) {
    var v = card[SPEND_HEADER_ALIASES[i]];
    if (v != null && v !== '') return v;
  }
  return card[SPEND_HEADER];
}

/**
 * For each card: spendValue, baseReturn (from catalog or 0.01), annualRewardValue, annualFee, netLoss.
 * @return {Array.<Object>} with Card Name, netLoss, Level (ORANGE/DARK_ORANGE/RED), and other fields for alerts.
 */
function computeAlertsRows(cards, catalogMap) {
  var rows = [];
  for (var i = 0; i < cards.length; i++) {
    var card = cards[i];
    var cardName = card['Card Name'] != null ? String(card['Card Name']).trim() : '';
    var spendRange = _getSpendRange(card);
    var spendValue = spendRangeToValue(spendRange);
    var rec = findCatalogRecord(catalogMap, cardName);
    var br = _parseNum(rec && rec[BASE_RETURN_HEADER]);
    var baseReturn = isNaN(br) ? DEFAULT_BASE_RETURN : (br > 1 ? br / 100 : br);
    var annualRewardValue = spendValue * baseReturn;
    var annualFee = 0;
    if (rec && rec[FEE_HEADER] != null && rec[FEE_HEADER] !== '') {
      var af = _parseNum(rec[FEE_HEADER]);
      if (!isNaN(af)) annualFee = af;
    }
    var netLoss = annualFee - annualRewardValue;
    if (netLoss <= 0) continue;
    var level = 'ORANGE';
    if (netLoss > 300) level = 'RED';
    else if (netLoss > DECISION_CONFIG.BLEEDING_MIN_LOSS) level = 'DARK_ORANGE';
    var dOpt = rec && rec[DOWNGRADE_HEADER];
    var canDowngrade = false;
    if (dOpt != null) {
      var dOptStr = String(dOpt).trim().toUpperCase();
      canDowngrade = dOpt === true || dOptStr === 'TRUE' || dOptStr === 'YES' || dOptStr === 'Y';
    }
    rows.push({
      cardName: cardName,
      netLoss: netLoss,
      level: level,
      annualFee: annualFee,
      annualRewardValue: annualRewardValue,
      spendValue: spendValue,
      type: 'Bleeding',
      issue: 'Fee exceeds reward',
      action: canDowngrade ? 'Consider downgrade' : 'Evaluate keep or close',
      effort: 2
    });
  }
  return rows;
}

/**
 * @return {Object} summary with current/optimized fees, rewards, net, delta, top issue, downgradeSuggested.
 */
function computeFirstStubSummary(cards, catalogMap) {
  var alerts = computeAlertsRows(cards, catalogMap);
  var totalAnnualFees = 0;
  var totalRewardValue = 0;
  for (var i = 0; i < cards.length; i++) {
    var card = cards[i];
    var cardName = card['Card Name'] != null ? String(card['Card Name']).trim() : '';
    var spendRange = _getSpendRange(card);
    var spendValue = spendRangeToValue(spendRange);
    var rec = findCatalogRecord(catalogMap, cardName);
    var br = _parseNum(rec && rec[BASE_RETURN_HEADER]);
    var baseReturn = isNaN(br) ? DEFAULT_BASE_RETURN : (br > 1 ? br / 100 : br);
    var annualRewardValue = spendValue * baseReturn;
    var annualFee = 0;
    if (rec && rec[FEE_HEADER] != null && rec[FEE_HEADER] !== '') {
      var af = _parseNum(rec[FEE_HEADER]);
      if (!isNaN(af)) annualFee = af;
    }
    totalAnnualFees += annualFee;
    totalRewardValue += annualRewardValue;
  }
  var currentNet = totalRewardValue - totalAnnualFees;
  var bleedingCount = alerts.length;
  var topIssueName = '';
  var topIssueLoss = 0;
  var topIssueAnnualFee = null;
  var topIssueRewardValue = null;
  var topIssueTypicalBonus = 0;
  var downgradeSuggested = false;
  if (alerts.length > 0) {
    alerts.sort(function(a, b) { return b.netLoss - a.netLoss; });
    topIssueName = alerts[0].cardName;
    topIssueLoss = alerts[0].netLoss;
    topIssueAnnualFee = alerts[0].annualFee;
    topIssueRewardValue = alerts[0].annualRewardValue;
    var topRec = findCatalogRecord(catalogMap, topIssueName);
    if (topRec && topRec[TYPICAL_BONUS_HEADER] != null && topRec[TYPICAL_BONUS_HEADER] !== '') {
      var tb = _parseNum(topRec[TYPICAL_BONUS_HEADER]);
      if (!isNaN(tb)) topIssueTypicalBonus = tb;
    }
    var dOpt = topRec && topRec[DOWNGRADE_HEADER];
    downgradeSuggested = false;
    if (dOpt != null) {
      var dOptStr = String(dOpt).trim().toUpperCase();
      downgradeSuggested = dOpt === true || dOptStr === 'TRUE' || dOptStr === 'YES' || dOptStr === 'Y';
    }
  }
  var optimizedFee = totalAnnualFees - (topIssueAnnualFee != null ? topIssueAnnualFee * 0.8 : 0);
  var optimizedReward = totalRewardValue + topIssueTypicalBonus;
  var optimizedNet = optimizedReward - optimizedFee;
  var delta = optimizedNet - currentNet;
  return {
    totalNetBenefit12Mo: currentNet,
    totalAnnualFees: totalAnnualFees,
    totalRewardValue: totalRewardValue,
    optimizedFee: optimizedFee,
    optimizedReward: optimizedReward,
    optimizedNet: optimizedNet,
    delta: delta,
    bleedingCount: bleedingCount,
    topIssueName: topIssueName,
    topIssueLoss: topIssueLoss,
    topIssueAnnualFee: topIssueAnnualFee,
    topIssueRewardValue: topIssueRewardValue,
    topIssueTypicalBonus: topIssueTypicalBonus,
    downgradeSuggested: downgradeSuggested
  };
}

/**
 * Sort perCard for report: Bleeding (loss desc) then Watch (net asc) then Efficient (net desc).
 * @return {Array.<Object>} new array, not mutating input.
 */
function sortCardsForReport_(perCard) {
  if (!perCard || perCard.length === 0) return [];
  var bleeding = perCard.filter(function(c) { return c.stage === 'Bleeding'; })
    .sort(function(a, b) { return (b.annualFee - b.estValue) - (a.annualFee - a.estValue); });
  var watch = perCard.filter(function(c) { return c.stage === 'Watch'; })
    .sort(function(a, b) { return (a.estValue - a.annualFee) - (b.estValue - b.annualFee); });
  var efficient = perCard.filter(function(c) { return c.stage === 'Efficient'; })
    .sort(function(a, b) { return (b.estValue - b.annualFee) - (a.estValue - a.annualFee); });
  return bleeding.concat(watch).concat(efficient);
}

/**
 * Full payload for First Wake-up: portfolioSummary, topCardDetail, topDelta, perCard[], recommendationLevel.
 */
function computeFirstWakeupPayload(cards, catalogMap) {
  var sum = computeFirstStubSummary(cards, catalogMap);
  var perCard = [];
  for (var i = 0; i < cards.length; i++) {
    var card = cards[i];
    var cardName = card['Card Name'] != null ? String(card['Card Name']).trim() : '';
    var spendRange = _getSpendRange(card);
    var spendValue = spendRangeToValue(spendRange);
    var rec = findCatalogRecord(catalogMap, cardName);
    var br = _parseNum(rec && rec[BASE_RETURN_HEADER]);
    var baseReturn = isNaN(br) ? DEFAULT_BASE_RETURN : (br > 1 ? br / 100 : br);
    var estValue = spendValue * baseReturn;
    var annualFee = 0;
    if (rec && rec[FEE_HEADER] != null && rec[FEE_HEADER] !== '') {
      var af = _parseNum(rec[FEE_HEADER]);
      if (!isNaN(af)) annualFee = af;
    }
    var net = estValue - annualFee;
    var stage = net < 0 ? 'Bleeding' : (net < DECISION_CONFIG.BLEEDING_MIN_LOSS ? 'Watch' : 'Efficient');
    var dOpt = rec && rec[DOWNGRADE_HEADER];
    var downgrade = false;
    if (dOpt != null) {
      var dOptStr = String(dOpt).trim().toUpperCase();
      downgrade = dOpt === true || dOptStr === 'TRUE' || dOptStr === 'YES' || dOptStr === 'Y';
    }
    var loss = stage === 'Bleeding' ? annualFee - estValue : 0;
    var effortMinutes = stage === 'Bleeding' ? 30 : (stage === 'Watch' ? 15 : 5);
    var actionHint = '';
    if (stage === 'Bleeding') actionHint = downgrade ? 'Downgrade 优先' : '取消/替换';
    else if (stage === 'Watch') actionHint = '调整刷卡角色/分配支出';
    else actionHint = '保留（角色匹配）';
    var suggestedAction = '';
    var why = '';
    if (stage === 'Bleeding') {
      suggestedAction = downgrade ? 'Downgrade (prefer)' : 'Cancel/Replace';
      why = 'Fee > value by ~$' + _fmtNum(Math.round(annualFee - estValue)) + '/yr';
    } else if (stage === 'Watch') {
      suggestedAction = 'Reassign Spend';
      why = 'Net small; monitor';
    } else {
      suggestedAction = 'Keep';
      why = 'Net positive; role fit';
    }
    perCard.push({
      cardName: cardName,
      annualFee: annualFee,
      estValue: estValue,
      net: net,
      loss: loss,
      stage: stage,
      suggestedAction: suggestedAction,
      why: why,
      downgrade: downgrade,
      downgradeOption: downgrade,
      effortMinutes: effortMinutes,
      actionHint: actionHint
    });
  }
  var topCardFee = sum.topIssueAnnualFee != null ? sum.topIssueAnnualFee : 0;
  var topCardEstValue = sum.topIssueRewardValue != null ? sum.topIssueRewardValue : 0;
  var topCardNet = topCardEstValue - topCardFee;
  var takeActionFee = Math.round(topCardFee * 0.2);
  var takeActionNet = topCardEstValue - takeActionFee;
  var topDelta = takeActionNet - topCardNet;
  var recLevel = sum.delta < DECISION_CONFIG.REALIZABLE_DELTA_MIN ? 'No Action' : (sum.delta >= 500 ? 'Strong Recommend' : 'Recommend');
  return {
    portfolioSummary: {
      currentFees: sum.totalAnnualFees,
      currentValue: sum.totalRewardValue,
      currentNet: sum.totalNetBenefit12Mo,
      optimizedNet: sum.optimizedNet,
      delta: sum.delta
    },
    topCardDetail: {
      topCardFee: topCardFee,
      topCardEstValue: topCardEstValue,
      topCardNet: topCardNet,
      topLoss: sum.topIssueLoss,
      takeActionFee: takeActionFee,
      takeActionNet: takeActionNet,
      topDelta: topDelta
    },
    perCard: perCard,
    recommendationLevel: recLevel,
    topIssueName: sum.topIssueName,
    downgradeSuggested: sum.downgradeSuggested
  };
}

/**
 * @return {Array.<Array>} 6 rows for A7:H12 (FIRST report): 3 impact lines, conclusion, cost line.
 */
function buildFirstReportLines(cards, catalogMap) {
  var sum = computeFirstStubSummary(cards, catalogMap);
  var line1 = '当前12个月净收益：$' + _fmtNum(sum.totalNetBenefit12Mo);
  var line2 = '调整后12个月净收益：$' + _fmtNum(sum.optimizedNet);
  var line3 = '差额（可实现）：$' + _fmtNum(sum.delta);
  var conclusion = '';
  if (sum.delta < DECISION_CONFIG.REALIZABLE_DELTA_MIN) {
    conclusion = '结论：不建议行动。差额未达可操作阈值，维持现状更稳妥。';
  } else if (sum.delta >= 500) {
    conclusion = '结论：强烈建议行动。优化空间明显，优先处理止血卡可显著提升净收益。';
  } else {
    conclusion = '结论：建议行动。有可实现的收益空间，建议按下方 Top Issue 执行。';
  }
  var line4 = conclusion;
  var line5 = '操作成本低：预计时间<60分钟，信用风险低，可保留历史额度。';
  return [
    [line1],
    [line2],
    [line3],
    [line4],
    [line5],
    []
  ];
}

/**
 * @return {Array.<Array>} 5 rows for A25:H29 (MONTHLY): reassuring tone, action YES/NO.
 */
function buildMonthlyReportLines(alertsRows) {
  var hasRed = alertsRows.some(function(r) { return r.level === 'RED'; });
  var hasAlert = alertsRows.length > 0;
  var line1 = hasAlert
    ? '本月是否需要行动：是。出现阈值以上差额或止血项，请查看下方 Alerts 表获取具体动作。'
    : '本月是否需要行动：否。';
  var line2 = hasAlert
    ? '您未在「睡觉亏钱」——本报告已识别可优化项，按 Alerts 执行即可。'
    : '您没有在睡觉亏钱。当前卡组合健康，无需本月动作。';
  var line3 = hasAlert ? '详细动作见底部 Alerts 表，优先处理 RED 级别。' : '';
  return [
    [line1],
    [line2],
    [line3],
    [],
    []
  ];
}
