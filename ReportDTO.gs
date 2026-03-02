/**
 * @file ReportDTO.gs
 * ReportDTO v1 builders for FIRST / MONTHLY.
 */

function _dtoToNum_(v, fallback) {
  var d = fallback == null ? 0 : Number(fallback);
  if (isNaN(d)) d = 0;
  if (v == null || v === '') return d;
  var n = Number(v);
  return isNaN(n) ? d : n;
}

function _dtoIso_(v) {
  var d = v instanceof Date ? v : new Date(v || new Date());
  if (isNaN(d.getTime())) d = new Date();
  return d.toISOString();
}

function _dtoNormalizeIssueType_(t) {
  if (typeof normalizeEventType_ === 'function') return normalizeEventType_(t);
  var raw = String(t == null ? '' : t).trim();
  var lower = raw.toLowerCase();
  if (lower === 'annual_fee_due' || lower === 'feedue') return 'FeeDue';
  if (lower === 'bleeding') return 'Bleeding';
  if (lower === 'prebonus' || lower === 'bonus_not_collected') return 'PreBonus';
  if (lower === 'datastale') return 'DataStale';
  if (lower === 'dataanomaly') return 'DataAnomaly';
  if (lower === 'marketwindow') return 'MarketWindow';
  return raw || 'Action';
}

function _dtoFallbackActionByIssueType_(issueType) {
  var t = _dtoNormalizeIssueType_(issueType);
  if (t === 'Bleeding') return 'Cancel, downgrade, or replace before the next annual fee hits.';
  if (t === 'PreBonus') return 'Complete the required spend before the deadline to secure the bonus.';
  if (t === 'FeeDue') return 'Decide to keep or cancel before the fee posts.';
  if (t === 'DataStale') return 'Confirm your spend and fee data to ensure accuracy.';
  if (t === 'MarketWindow') return 'Review upgrade/downgrade options on your existing cards.';
  return 'Review this item and take the best next step.';
}

function _dtoPromo_(p) {
  var x = p || {};
  return {
    promo_id: x.promo_id != null ? String(x.promo_id) : (x.id != null ? String(x.id) : ''),
    promo_headline: x.promo_headline != null ? String(x.promo_headline) : (x.title != null ? String(x.title) : ''),
    bonus_value_est_usd: _dtoToNum_(x.bonus_value_est_usd, 0),
    promo_end_date: x.promo_end_date ? _dtoIso_(x.promo_end_date).slice(0, 10) : '',
    affiliate_url: x.affiliate_url != null ? String(x.affiliate_url) : (x.link != null ? String(x.link) : ''),
    card_name: x.card_name != null ? String(x.card_name) : (x.cardName != null ? String(x.cardName) : ''),
    issuer: x.issuer != null ? String(x.issuer) : '',
    recommendation_tier: x.recommendation_tier != null ? String(x.recommendation_tier) : ''
  };
}

function _dtoPromotionsWithTier_(promotions) {
  var list = (Array.isArray(promotions) ? promotions : []).map(_dtoPromo_);
  var idxNow = -1;
  var best = -1;
  for (var i = 0; i < list.length; i++) {
    var v = Number(list[i] && list[i].bonus_value_est_usd);
    if (!isNaN(v) && v > best) {
      best = v;
      idxNow = i;
    }
  }
  for (var j = 0; j < list.length; j++) {
    list[j].recommendation_tier = (j === idxNow && best > 0) ? 'Now' : 'Watchlist';
  }
  return list;
}

function _dtoActionFromItem_(item, idx, defaultIssueType) {
  var it = item || {};
  var issueType = _dtoNormalizeIssueType_(String(
    it.issue_type != null ? it.issue_type :
    (it.issueType != null ? it.issueType :
    (it.type != null ? it.type : (defaultIssueType || 'other')))
  ));
  var impact = _dtoToNum_(
    it.impact_usd != null ? it.impact_usd :
    (it.impactUsd != null ? it.impactUsd :
    (it.amount != null ? Math.abs(Number(it.amount) || 0) : 0)),
    0
  );
  var actionRaw = String(it.action != null ? it.action : (it.todo != null ? it.todo : ''));
  var action = (!actionRaw || /check report details/i.test(actionRaw)) ? _dtoFallbackActionByIssueType_(issueType) : actionRaw;
  return {
    card_name: String(it.card_name != null ? it.card_name : (it.cardName != null ? it.cardName : 'Action')),
    issue_type: issueType,
    title: String(
      it.title != null ? it.title :
      (it.issueTitle != null ? it.issueTitle :
      (it.headline != null ? it.headline : 'Review needed'))
    ),
    status: String(it.status != null ? it.status : (it.headline != null ? it.headline : 'Review needed.')),
    action: action,
    impact_usd: impact > 0 ? impact : null,
    priority: _dtoToNum_(it.priority, idx + 1)
  };
}

function _dtoSanitizeActions_(actions) {
  var list = Array.isArray(actions) ? actions : [];
  for (var i = 0; i < list.length; i++) {
    var a = list[i] || {};
    a.issue_type = _dtoNormalizeIssueType_(a.issue_type);
    if (!a.action || /check report details/i.test(String(a.action))) a.action = _dtoFallbackActionByIssueType_(a.issue_type);
    var imp = a.impact_usd == null ? NaN : Number(a.impact_usd);
    a.impact_usd = (!isNaN(imp) && imp > 0) ? imp : null;
    list[i] = a;
  }
  return list;
}

function _dtoBuildPortfolioCards_(model) {
  var out = [];
  var seen = {};
  var structure = (model && model.structureResults) || [];
  var lifecycle = (model && model.lifecycleResults) || [];
  var lifeMap = {};
  for (var i = 0; i < lifecycle.length; i++) {
    var lr = lifecycle[i] || {};
    if (!lr.cardName) continue;
    lifeMap[String(lr.cardName)] = lr;
  }
  for (var j = 0; j < structure.length; j++) {
    var s = structure[j] || {};
    var cardName = String(s.cardName || '').trim();
    if (!cardName) continue;
    var key = cardName.toLowerCase();
    if (seen[key]) continue;
    seen[key] = true;
    var l = lifeMap[cardName] || {};
    out.push({
      card_id: typeof getCardId === 'function' ? getCardId(cardName) : '',
      card_name: cardName,
      annual_fee: _dtoToNum_(s.annualFee, 0),
      est_value: _dtoToNum_(s.estValue != null ? s.estValue : s.recurring_value, 0),
      net: _dtoToNum_(s.net != null ? s.net : s.net_recurring, 0),
      status: '',
      lifecycle_stage: l.lifecycle ? String(l.lifecycle) : '',
      is_bleeding: String(s.stage || '').toLowerCase() === 'bleeding',
      is_prebonus: String(l.lifecycle || '').toLowerCase() === 'prebonus',
      fee_due_month: ''
    });
  }
  var snaps = (model && model.snapshots) || [];
  for (var k = 0; k < snaps.length; k++) {
    var sp = snaps[k] || {};
    var nm = String(sp.card_name || '').trim();
    if (!nm) continue;
    var k2 = nm.toLowerCase();
    if (seen[k2]) continue;
    seen[k2] = true;
    out.push({
      card_id: sp.card_id != null ? String(sp.card_id) : (typeof getCardId === 'function' ? getCardId(nm) : ''),
      card_name: nm,
      annual_fee: _dtoToNum_(sp.annual_fee, 0),
      est_value: _dtoToNum_(sp.est_value, 0),
      net: _dtoToNum_(sp.net, 0),
      status: sp.status != null ? String(sp.status) : '',
      lifecycle_stage: sp.lifecycle_stage != null ? String(sp.lifecycle_stage) : '',
      is_bleeding: !!sp.is_bleeding,
      is_prebonus: !!sp.is_prebonus,
      fee_due_month: sp.fee_due_month != null ? String(sp.fee_due_month) : ''
    });
  }
  return out;
}

function _dtoIsActiveCard_(card) {
  var c = card || {};
  var status = String(c.status || '').toLowerCase();
  var lifecycle = String(c.lifecycle_stage || '').toLowerCase();
  if (!status && !lifecycle) return true;
  if (/closed|cancel|inactive/.test(status) || /closed|cancel|inactive/.test(lifecycle)) return false;
  return true;
}

function _dtoSumPositiveField_(list, keys) {
  var arr = Array.isArray(list) ? list : [];
  var sum = 0;
  for (var i = 0; i < arr.length; i++) {
    var row = arr[i] || {};
    for (var k = 0; k < keys.length; k++) {
      var key = keys[k];
      if (row[key] == null) continue;
      var v = Number(row[key]);
      if (!isNaN(v) && v > 0) sum += v;
      break;
    }
  }
  return sum;
}

function buildFirstScenarioComparison_(model, dto) {
  var d = dto || {};
  var cards = (d.portfolio && Array.isArray(d.portfolio.cards)) ? d.portfolio.cards : [];
  var activeCards = cards.filter(_dtoIsActiveCard_);
  var annual_fee_do = activeCards.reduce(function(s, c) { return s + _dtoToNum_(c.annual_fee, 0); }, 0);
  var spend_rewards_do = activeCards.reduce(function(s, c) { return s + _dtoToNum_(c.est_value, 0); }, 0);

  var bonusRows = (model && Array.isArray(model.bonusLifecycleRows)) ? model.bonusLifecycleRows : [];
  var inProgressBonus = bonusRows.reduce(function(s, r) {
    var eligible = !!(r && r.eligible);
    var inProgress = String(r && r.bonus_status || '') === 'InProgress';
    var v = Number(r && r.bonus_value);
    if (eligible && inProgress && !isNaN(v) && v > 0) return s + v;
    return s;
  }, 0);
  var unlock_bonus_do = inProgressBonus > 0 ? inProgressBonus : null;
  var net_12m_do = spend_rewards_do + (unlock_bonus_do || 0) - annual_fee_do;

  var rawActions = (model && (model.items || model.actions || model.focusItems || model.priorityActions)) || [];
  var recurring_uplift = _dtoSumPositiveField_(rawActions, ['recurring_delta_usd', 'recurringDeltaUsd']);
  var fee_delta = _dtoSumPositiveField_(rawActions, ['fee_delta_usd', 'feeDeltaUsd']);
  var new_fee = _dtoSumPositiveField_(rawActions, ['new_fee_usd', 'newFeeUsd']);

  var annual_fee_act = annual_fee_do + new_fee - fee_delta;
  var recurring_net_do = spend_rewards_do - annual_fee_do;
  var recurring_net_act = recurring_net_do + recurring_uplift;
  var spend_rewards_act = recurring_net_act + annual_fee_act;

  var promos = (d.promotions && Array.isArray(d.promotions)) ? d.promotions : [];
  var recommendedOfferBonus = promos.reduce(function(s, p) {
    if (String(p && p.recommendation_tier || '') !== 'Now') return s;
    var v = Number(p && p.bonus_value_est_usd);
    return (!isNaN(v) && v > 0) ? s + v : s;
  }, 0);
  var unlockActRaw = (unlock_bonus_do || 0) + recommendedOfferBonus;
  var unlock_bonus_act = unlockActRaw > 0 ? unlockActRaw : null;
  var net_12m_act = spend_rewards_act + (unlock_bonus_act || 0) - annual_fee_act;

  return {
    do_nothing: {
      annual_fee: annual_fee_do,
      spend_rewards: spend_rewards_do,
      unlock_bonus: unlock_bonus_do,
      net_12m: net_12m_do
    },
    act: {
      annual_fee: annual_fee_act,
      spend_rewards: spend_rewards_act,
      unlock_bonus: unlock_bonus_act,
      net_12m: net_12m_act
    }
  };
}

function buildReportDTOFromFirstModel_(firstModel, options) {
  var model = firstModel || {};
  var opt = options || {};
  var key = model.keyNumbers || {};
  var recurringNet = _dtoToNum_(key.currentNet, 0);
  var recurringFees = _dtoToNum_(key.currentFees, 0);
  var recurringValue = _dtoToNum_(key.currentValue, 0);
  var optimizedNet = _dtoToNum_(key.optimizedNet, recurringNet);
  var focus = model.focusItems || model.items || model.priorityActions || [];
  var promotions = model.promotions || model.topPromos || [];
  var portfolioCards = _dtoBuildPortfolioCards_(model);

  var out = {
    client_name: String(opt.clientName || 'Lumina Logic LLC'),
    report_type: 'FIRST',
    tagline: 'Protecting your profits. Powering your business.',
    generated_at: _dtoIso_(model.reportDate || new Date()),
    kpis: {
      recurring_net: recurringNet,
      recurring_fees: recurringFees,
      recurring_value: recurringValue,
      optimized_net: optimizedNet,
      unlock: _dtoToNum_(key.delta, optimizedNet - recurringNet)
    },
    actions: _dtoSanitizeActions_((focus || []).map(function(it, idx) { return _dtoActionFromItem_(it, idx, 'FIRST_ITEM'); })),
    promotions: _dtoPromotionsWithTier_(promotions || []),
    portfolio: {
      cards: portfolioCards,
      totals: {
        annual_fees: recurringFees,
        value: recurringValue,
        net: recurringNet
      }
    }
  };
  out.scenario_comparison = buildFirstScenarioComparison_(model, out);
  return out;
}

function buildReportDTOFromMonthlyModel_(monthlyModel, options) {
  var model = monthlyModel || {};
  var opt = options || {};
  var outlook = model.monthlyOutlook || {};
  var ps = model.portfolioSummary || {};
  var recurringNet = _dtoToNum_(outlook.net, _dtoToNum_(ps.currentNet, 0));
  var recurringFees = _dtoToNum_(outlook.fees, _dtoToNum_(ps.currentFees, 0));
  var recurringValue = _dtoToNum_(outlook.value, _dtoToNum_(ps.currentValue, 0));
  var optimizedNet = _dtoToNum_(ps.optimizedNet, recurringNet);
  var actions = model.items || model.actions || model.focusItems || [];
  var promotions = model.promotions || model.topPromos || [];
  var portfolioCards = _dtoBuildPortfolioCards_(model);

  return {
    client_name: String(opt.clientName || 'Lumina Logic LLC'),
    report_type: 'MONTHLY',
    tagline: 'Protecting your profits. Powering your business.',
    generated_at: _dtoIso_(model.generatedAt || model.reportDate || new Date()),
    kpis: {
      recurring_net: recurringNet,
      recurring_fees: recurringFees,
      recurring_value: recurringValue,
      optimized_net: optimizedNet,
      unlock: _dtoToNum_(ps.delta, optimizedNet - recurringNet)
    },
    actions: _dtoSanitizeActions_((actions || []).map(function(it, idx) { return _dtoActionFromItem_(it, idx, 'MONTHLY_ITEM'); })),
    promotions: _dtoPromotionsWithTier_(promotions || []),
    portfolio: {
      cards: portfolioCards,
      totals: {
        annual_fees: recurringFees,
        value: recurringValue,
        net: recurringNet
      }
    }
  };
}
