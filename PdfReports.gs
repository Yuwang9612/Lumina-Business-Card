/**
 * @file PdfReports.gs
 * Configure these IDs before production use:
 * - TEMPLATE_DASHBOARD_DOC_ID
 * - TEMPLATE_MONTHLY_DOC_ID
 * - TEMPLATE_FIRST_DOC_ID
 * Optional:
 * - OUTPUT_FOLDER_ID (Drive folder for exported PDFs)
 */

var TEMPLATE_MONTHLY_DOC_ID = '1ePF92h107-Kl9EBQxyY6iR3diM1_VLFWu1bocsyFdMM';
var TEMPLATE_FIRST_DOC_ID = '1IEAthHEVQYVqmvscKeuvwNd2lVCH4M3QwJwmhfypCAo';
var TEMPLATE_DASHBOARD_DOC_ID = '';
var DASHBOARD_TEMPLATE_PATH = 'docs/25_templates/DASHBOARD_TEMPLATE.md';
var OUTPUT_FOLDER_ID = '';
var BRAND_LOGO_FILE_ID = '';
var BRAND_TAGLINE = 'Protecting your profits. Powering your business.';

function generateMonthlyPdf(ss, monthlyModel) {
  if (!monthlyModel) throw new Error('monthlyModel is required');
  ensureCompanyNameField_(ss);
  var templateId = resolveTemplateId_('monthly');
  var copyName = buildMonthlyFileName_(ss, monthlyModel).replace(/\.pdf$/i, '');
  var copyRes = createReportDocCopy_(templateId, copyName, ss, 'monthly');
  var docCopy = copyRes.file;
  var doc = copyRes.doc;
  var body = initDoc_(doc);
  renderMonthlyV33_(body, ss, monthlyModel);
  applyPromoLinks_(doc, monthlyModel.promotions || monthlyModel.topPromos || [], DECISION_CONFIG.PROMO_CAP || 3);
  doc.saveAndClose();

  var pdfFile = exportPdfFromCopy_(ss, docCopy, buildMonthlyFileName_(ss, monthlyModel));
  var pdfId = pdfFile.getId();
  var fileUrl = buildDriveFileViewUrl_(pdfFile);
  if (DECISION_CONFIG && DECISION_CONFIG.DEV_MODE) {
    var monthlySheet = _getSheetByName(ss, SHEET_MONTHLY_REPORT);
    if (monthlySheet) monthlySheet.getRange('H1').setValue('PDF: ' + fileUrl);
  }
  return { fileId: pdfId, fileUrl: fileUrl };
}

function generateFirstPdf(ss, firstModel) {
  if (!firstModel) throw new Error('firstModel is required');
  ensureCompanyNameField_(ss);
  var templateId = resolveTemplateId_('first');
  var copyName = buildFirstFileName_(ss, firstModel).replace(/\.pdf$/i, '');
  var copyRes = createReportDocCopy_(templateId, copyName, ss, 'first');
  var docCopy = copyRes.file;
  var doc = copyRes.doc;
  var body = initDoc_(doc);
  renderFirstV33_(body, ss, firstModel);
  applyPromoLinks_(doc, firstModel.promotions || firstModel.topPromos || [], DECISION_CONFIG.PROMO_CAP || 3);
  doc.saveAndClose();

  var pdfFile = exportPdfFromCopy_(ss, docCopy, buildFirstFileName_(ss, firstModel));
  var pdfId = pdfFile.getId();
  var fileUrl = buildDriveFileViewUrl_(pdfFile);
  if (DECISION_CONFIG && DECISION_CONFIG.DEV_MODE) {
    var reportSheet = _getSheetByName(ss, SHEET_REPORTS);
    if (reportSheet) reportSheet.getRange('H1').setValue('PDF: ' + fileUrl);
  }
  return { fileId: pdfId, fileUrl: fileUrl };
}

function resolveTemplateId_(type) {
  var key = type === 'first' ? 'TEMPLATE_FIRST_DOC_ID' : (type === 'dashboard' ? 'TEMPLATE_DASHBOARD_DOC_ID' : 'TEMPLATE_MONTHLY_DOC_ID');
  var propId = '';
  try {
    propId = String(PropertiesService.getScriptProperties().getProperty(key) || '').trim();
  } catch (e) {}
  var fallbackId = type === 'first'
    ? TEMPLATE_FIRST_DOC_ID
    : (type === 'dashboard' ? (TEMPLATE_DASHBOARD_DOC_ID || TEMPLATE_FIRST_DOC_ID) : TEMPLATE_MONTHLY_DOC_ID);
  var id = propId || fallbackId;
  if (!id || id.indexOf('REPLACE_WITH_') === 0) {
    throw new Error('Template ID not configured: ' + key);
  }
  return id;
}

function generateDashboardPdf(ss, dashboardDto) {
  if (!dashboardDto) throw new Error('dashboardDto is required');
  ensureCompanyNameField_(ss);
  var templateId = resolveTemplateId_('dashboard');
  var clientRaw = getClientName_(ss);
  var client = safeFileName_(clientRaw);
  var clientKey = String(clientRaw || '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'client';
  var ym = dashboardDto.report_cycle_ym || formatDate_(new Date(), 'yyyy-MM');
  var copyName = ('Dashboard_' + clientKey + '_' + ym).replace(/\.pdf$/i, '');
  var copyRes = createReportDocCopy_(templateId, copyName, ss, 'dashboard');
  var docCopy = copyRes.file;
  var doc = copyRes.doc;
  var body = initDoc_(doc);
  var d = dashboardDto.dashboard || {};
  var sc = dashboardDto.scenario_comparison || {};
  var cards = (dashboardDto.portfolio && dashboardDto.portfolio.cards) ? dashboardDto.portfolio.cards : [];
  var activeCards = cards.filter(function(c) {
    var s = String((c && c.status) || '').toLowerCase();
    return !(s.indexOf('closed') >= 0 || s.indexOf('inactive') >= 0 || s.indexOf('cancel') >= 0);
  });
  function _statusForCard_(c) {
    var s = String((c && c.status) || '').trim();
    if (s) return s;
    return Number(c && c.net) < 0 ? 'Bleeding' : 'OK';
  }
  function _isCardLevelAction_(a) {
    var x = a || {};
    var issue = String(x.issue_type || x.event_type || '').toLowerCase();
    var scope = String(x.scope || '').toLowerCase();
    var cardName = String(x.card_name || '').trim();
    if (!cardName) return false;
    if (issue === 'portfolioloss') return false;
    if (scope === 'portfolio') return false;
    return true;
  }
  function _fallbackBleedingCardActions_(cards) {
    var list = Array.isArray(cards) ? cards : [];
    var out = [];
    for (var idx = 0; idx < list.length; idx++) {
      var c = list[idx] || {};
      var status = String(c.status || '').toLowerCase();
      var isActive = !(status.indexOf('closed') >= 0 || status.indexOf('inactive') >= 0 || status.indexOf('cancel') >= 0);
      var isBleeding = status.indexOf('bleeding') >= 0 || Number(c.net) < 0;
      if (!isActive || !isBleeding) continue;
      var months = Number(
        c.active_streak_months != null ? c.active_streak_months :
        (c.pending_months != null ? c.pending_months :
        (c.underperform_months != null ? c.underperform_months :
        (c.months_pending != null ? c.months_pending : NaN)))
      );
      var timeContext = '';
      if (!isNaN(months) && months > 0) {
        timeContext = months > 1 ? ('Underperforming for ' + months + ' months') : 'Underperforming for 1 month';
      } else if (c.time_context) {
        timeContext = String(c.time_context);
      }
      out.push({
        fallback: true,
        card_name: c.card_name || 'Card',
        net: Number(c.net) || 0,
        time_context: timeContext
      });
    }
    return out;
  }
  appendHeader_(body, 'Dashboard Report', dashboardDto.client_name || getClientName_(ss), formatDate_(new Date(), 'yyyy-MM-dd'), 'DASHBOARD');
  body.appendParagraph('Template: ' + DASHBOARD_TEMPLATE_PATH);
  body.appendParagraph('Cycle: ' + ym);
  body.appendParagraph('');

  body.appendParagraph('Your Current Credit Card Setup (Next 12 Months)');
  if (!activeCards.length) {
    body.appendParagraph('No active cards found. Please check Card_Assets.');
  } else if (activeCards.length === 1) {
    var c = activeCards[0] || {};
    body.appendParagraph('Card: ' + (c.card_name || 'Card'));
    body.appendParagraph('Annual Fee: ' + formatUsd_(c.annual_fee));
    body.appendParagraph('Est. Value: ' + formatUsd_(c.est_value));
    body.appendParagraph('Net: ' + formatUsd_(c.net));
    body.appendParagraph('Status: ' + _statusForCard_(c));
    body.appendParagraph('Lifecycle: ' + (c.lifecycle_stage || '—'));
  } else {
    var t = (dashboardDto.portfolio && dashboardDto.portfolio.totals) || {};
    body.appendParagraph('Annual Fee: ' + formatUsd_(t.annual_fees));
    body.appendParagraph('Est. Value: ' + formatUsd_(t.value));
    body.appendParagraph('Net: ' + formatUsd_(t.net));
    body.appendParagraph('Status: ' + (Number(t.net) < 0 ? 'Bleeding' : 'OK'));
  }
  body.appendParagraph('This section reflects your current setup. One-time welcome bonuses are shown separately below.');
  body.appendParagraph('');

  body.appendParagraph('Do Nothing vs Act (Scenario Comparison Table)');
  body.appendParagraph('Scenario | Annual Fee (Recurring) | Spend Rewards (Recurring) | Unlock Bonus (One-Time) | 12-month Net (Total)');
  body.appendParagraph('Do nothing (keep current) | ' + formatUsdOrDash_(sc.do_nothing && sc.do_nothing.annual_fee) + ' | ' + formatUsdOrDash_(sc.do_nothing && sc.do_nothing.spend_rewards) + ' | ' + formatUsdOrDash_(sc.do_nothing && sc.do_nothing.unlock_bonus) + ' | ' + formatUsdOrDash_(sc.do_nothing && sc.do_nothing.net_12m));
  body.appendParagraph('If you act (after fixes) | ' + formatUsdOrDash_(sc.act && sc.act.annual_fee) + ' | ' + formatUsdOrDash_(sc.act && sc.act.spend_rewards) + ' | ' + formatUsdOrDash_(sc.act && sc.act.unlock_bonus) + ' | ' + formatUsdOrDash_(sc.act && sc.act.net_12m));
  body.appendParagraph('');

  body.appendParagraph('Cards Requiring Attention');
  var actions = (d.card_actions || dashboardDto.actions || []).filter(_isCardLevelAction_);
  if (!actions.length) actions = _fallbackBleedingCardActions_(activeCards);
  if (!actions.length) body.appendParagraph('All cards are performing as expected.');
  for (var i = 0; i < actions.length; i++) {
    var a = actions[i] || {};
    if (a.fallback) {
      body.appendParagraph((i + 1) + '. ' + (a.card_name || 'Card') + ' - Recurring net is negative');
      body.appendParagraph('Estimated recurring net: ' + formatUsd_(a.net) + '/year');
      body.appendParagraph('Status: Bleeding');
      if (a.time_context) body.appendParagraph(a.time_context);
      body.appendParagraph('Recommended action: Review this card\'s annual fee vs rewards; consider cancel/downgrade/replace if no offsetting value.');
    } else {
      body.appendParagraph((i + 1) + '. ' + (a.card_name || 'Card') + ' - ' + (a.title || 'Action'));
      body.appendParagraph('Action: ' + (a.action || 'Review this item and take the best next step.'));
      body.appendParagraph('Impact: ' + (a.impact_usd && Number(a.impact_usd) > 0 ? ('Saves about ' + formatUsd_(a.impact_usd) + ' per year') : 'Potential upside'));
    }
  }
  body.appendParagraph('');
  body.appendParagraph('Opportunity Windows');
  var promos = d.opportunity_windows || dashboardDto.promotions || [];
  if (!promos.length) body.appendParagraph('No high-value windows at this time.');
  for (var j = 0; j < promos.length; j++) {
    var p = promos[j] || {};
    body.appendParagraph((j + 1) + '. ' + (p.promo_headline || p.card_name || 'Promotion'));
  }
  body.appendParagraph('');

  body.appendParagraph('Strategy Snapshot');
  body.appendParagraph('Current recurring net (12 months): ' + formatUsd_(dashboardDto.kpis && dashboardDto.kpis.recurring_net));
  body.appendParagraph('Projected recurring net after actions: ' + formatUsd_(dashboardDto.kpis && dashboardDto.kpis.optimized_net));
  body.appendParagraph('Projected unlock: ' + formatUsd_(dashboardDto.kpis && dashboardDto.kpis.unlock));
  body.appendParagraph('');

  body.appendParagraph('Next Steps');
  var nextSteps = actions.slice(0, 2);
  if (!nextSteps.length) {
    body.appendParagraph('No action needed right now. Recheck in next cycle.');
  } else {
    for (var k = 0; k < nextSteps.length; k++) {
      body.appendParagraph((k + 1) + '. ' + (nextSteps[k].action || 'Review this item and take the best next step.') + ' (' + (nextSteps[k].card_name || 'Card') + ')');
    }
  }
  doc.saveAndClose();
  var pdfFile = exportPdfFromCopy_(ss, docCopy, 'Dashboard_' + clientKey + '_' + ym + '.pdf');
  return { fileId: pdfFile.getId(), fileUrl: buildDriveFileViewUrl_(pdfFile) };
}

function createReportDocCopy_(templateId, copyName, ss, type) {
  try {
    var f = DriveApp.getFileById(templateId).makeCopy(copyName);
    return { file: f, doc: DocumentApp.openById(f.getId()) };
  } catch (e) {
    var warnSheet = _getSheetByName(ss, SHEET_REPORTS || 'Debug');
    if (warnSheet) {
      warnSheet.getRange('B4').setValue(
        'WARNING: ' + (type || 'report') + ' template copy failed, fallback to blank doc. ' + (e.message || String(e))
      );
    }
    var d = DocumentApp.create(copyName);
    return { file: DriveApp.getFileById(d.getId()), doc: d };
  }
}

function exportPdfFromCopy_(ss, docCopy, pdfName) {
  var pdfBlob = docCopy.getAs('application/pdf').setName(pdfName);
  var pdfFile = DriveApp.createFile(pdfBlob);
  if (OUTPUT_FOLDER_ID) {
    try {
      var folder = DriveApp.getFolderById(OUTPUT_FOLDER_ID);
      folder.addFile(pdfFile);
      DriveApp.getRootFolder().removeFile(pdfFile);
    } catch (e) {
      var reportSheet = _getSheetByName(ss, SHEET_REPORTS);
      if (reportSheet) reportSheet.getRange('B4').setValue('WARNING: OUTPUT_FOLDER_ID unavailable, fallback to root. ' + (e.message || String(e)));
    }
  }
  try {
    // Best-effort: make link opening stable for external viewers.
    pdfFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  } catch (shareErr) {
    var shareWarnSheet = _getSheetByName(ss, SHEET_REPORTS || 'Debug');
    if (shareWarnSheet) {
      shareWarnSheet.getRange('B4').setValue('WARNING: PDF sharing setup failed. ' + (shareErr.message || String(shareErr)));
    }
  }
  return pdfFile;
}

function buildDriveFileViewUrl_(fileOrId) {
  var id = '';
  var resourceKey = '';
  if (fileOrId && typeof fileOrId.getId === 'function') {
    id = String(fileOrId.getId() || '').trim();
    try {
      resourceKey = String(fileOrId.getResourceKey ? (fileOrId.getResourceKey() || '') : '').trim();
    } catch (e) {
      resourceKey = '';
    }
  } else {
    id = String(fileOrId || '').trim();
  }
  if (!id) return '';
  var url = 'https://drive.google.com/file/d/' + id + '/view?usp=sharing';
  if (resourceKey) url += '&resourcekey=' + encodeURIComponent(resourceKey);
  return url;
}

function getClientName_(ss) {
  var profileSheet = _getSheetByName(ss, SHEET_PROFILE || 'Company_Profile');
  if (profileSheet) {
    var data = profileSheet.getDataRange().getValues();
    var keys = ['business_name', 'Company Name', 'Business Name', 'Client Name'];
    for (var i = 0; i < data.length; i++) {
      var k = data[i][0] != null ? String(data[i][0]).trim() : '';
      var v = data[i][1] != null ? String(data[i][1]).trim() : '';
      if (!k || !v) continue;
      for (var j = 0; j < keys.length; j++) {
        if (k.toLowerCase() === keys[j].toLowerCase()) return v;
      }
    }
  }
  return ss && ss.getName ? ss.getName() : 'Client';
}

function getCompanyName_(ss) {
  var profileSheet = _getSheetByName(ss, 'Company_Profile') || _getSheetByName(ss, 'Business Profile');
  if (profileSheet) {
    var lastRow = profileSheet.getLastRow();
    if (lastRow >= 2) {
      var data = profileSheet.getRange(2, 1, lastRow - 1, 2).getValues();
      for (var r = 0; r < data.length; r++) {
        var k = data[r][0] != null ? String(data[r][0]).trim().toLowerCase() : '';
        var v = data[r][1] != null ? String(data[r][1]).trim() : '';
        if (!k) continue;
        if (k === 'company name' || k === 'company_name' || k === 'business name' || k === 'client name') {
          if (v) return v;
        }
      }
    }
  }
  return ss && ss.getName ? ss.getName() : 'Client';
}

function ensureCompanyNameField_(ss) {
  var profileSheet = _getSheetByName(ss, 'Company_Profile') || _getSheetByName(ss, 'Business Profile');
  if (!profileSheet) return;
  var lastRow = profileSheet.getLastRow();
  if (lastRow < 1) {
    profileSheet.getRange(1, 1, 2, 3).setValues([
      ['Business Profile', 'Value of Your Business', 'Notes'],
      ['Company Name', '', '']
    ]);
    return;
  }
  var data = profileSheet.getRange(2, 1, Math.max(lastRow - 1, 1), 1).getValues();
  for (var r = 0; r < data.length; r++) {
    var k = data[r][0] != null ? String(data[r][0]).trim().toLowerCase() : '';
    if (k === 'company name') return;
  }
  profileSheet.getRange(lastRow + 1, 1, 1, 3).setValues([['Company Name', '', '']]);
}

function safeFileName_(s) {
  var x = s == null ? '' : String(s);
  x = x.replace(/[\/\\:\*\?"<>\|]/g, '').trim();
  return x || 'Client';
}

function formatDate_(dateVal, pattern) {
  var d = dateVal instanceof Date ? dateVal : new Date(dateVal || new Date());
  if (isNaN(d.getTime())) d = new Date();
  return Utilities.formatDate(d, Session.getScriptTimeZone(), pattern);
}

function buildMonthlyFileName_(ss, monthlyModel) {
  var client = safeFileName_(getClientName_(ss));
  var ym = monthlyModel && monthlyModel.reportMonth ? String(monthlyModel.reportMonth) : formatDate_(new Date(), 'yyyy-MM');
  if (!/^\d{4}-\d{2}$/.test(ym)) ym = formatDate_(new Date(), 'yyyy-MM');
  return 'Monthly_' + client + '_' + ym + '.pdf';
}

function buildFirstFileName_(ss, firstModel) {
  var client = safeFileName_(getClientName_(ss));
  var d = firstModel && firstModel.reportDate ? firstModel.reportDate : new Date();
  return 'FirstReport_' + client + '_' + formatDate_(d, 'yyyyMMdd') + '.pdf';
}

function formatUsd_(num) {
  var n = Number(num);
  if (isNaN(n)) n = 0;
  var abs = Math.round(Math.abs(n)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return n < 0 ? '-$' + abs : '$' + abs;
}

function formatUsdOrDash_(num) {
  if (num == null || num === '') return '—';
  var n = Number(num);
  if (isNaN(n)) return '—';
  return formatUsd_(n);
}

function formatUsdSigned_(num) {
  var n = Number(num);
  if (isNaN(n)) n = 0;
  var abs = Math.round(Math.abs(n)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return (n >= 0 ? '+$' : '-$') + abs;
}

function formatIsoDate_(dateOrString) {
  var d = dateOrString instanceof Date ? dateOrString : new Date(dateOrString);
  if (isNaN(d.getTime())) d = new Date();
  return Utilities.formatDate(d, Session.getScriptTimeZone(), 'yyyy-MM-dd');
}

function sanitizeOneLine_(s) {
  if (s == null) return '';
  return String(s).replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function ellipsize_(s, maxLen) {
  var t = sanitizeOneLine_(s);
  var m = maxLen || 140;
  if (t.length <= m) return t;
  return t.substring(0, m - 3).trim() + '...';
}

function mapIssueTypeToTitle_(issueType) {
  var t = _normalizeIssueTypeKey_(issueType);
  if (t === 'bleeding') return 'This card is losing money';
  if (t === 'prebonus') return 'Bonus not yet confirmed';
  if (t === 'feedue') return 'Annual renewal approaching';
  if (t === 'datastale') return 'Data not confirmed this month';
  if (t === 'dataanomaly') return 'Large change detected';
  return 'Item to review';
}

function _normalizeIssueTypeKey_(issueType) {
  var normalized = (typeof normalizeEventType_ === 'function') ? normalizeEventType_(issueType) : issueType;
  var t = String(normalized || '').toLowerCase();
  if (t === 'bonus_not_collected') return 'prebonus';
  if (t === 'feedue' || t === 'annual_fee_due') return 'feedue';
  if (t === 'feedue') return 'feedue';
  return t;
}

function mapIssueTypeToLevel_(issueType) {
  var t = _normalizeIssueTypeKey_(issueType);
  if (t === 'bleeding' || t === 'prebonus') return 'HIGH';
  if (t === 'feedue' || t === 'datastale' || t === 'dataanomaly') return 'MEDIUM';
  if (t === 'watch') return 'LOW';
  return 'LOW';
}

function priorityRank_(issueType) {
  var t = _normalizeIssueTypeKey_(issueType);
  if (t === 'bleeding') return 1;
  if (t === 'prebonus') return 2;
  if (t === 'feedue') return 3;
  if (t === 'datastale') return 4;
  if (t === 'dataanomaly') return 5;
  if (t === 'watch') return 6;
  return 99;
}

function isActionableImpactIssueType_(issueType) {
  var t = _normalizeIssueTypeKey_(issueType);
  return t === 'bleeding' || t === 'prebonus' || t === 'feedue' || t === 'dataanomaly' || t === 'datastale';
}

function shouldShowProjectedImpact_(issueType, impactUsd) {
  if (!isActionableImpactIssueType_(issueType)) return false;
  var n = Number(impactUsd);
  return !isNaN(n) && Math.abs(n) > 0;
}

function buildMonthlySummaryLine_(monthlyModel) {
  var items = monthlyModel && monthlyModel.items ? monthlyModel.items : [];
  var outlookNetRaw = monthlyModel && monthlyModel.monthlyOutlook && monthlyModel.monthlyOutlook.net != null
    ? monthlyModel.monthlyOutlook.net
    : (monthlyModel && monthlyModel.recurringNet != null ? monthlyModel.recurringNet : null);
  var outlookNet = outlookNetRaw == null ? NaN : Number(outlookNetRaw);
  var activeCardCountRaw = monthlyModel && monthlyModel.activeCardCount != null
    ? monthlyModel.activeCardCount
    : (monthlyModel && monthlyModel.activeCards && monthlyModel.activeCards.length != null ? monthlyModel.activeCards.length : 0);
  var activeCardCount = Number(activeCardCountRaw);
  var hasActiveCards = !isNaN(activeCardCount) && activeCardCount > 0;
  var itemsCountRaw = monthlyModel && monthlyModel.itemsCount != null ? monthlyModel.itemsCount : (items ? items.length : 0);
  var itemsCount = Number(itemsCountRaw);
  if (!hasActiveCards) {
    return 'No active business credit cards detected. To begin building a profitable structure, start with one core card aligned to your largest spend category.';
  }
  if (!isNaN(itemsCount) && itemsCount === 0) {
    if (!isNaN(outlookNet) && outlookNet < 0) return 'Portfolio is losing money';
    return 'Everything looks stable this month.';
  }
  if (!isNaN(outlookNet) && outlookNet < 0) return 'Portfolio is losing money';
  var counts = { bleeding: 0, prebonus: 0, feedue: 0, datastale: 0, dataanomaly: 0 };
  for (var i = 0; i < items.length; i++) {
    var t = String(items[i].issueType || '').toLowerCase();
    if (counts[t] != null) counts[t]++;
  }
  var parts = [];
  if (counts.bleeding > 0) parts.push((counts.bleeding === 1 ? 'one card is generating a net loss' : counts.bleeding + ' cards are generating net losses'));
  if (counts.prebonus > 0) parts.push((counts.prebonus === 1 ? 'one welcome bonus remains unconfirmed' : counts.prebonus + ' welcome bonuses remain unconfirmed'));
  if (counts.feedue > 0) parts.push((counts.feedue === 1 ? 'an annual renewal is approaching' : counts.feedue + ' annual renewals are approaching'));
  if (counts.datastale > 0) parts.push((counts.datastale === 1 ? 'this month\'s data is not yet confirmed' : counts.datastale + ' cards have unconfirmed data'));
  if (counts.dataanomaly > 0) parts.push((counts.dataanomaly === 1 ? 'a large input change was detected' : counts.dataanomaly + ' large input changes were detected'));
  return 'This month, ' + items.length + ' items require attention' + (parts.length ? ' — ' + parts.slice(0, 2).join(' and ') + '.' : '.');
}

function buildMonthlyItemsBlock_(monthlyModel) {
  var items = monthlyModel && monthlyModel.items ? monthlyModel.items.slice() : [];
  items.sort(function(a, b) {
    return priorityRank_(a.issueType || a.type) - priorityRank_(b.issueType || b.type);
  });
  items = items.slice(0, 5);
  if (!items.length) return [];
  var out = [];
  for (var i = 0; i < items.length; i++) {
    var it = items[i];
    if (String(it.type || '').toLowerCase() === 'portfolioloss') {
      out.push({
        index: i + 1,
        issueType: 'portfolioloss',
        title: sanitizeOneLine_(it.title || 'Portfolio is losing money'),
        status: sanitizeOneLine_(it.body || 'Your recurring annual net return is negative. Review fees vs. value and consider cancelling or replacing the loss-making card(s).'),
        action: 'Review fees vs. value and consider cancelling or replacing the loss-making card(s).',
        impactUsd: it.impactUsd,
        showImpact: shouldShowProjectedImpact_('bleeding', it.impactUsd),
        impactLabel: shouldShowProjectedImpact_('bleeding', it.impactUsd) ? 'Impact (12-mo): ' + formatUsd_(it.impactUsd) : ''
      });
      continue;
    }
    var issueType = String(it.issueType || '').toLowerCase();
    var status = sanitizeOneLine_(it.status || 'No additional status.');
    var action = sanitizeOneLine_(it.action || 'Review and take action.');
    if (issueType === 'bleeding') {
      var impact = it.impactUsd != null && !isNaN(Number(it.impactUsd)) ? Number(it.impactUsd) : 0;
      status = impact > 0 ? ('Projected annual net loss: ' + formatUsdSigned_(-Math.abs(impact)) + '.') : 'Potential upside';
      if (action.toLowerCase().indexOf('downgrade') >= 0 || action.toLowerCase().indexOf('product change') >= 0) {
        action = 'Review downgrade or product change options before the annual fee posts.';
      } else {
        action = 'Review downgrade or cancellation options before the annual fee posts.';
      }
    } else if (issueType === 'prebonus') {
      status = 'Welcome bonus in progress; completion not confirmed.';
      action = 'Complete the required spend threshold first; then revisit optimization.';
    }
    var showImpact = shouldShowProjectedImpact_(issueType, it.impactUsd);
    out.push({
      index: i + 1,
      issueType: issueType,
      title: sanitizeOneLine_(it.cardName || 'Card') + ' — ' + sanitizeOneLine_(it.issueTitle || mapIssueTypeToTitle_(it.issueType)),
      status: status,
      action: action,
      impactUsd: it.impactUsd,
      showImpact: showImpact,
      impactLabel: showImpact ? 'Impact (12-mo): ' + formatUsd_(it.impactUsd) : ''
    });
  }
  return out;
}

function buildPortfolioLine_(model) {
  var recurring = model && model.recurringNet != null ? Number(model.recurringNet) : NaN;
  if (!isNaN(recurring)) return 'Recurring portfolio performance: projected annual net return of ' + formatUsd_(recurring) + ' after annual fees.';
  var k = model && model.keyNumbers ? model.keyNumbers : null;
  if (k) {
    return 'Current net is ' + formatUsd_(k.currentNet || 0) + '; following the plan estimates net at ' + formatUsd_(k.optimizedNet || 0) + ' (delta ' + formatUsd_(k.delta || 0) + ').';
  }
  return sanitizeOneLine_(model && model.portfolioSummaryText ? model.portfolioSummaryText : 'Portfolio estimate is based on current inputs.');
}

function buildPromotionsBlock_(promos, cap) {
  var list = promos || [];
  if (!list.length) return [];
  var out = [];
  var n = Math.min(list.length, cap || 3);
  var rank = 0;
  for (var i = 0; i < n; i++) {
    var p = list[i] || {};
    var cardName = p.cardName || p.card_name || 'Card';
    var headline = ellipsize_(p.promo_headline || 'Offer details not provided.', 120);
    var bonus = Number(p.bonus_value_est_usd);
    var hasBonus = !isNaN(bonus) && bonus > 0;
    var hasEndRaw = p.promo_end_date != null && String(p.promo_end_date).trim() !== '';
    var endDate = hasEndRaw ? new Date(p.promo_end_date) : null;
    var hasValidEnd = endDate && !isNaN(endDate.getTime());
    if (!hasValidEnd && DECISION_CONFIG && DECISION_CONFIG.PROMO_REQUIRE_ENDDATE) continue;

    var details = [];
    if (hasBonus) details.push('Est ' + formatUsd_(bonus));
    if (hasValidEnd) details.push('valid until ' + formatIsoDate_(endDate));
    rank++;
    var line = rank + ') ' + sanitizeOneLine_(cardName) + ' — ' + headline;
    if (details.length) line += ' (' + details.join(', ') + ')';
    line += ' <<APPLY_LINK_' + rank + '>>';
    out.push({
      lineText: line,
      applyUrl: sanitizeOneLine_(p.affiliate_url || '')
    });
  }
  return out;
}

function buildNextActionsBlock_(actionCandidates, reportDate) {
  var out = ['Next Actions'];
  var acts = (actionCandidates || []).filter(function(a) { return !!sanitizeOneLine_(a); }).slice(0, 2);
  for (var i = 0; i < acts.length; i++) {
    var a = sanitizeOneLine_(acts[i]);
    if (/^cancel or replace/i.test(a)) {
      a = 'Review downgrade or cancellation options before the annual fee posts.';
    } else if (/complete required spend/i.test(a) || /complete the required spend/i.test(a)) {
      a = 'Complete the required spend threshold and confirm the welcome bonus posting.';
    }
    out.push((i + 1) + ') ' + a);
  }
  if (!acts.length) out.push('1) Review current items and execute the highest-impact action.');
  var d = new Date(reportDate);
  if (isNaN(d.getTime())) d = new Date();
  d.setDate(d.getDate() + 30);
  out.push('Next review: ' + formatIsoDate_(d));
  out.push('You will only be alerted on meaningful changes.');
  return out.join('\n');
}

function selectFirstNextActions_(focusItems) {
  var items = (focusItems || []).slice().sort(function(a, b) {
    return priorityRank_(a.issueType || a.type) - priorityRank_(b.issueType || b.type);
  });
  var primary = [];
  var bonus = [];
  for (var i = 0; i < items.length; i++) {
    var it = items[i] || {};
    var issue = String(it.issueType || it.type || '').toLowerCase();
    var title = sanitizeOneLine_(it.title || '');
    var card = title.split(' — ')[0] || sanitizeOneLine_(it.cardName || 'Card');
    if (issue === 'bleeding' || issue === 'feedue') {
      primary.push('Cancel/replace ' + displayCardName_(card) + ' before annual fee posts.');
    } else if (issue === 'prebonus') {
      bonus.push('Complete required spend and confirm bonus status.');
    } else {
      var a = sanitizeOneLine_(it.action || '');
      if (a) primary.push(a);
    }
  }
  var merged = primary.concat(bonus);
  var out = [];
  var seen = {};
  for (var j = 0; j < merged.length; j++) {
    var k = sanitizeOneLine_(merged[j]);
    if (!k) continue;
    if (seen[k]) continue;
    seen[k] = true;
    out.push(k);
    if (out.length >= 2) break;
  }
  if (!out.length) out.push('Review current items and execute the highest-impact action.');
  return out;
}

function buildFooter_() {
  return 'Weekly promotions are informational. The system reviews monthly and alerts only on meaningful changes.';
}

function buildFirstKeyNumbersText_(k) {
  return 'Current Net: ' + formatUsd_(k.currentNet || 0) + '\nOptimized Net: ' + formatUsd_(k.optimizedNet || 0) + '\nDelta (Realizable): ' + formatUsd_(k.delta || 0) + '\nCurrent Fees: ' + formatUsd_(k.currentFees || 0) + '\nCurrent Value: ' + formatUsd_(k.currentValue || 0);
}

function buildFirstFocusItemsText_(items) {
  if (!items || items.length === 0) return [];
  var sorted = items.slice().sort(function(a, b) {
    return priorityRank_(a.issueType || a.type) - priorityRank_(b.issueType || b.type);
  });
  var out = [];
  for (var i = 0; i < sorted.length && i < 5; i++) {
    var it = sorted[i];
    var card = sanitizeOneLine_(it.cardName || 'Card');
    var titleRaw = sanitizeOneLine_(it.title || mapIssueTypeToTitle_(it.type));
    var title = titleRaw.replace(new RegExp('^' + card.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*[-–—:]\\s*', 'i'), '');
    var issueType = String(it.issueType || it.type || '').toLowerCase();
    var status = sanitizeOneLine_(it.status || 'No additional status.');
    if (issueType === 'prebonus') {
      status = 'This card appears to be in the welcome bonus period, and completion has not yet been confirmed.';
    }
    var action = sanitizeOneLine_(it.action || 'Review details and execute.');
    if (issueType === 'prebonus' || action.toLowerCase().indexOf('complete bonus requirements first') >= 0) {
      action = 'Complete the required spend threshold first; then revisit optimization.';
    }
    var showImpact = shouldShowProjectedImpact_(issueType, it.impactUsd);
    out.push({
      index: i + 1,
      issueType: issueType,
      title: card + ' — ' + title,
      status: status,
      action: action,
      impactUsd: it.impactUsd,
      showImpact: showImpact,
      impactLabel: showImpact ? 'Impact (12-mo): ' + formatUsd_(it.impactUsd) : ''
    });
  }
  return out;
}

var REPORT_V3_STYLE = {
  FONT_FAMILY: 'Arial',
  COLOR_TEXT: '#111111',
  COLOR_MUTED: '#6B7280',
  COLOR_BORDER: '#E5E7EB',
  COLOR_CARD_BG: '#F6F8FB',
  COLOR_PAGE_BG: '#FFFFFF',
  H1: 18,
  H2: 13,
  BODY: 11,
  SMALL: 9,
  BIG: 28,
  MID: 16,
  GAP_SECTION: 16,
  GAP_CARD: 10
};

function initDoc_(doc) {
  var body = doc.getBody();
  body.clear();
  try {
    if (doc.setMarginTop) doc.setMarginTop(36).setMarginBottom(36).setMarginLeft(36).setMarginRight(36);
  } catch (e) {}
  body.editAsText().setFontFamily(REPORT_V3_STYLE.FONT_FAMILY).setFontSize(REPORT_V3_STYLE.BODY).setForegroundColor(REPORT_V3_STYLE.COLOR_TEXT);
  return body;
}

function applyTextStyle_(target, style) {
  if (!target || !style) return target;
  if (style.fontFamily) target.setFontFamily(style.fontFamily);
  if (style.fontSize != null) target.setFontSize(style.fontSize);
  if (style.bold != null) target.setBold(style.bold);
  if (style.color) target.setForegroundColor(style.color);
  return target;
}

function setParagraphSpacing_(para, before, after, lineSpacing) {
  if (!para) return para;
  if (before != null) para.setSpacingBefore(before);
  if (after != null) para.setSpacingAfter(after);
  if (lineSpacing != null) para.setLineSpacing(lineSpacing);
  return para;
}

function addSpacer_(body, pxEquivalent) {
  var p = body.appendParagraph(' ');
  setParagraphSpacing_(p, 0, pxEquivalent == null ? REPORT_V3_STYLE.GAP_SECTION : pxEquivalent, 1.15);
  return p;
}

function addDivider_(body) {
  var t = body.appendTable([[' ']]);
  try {
    t.setBorderColor(REPORT_V3_STYLE.COLOR_BORDER);
    t.setBorderWidth(1);
  } catch (e) {}
  var p = t.getCell(0, 0).getChild(0).asParagraph();
  p.setText(' ');
  setParagraphSpacing_(p, 0, 0, 1.15);
  return t;
}

function addH1_(body, text) {
  var p = body.appendParagraph(sanitizeOneLine_(text));
  applyTextStyle_(p, { fontFamily: REPORT_V3_STYLE.FONT_FAMILY, fontSize: REPORT_V3_STYLE.H1, bold: true, color: REPORT_V3_STYLE.COLOR_TEXT });
  setParagraphSpacing_(p, 0, 4, 1.15);
  return p;
}

function addMetaLine_(body, leftText, rightText) {
  var t = body.insertTable(body.getNumChildren(), [[sanitizeOneLine_(leftText || ''), sanitizeOneLine_(rightText || '')]]);
  try { t.setBorderWidth(0); } catch (e) {}
  var l = t.getCell(0, 0).getChild(0).asParagraph();
  var r = t.getCell(0, 1).getChild(0).asParagraph();
  r.setAlignment(DocumentApp.HorizontalAlignment.RIGHT);
  applyTextStyle_(l, { fontFamily: REPORT_V3_STYLE.FONT_FAMILY, fontSize: REPORT_V3_STYLE.SMALL, bold: false, color: REPORT_V3_STYLE.COLOR_MUTED });
  applyTextStyle_(r, { fontFamily: REPORT_V3_STYLE.FONT_FAMILY, fontSize: REPORT_V3_STYLE.SMALL, bold: false, color: REPORT_V3_STYLE.COLOR_MUTED });
  return t;
}

function addSectionTitle_(body, text) {
  var p = body.appendParagraph(sanitizeOneLine_(text));
  applyTextStyle_(p, { fontFamily: REPORT_V3_STYLE.FONT_FAMILY, fontSize: REPORT_V3_STYLE.H2, bold: true, color: REPORT_V3_STYLE.COLOR_TEXT });
  setParagraphSpacing_(p, 10, 6, 1.15);
  return p;
}

function addCenteredTitle_(body, titleText) {
  var p = body.appendParagraph(sanitizeOneLine_(titleText || ''));
  p.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  applyTextStyle_(p, { fontFamily: REPORT_V3_STYLE.FONT_FAMILY, fontSize: REPORT_V3_STYLE.H1, bold: true, color: REPORT_V3_STYLE.COLOR_TEXT });
  setParagraphSpacing_(p, 0, 2, 1.15);
  return p;
}

function addCenteredSubtitle_(body, subtitleText) {
  var p = body.appendParagraph(sanitizeOneLine_(subtitleText || ''));
  p.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  applyTextStyle_(p, { fontFamily: REPORT_V3_STYLE.FONT_FAMILY, fontSize: REPORT_V3_STYLE.SMALL, bold: false, color: REPORT_V3_STYLE.COLOR_MUTED });
  setParagraphSpacing_(p, 0, 6, 1.15);
  return p;
}

function insertBrandHeader_(body, opts) {
  var companyName = sanitizeOneLine_(opts && opts.companyName ? opts.companyName : 'Client');
  var t = body.appendTable([[' ', ' ']]);
  try { t.setBorderWidth(0); } catch (e) {}
  var leftCell = t.getCell(0, 0);
  var rightCell = t.getCell(0, 1);

  var leftP = leftCell.getChild(0).asParagraph();
  leftP.setText(' ');
  try {
    if (BRAND_LOGO_FILE_ID) {
      var blob = DriveApp.getFileById(BRAND_LOGO_FILE_ID).getBlob();
      var img = leftP.appendInlineImage(blob);
      try { img.setWidth(70); } catch (e2) {}
    }
  } catch (e3) {
    leftP.setText(' ');
  }

  var nameP = rightCell.getChild(0).asParagraph();
  nameP.setText(companyName);
  nameP.setAlignment(DocumentApp.HorizontalAlignment.RIGHT);
  applyTextStyle_(nameP, { fontFamily: REPORT_V3_STYLE.FONT_FAMILY, fontSize: REPORT_V3_STYLE.H2, bold: true, color: REPORT_V3_STYLE.COLOR_TEXT });
  var tagP = rightCell.appendParagraph(BRAND_TAGLINE);
  tagP.setAlignment(DocumentApp.HorizontalAlignment.RIGHT);
  applyTextStyle_(tagP, { fontFamily: REPORT_V3_STYLE.FONT_FAMILY, fontSize: 9, bold: false, color: REPORT_V3_STYLE.COLOR_MUTED });
  var tagTxt = tagP.editAsText();
  if (tagTxt.getText().length > 0) tagTxt.setItalic(0, tagTxt.getText().length - 1, true);
}

function appendExecutiveExplanation_(body, mode) {
  var text = mode === 'first'
    ? "These figures reflect recurring value (points/benefits) minus annual fees, excluding one-time welcome bonuses. 'Optimized Net' shows the estimated outcome if you follow the priority actions below."
    : "Snapshot reflects recurring value minus annual fees (excluding one-time bonuses). This report highlights only material risks and time-sensitive actions.";
  var p = body.appendParagraph(text);
  applyTextStyle_(p, { fontFamily: REPORT_V3_STYLE.FONT_FAMILY, fontSize: 9, bold: false, color: REPORT_V3_STYLE.COLOR_MUTED });
  setParagraphSpacing_(p, 4, 0, 1.15);
  var oneTime = body.appendParagraph('Welcome bonuses are one-time gains. If earned, they will not recur next year and are excluded from structural net calculations.');
  applyTextStyle_(oneTime, { fontFamily: REPORT_V3_STYLE.FONT_FAMILY, fontSize: 9, bold: false, color: REPORT_V3_STYLE.COLOR_MUTED });
  setParagraphSpacing_(oneTime, 2, 0, 1.15);
}

function renderTagPill_(paragraph, tagText) {
  var tag = sanitizeOneLine_(tagText || 'MEDIUM').toUpperCase();
  var colorMap = {
    HIGH: { fg: '#B91C1C', bg: '#FEE2E2' },
    MEDIUM: { fg: '#B45309', bg: '#FEF3C7' },
    LOW: { fg: '#1D4ED8', bg: '#DBEAFE' },
    OK: { fg: '#166534', bg: '#DCFCE7' }
  };
  var c = colorMap[tag] || colorMap.MEDIUM;
  paragraph.setText(tag);
  paragraph.setAlignment(DocumentApp.HorizontalAlignment.RIGHT);
  applyTextStyle_(paragraph, { fontFamily: REPORT_V3_STYLE.FONT_FAMILY, fontSize: REPORT_V3_STYLE.SMALL, bold: true, color: c.fg });
  var t = paragraph.editAsText();
  if (t.getText().length > 0) t.setBackgroundColor(0, t.getText().length - 1, c.bg);
}

function addCard_(body, buildFn) {
  var t = body.appendTable([[' ']]);
  try {
    t.setBorderColor(REPORT_V3_STYLE.COLOR_BORDER);
    t.setBorderWidth(1);
  } catch (e) {}
  var cell = t.getCell(0, 0);
  cell.setBackgroundColor(REPORT_V3_STYLE.COLOR_CARD_BG);
  var p = cell.getChild(0).asParagraph();
  p.setText(' ');
  if (buildFn) buildFn(cell);
  return t;
}

function appendLinkText_(paragraphOrCell, labelText, url) {
  if (!url) return null;
  var label = sanitizeOneLine_(labelText || 'Apply Link');
  var p = paragraphOrCell.appendParagraph(label);
  applyTextStyle_(p, { fontFamily: REPORT_V3_STYLE.FONT_FAMILY, fontSize: REPORT_V3_STYLE.BODY, bold: false, color: REPORT_V3_STYLE.COLOR_TEXT });
  var txt = p.editAsText();
  if (label.length > 0) txt.setLinkUrl(0, label.length - 1, url);
  return p;
}

function applyPromoLinks_(doc, promos, cap) {
  if (!doc) return;
  var body = doc.getBody();
  var list = promos || [];
  var n = Math.min(list.length, cap || 3);
  for (var i = 1; i <= n; i++) {
    var token = '<<APPLY_LINK_' + i + '>>';
    var url = list[i - 1] && list[i - 1].affiliate_url ? String(list[i - 1].affiliate_url).trim() : '';
    var range = body.findText(token);
    while (range) {
      var txt = range.getElement().asText();
      var start = range.getStartOffset();
      var end = range.getEndOffsetInclusive();
      txt.deleteText(start, end);
      txt.insertText(start, 'Apply Link');
      if (url) txt.setLinkUrl(start, start + 'Apply Link'.length - 1, url);
      range = body.findText(token);
    }
  }
}

function normalizeDocParagraphs_(body) {
  var ps = body.getParagraphs();
  for (var i = 0; i < ps.length; i++) setParagraphSpacing_(ps[i], 0, 4, 1.15);
}

function renderFirstV3_(body, ss, firstModel) {
  return renderFirstV33_(body, ss, firstModel);
}

function renderMonthlyV3_(body, ss, monthlyModel) {
  return renderMonthlyV33_(body, ss, monthlyModel);
}

function renderFirstV33_(body, ss, firstModel) {
  var reportDate = formatIsoDate_(firstModel.reportDate || new Date());
  var companyName = getCompanyName_(ss);
  var activeCards = getActiveCards(ss) || [];
  var catalogAll = getCatalogAll(ss) || [];
  var focusItems = buildFirstFocusItemsText_(firstModel.focusItems || []);
  var promos = buildPromotionsBlock_(firstModel.topPromos || [], DECISION_CONFIG.PROMO_CAP || 3);
  var actionCandidates = selectFirstNextActions_(firstModel.focusItems || []);
  var recs = pickRecommendedCardsFromCatalog_(activeCards, catalogAll);
  var noIssueLike = !focusItems.length || focusItems.every(function(it) {
    var tag = inferSeverityTag_(it);
    return tag === 'LOW' || tag === 'OK';
  });

  if (!activeCards.length) {
    renderOnboardingFirst_(body, ss, reportDate, companyName, recs, promos);
    normalizeDocParagraphs_(body);
    return;
  }

  appendHeader_(body, 'First Wake-up Report (Action Plan)', companyName, reportDate, 'INITIAL REVIEW');
  appendDashboardFirst_(body, firstModel.keyNumbers || {});
  addSpacer_(body, REPORT_V3_STYLE.GAP_SECTION);
  renderHowToRead_(body);
  addSpacer_(body, REPORT_V3_STYLE.GAP_SECTION);
  renderOutlookTwoLineFirst_(body, firstModel);
  addSpacer_(body, REPORT_V3_STYLE.GAP_SECTION);
  appendPriorityActions_(body, focusItems, 'first');
  if (noIssueLike) {
    addSpacer_(body, REPORT_V3_STYLE.GAP_SECTION);
    addSectionTitle_(body, 'Value Opportunities');
    renderRecommendationCards_(body, recs, promos);
  }
  addSpacer_(body, REPORT_V3_STYLE.GAP_SECTION);
  renderTwoColCards_(body, firstModel, actionCandidates, reportDate, 'first');
  addSpacer_(body, REPORT_V3_STYLE.GAP_SECTION);
  appendPromotions_(body, promos, 'first');
  addSpacer_(body, REPORT_V3_STYLE.GAP_SECTION);
  appendFooter_(body);
  normalizeDocParagraphs_(body);
}

function renderMonthlyV33_(body, ss, monthlyModel) {
  var reportDate = formatIsoDate_(monthlyModel.reportDate || new Date());
  var companyName = getCompanyName_(ss);
  var activeCards = getActiveCards(ss) || [];
  var hasActivePortfolio = activeCards.length > 0;
  var items = buildMonthlyItemsBlock_(monthlyModel);
  var displayItems = items.slice(0, 3);
  var summaryLine = buildMonthlySummaryLine_({
    items: displayItems,
    activeCardCount: hasActivePortfolio ? activeCards.length : 0,
    recurringNet: monthlyModel.recurringNet,
    monthlyOutlook: monthlyModel.monthlyOutlook
  });
  var promos = buildPromotionsBlock_(monthlyModel.promotions || monthlyModel.topPromos || [], DECISION_CONFIG.PROMO_CAP || 3);
  var actionCandidates = (monthlyModel.items || []).map(function(it) { return sanitizeOneLine_(it.action); }).filter(function(s) { return !!s; });
  var noIssues = !displayItems.length;

  appendHeader_(body, 'Monthly Health Report', companyName, reportDate, 'ACTIVE • LOW-NOISE');
  appendDashboardMonthly_(body, summaryLine, monthlyModel.recurringNet, displayItems.length, monthlyModel.oneTimeBonusAtRisk, monthlyModel.totalPotentialThisYear);
  addSpacer_(body, REPORT_V3_STYLE.GAP_SECTION);
  renderHowToRead_(body);
  addSpacer_(body, REPORT_V3_STYLE.GAP_SECTION);
  renderOutlookTwoLineMonthly_(body, monthlyModel);
  var recurringNote = body.appendParagraph("Note: All net figures reflect recurring value (estimated rewards/benefits) minus annual fees, excluding one-time welcome bonuses. We track welcome bonuses separately as time-sensitive completion risks.");
  applyTextStyle_(recurringNote, { fontFamily: REPORT_V3_STYLE.FONT_FAMILY, fontSize: REPORT_V3_STYLE.SMALL, bold: false, color: REPORT_V3_STYLE.COLOR_MUTED });
  addSpacer_(body, REPORT_V3_STYLE.GAP_SECTION);
  if (!noIssues) {
    appendPriorityActions_(body, displayItems, 'monthly');
  } else {
    addSpacer_(body, REPORT_V3_STYLE.GAP_SECTION);
    var itemsCount = monthlyModel && monthlyModel.items ? monthlyModel.items.length : 0;
    var monthlyNetRaw = monthlyModel && monthlyModel.monthlyOutlook && monthlyModel.monthlyOutlook.net != null
      ? monthlyModel.monthlyOutlook.net
      : monthlyModel.recurringNet;
    var monthlyNet = Number(monthlyNetRaw);
    var isStableMonth = hasActivePortfolio && itemsCount === 0 && !isNaN(monthlyNet) && monthlyNet >= 0;
    var isPortfolioLossMonth = hasActivePortfolio && !isNaN(monthlyNet) && monthlyNet < 0;
    addSectionTitle_(body,
      !hasActivePortfolio ? 'No active business credit cards detected.'
        : (isStableMonth ? 'Healthy Setup — Next Optimization Opportunities' : 'Portfolio is losing money')
    );
    var sectionBody = '';
    if (!hasActivePortfolio) {
      sectionBody = 'To begin building a profitable structure, start with one core card aligned to your largest spend category.';
    } else if (isStableMonth) {
      sectionBody = monthlyModel && monthlyModel.body ? monthlyModel.body : 'Monitoring stays low-noise. You will only be notified on meaningful changes.';
    } else if (isPortfolioLossMonth) {
      sectionBody = monthlyModel && monthlyModel.body
        ? monthlyModel.body
        : 'Your recurring annual net return is negative. Review fees vs. value and consider cancelling or replacing the loss-making card(s).';
    }
    var summary = body.appendParagraph(sectionBody);
    applyTextStyle_(summary, { fontFamily: REPORT_V3_STYLE.FONT_FAMILY, fontSize: REPORT_V3_STYLE.BODY, color: REPORT_V3_STYLE.COLOR_TEXT });
    renderNoIssuesOpportunityCards_(body, promos);
  }
  addSpacer_(body, REPORT_V3_STYLE.GAP_SECTION);
  renderTwoColCards_(body, monthlyModel, actionCandidates, reportDate, 'monthly');
  addSpacer_(body, REPORT_V3_STYLE.GAP_SECTION);
  appendPromotions_(body, promos, 'monthly');
  addSpacer_(body, REPORT_V3_STYLE.GAP_SECTION);
  appendFooter_(body);
  normalizeDocParagraphs_(body);
}

function appendHeader_(body, title, companyName, reportDate, statusBadgeText) {
  insertBrandHeader_(body, { companyName: companyName, reportDate: reportDate });
  addSpacer_(body, 6);
  addCenteredTitle_(body, title);
  addCenteredSubtitle_(body, statusBadgeText);
  addMetaLine_(body, 'Client: ' + sanitizeOneLine_(companyName || 'Client'), 'Report Date: ' + sanitizeOneLine_(reportDate));
  addDivider_(body);
}

function displayCardName_(name) {
  if (!name) return name;
  var s = sanitizeOneLine_(name);
  var parts = s.split(' ');
  if (parts.length >= 2) {
    parts[parts.length - 2] = parts[parts.length - 2] + '\u00A0' + parts.pop();
    return parts.join(' ');
  }
  return s;
}

function buildDashboardMetricCell_(cell, label, value, sublabel) {
  cell.setBackgroundColor(REPORT_V3_STYLE.COLOR_CARD_BG);
  var p1 = cell.getChild(0).asParagraph();
  p1.setText(sanitizeOneLine_(label || ''));
  applyTextStyle_(p1, { fontFamily: REPORT_V3_STYLE.FONT_FAMILY, fontSize: REPORT_V3_STYLE.SMALL, bold: false, color: REPORT_V3_STYLE.COLOR_MUTED });
  var p2 = cell.appendParagraph(sanitizeOneLine_(value || ''));
  var isNumeric = /^-?\$?[\d,]+/.test(sanitizeOneLine_(value || ''));
  applyTextStyle_(p2, {
    fontFamily: REPORT_V3_STYLE.FONT_FAMILY,
    fontSize: isNumeric ? REPORT_V3_STYLE.BIG : REPORT_V3_STYLE.BODY,
    bold: isNumeric,
    color: REPORT_V3_STYLE.COLOR_TEXT
  });
  if (sublabel) {
    var p3 = cell.appendParagraph(sanitizeOneLine_(sublabel));
    applyTextStyle_(p3, { fontFamily: REPORT_V3_STYLE.FONT_FAMILY, fontSize: REPORT_V3_STYLE.SMALL, bold: false, color: REPORT_V3_STYLE.COLOR_MUTED });
  }
}

function appendDashboardFirst_(body, keyNumbers) {
  addSectionTitle_(body, 'Executive Snapshot');
  var k = keyNumbers || {};
  var t = body.appendTable([[' ', ' ', ' ', ' ', ' ', ' ', ' ']]);
  try { t.setBorderColor(REPORT_V3_STYLE.COLOR_BORDER); t.setBorderWidth(1); } catch (e) {}
  buildDashboardMetricCell_(t.getCell(0, 0), 'Recurring Net', formatUsd_(k.currentNet || 0), '');
  buildDashboardMetricCell_(t.getCell(0, 1), 'Optimized Net', formatUsd_(k.optimizedNet || 0), '');
  buildDashboardMetricCell_(t.getCell(0, 2), 'Delta (Realizable)', formatUsdSigned_(k.delta || 0), '');
  buildDashboardMetricCell_(t.getCell(0, 3), 'Annual Fees', formatUsd_(k.currentFees || 0), '');
  buildDashboardMetricCell_(t.getCell(0, 4), 'Estimated Value', formatUsd_(k.currentValue || 0), '');
  buildDashboardMetricCell_(t.getCell(0, 5), 'One-time Bonus at Risk', formatUsd_(k.oneTimeBonusAtRisk || 0), 'This year only');
  buildDashboardMetricCell_(t.getCell(0, 6), 'Total Potential This Year', formatUsd_(k.totalPotentialThisYear || k.currentNet || 0), '');
}

function appendDashboardMonthly_(body, summary, recurringNet, itemCount, oneTimeBonusAtRisk, totalPotentialThisYear) {
  addSectionTitle_(body, 'Executive Snapshot');
  var t = body.appendTable([[' ', ' ', ' ', ' ', ' ']]);
  try { t.setBorderColor(REPORT_V3_STYLE.COLOR_BORDER); t.setBorderWidth(1); } catch (e) {}
  buildDashboardMetricCell_(t.getCell(0, 0), 'This Month', ellipsize_(summary || '', 120), '');
  buildDashboardMetricCell_(t.getCell(0, 1), 'Recurring Net (Annual)', formatUsd_(recurringNet || 0), '');
  buildDashboardMetricCell_(t.getCell(0, 2), 'Items Needing Attention', String(itemCount || 0), '');
  buildDashboardMetricCell_(t.getCell(0, 3), 'One-time Bonus at Risk', formatUsd_(oneTimeBonusAtRisk || 0), 'This year only');
  buildDashboardMetricCell_(t.getCell(0, 4), 'Total Potential This Year', formatUsd_(totalPotentialThisYear != null ? totalPotentialThisYear : recurringNet || 0), '');
}

function appendPriorityActions_(body, items, mode) {
  addSectionTitle_(body, 'Priority Actions');
  if (!items || !items.length) {
    var p = body.appendParagraph('No action items identified.');
    applyTextStyle_(p, { fontFamily: REPORT_V3_STYLE.FONT_FAMILY, fontSize: REPORT_V3_STYLE.BODY, bold: false, color: REPORT_V3_STYLE.COLOR_TEXT });
    return;
  }
  var limit = mode === 'monthly' ? 3 : 5;
  var n = Math.min(limit, items.length);
  for (var i = 0; i < n; i++) {
    (function(it, idx) {
      addCard_(body, function(cell) {
        var tag = inferSeverityTag_(it);
        var top = cell.appendTable([[' ', ' ']]);
        try { top.setBorderWidth(0); } catch (e) {}
        var l = top.getCell(0, 0).getChild(0).asParagraph();
        var r = top.getCell(0, 1).getChild(0).asParagraph();
        var cardName = displayCardName_(sanitizeOneLine_((it.title || 'Card').split(' — ')[0]));
        var issue = sanitizeOneLine_((it.title || '').split(' — ').slice(1).join(' — ') || mapIssueTypeToTitle_(it.issueType));
        l.setText((idx + 1) + '. ' + cardName);
        applyTextStyle_(l, { fontFamily: REPORT_V3_STYLE.FONT_FAMILY, fontSize: REPORT_V3_STYLE.MID, bold: true, color: REPORT_V3_STYLE.COLOR_TEXT });
        renderTagPill_(r, tag);

        var issueP = cell.appendParagraph(issue);
        applyTextStyle_(issueP, { fontFamily: REPORT_V3_STYLE.FONT_FAMILY, fontSize: REPORT_V3_STYLE.SMALL, bold: false, color: REPORT_V3_STYLE.COLOR_MUTED });
        var statusP = cell.appendParagraph('What we see: ' + sanitizeOneLine_(it.status || 'No additional status.'));
        applyTextStyle_(statusP, { fontFamily: REPORT_V3_STYLE.FONT_FAMILY, fontSize: REPORT_V3_STYLE.BODY, bold: false, color: REPORT_V3_STYLE.COLOR_TEXT });
        var actionText = sanitizeOneLine_(it.action || 'Review and execute.');
        if (String(it.issueType || '').toLowerCase() === 'prebonus') actionText = 'Complete the required spend threshold first; then revisit optimization.';
        var actionP = cell.appendParagraph('What to do: ' + actionText);
        applyTextStyle_(actionP, { fontFamily: REPORT_V3_STYLE.FONT_FAMILY, fontSize: REPORT_V3_STYLE.BODY, bold: false, color: REPORT_V3_STYLE.COLOR_TEXT });
        var rawImpactNum = it.impactUsd != null ? Number(it.impactUsd) : Number(String(it.impactLabel || '').replace(/[^0-9.-]/g, ''));
        var impactValid = !!it.showImpact && shouldShowProjectedImpact_(it.issueType, rawImpactNum);
        if (impactValid) {
          var signedImpact = String(it.issueType || '').toLowerCase() === 'bleeding'
            ? formatUsdSigned_(-Math.abs(rawImpactNum))
            : formatUsdSigned_(rawImpactNum);
          var impactLabel = String(it.issueType || '').toLowerCase() === 'bleeding'
            ? 'Annual loss at risk: ' + signedImpact
            : 'Projected annual impact: ' + signedImpact;
          var impactP = cell.appendParagraph(impactLabel);
          applyTextStyle_(impactP, { fontFamily: REPORT_V3_STYLE.FONT_FAMILY, fontSize: REPORT_V3_STYLE.BODY, bold: true, color: REPORT_V3_STYLE.COLOR_TEXT });
        }
      });
      addSpacer_(body, REPORT_V3_STYLE.GAP_CARD);
    })(items[i], i);
  }
  if (mode === 'monthly' && items.length > 2) {
    var note = body.appendParagraph('Additional items are monitored and will appear when they become high impact.');
    applyTextStyle_(note, { fontFamily: REPORT_V3_STYLE.FONT_FAMILY, fontSize: REPORT_V3_STYLE.SMALL, bold: false, color: REPORT_V3_STYLE.COLOR_MUTED });
  }
}

function appendPortfolioSnapshot_(body, model, mode) {
  addSectionTitle_(body, 'Portfolio Snapshot');
  addCard_(body, function(cell) {
    var line = '';
    if (mode === 'first') {
      var k = model && model.keyNumbers ? model.keyNumbers : {};
      line = 'Current net: ' + formatUsd_(k.currentNet || 0) + ' -> After actions: ' + formatUsd_(k.optimizedNet || 0) + ' (unlock +' + formatUsd_(k.delta || 0).replace(/^\$/, '') + ')';
    } else {
      var recurring = model && model.recurringNet != null ? Number(model.recurringNet) : 0;
      line = 'Projected recurring net return: ' + formatUsd_(recurring) + ' after annual fees.';
    }
    var p1 = cell.appendParagraph(line);
    applyTextStyle_(p1, { fontFamily: REPORT_V3_STYLE.FONT_FAMILY, fontSize: REPORT_V3_STYLE.BODY, bold: false, color: REPORT_V3_STYLE.COLOR_TEXT });
    var p2 = cell.appendParagraph('Monitoring stays low-noise. You will only be notified on meaningful changes.');
    applyTextStyle_(p2, { fontFamily: REPORT_V3_STYLE.FONT_FAMILY, fontSize: REPORT_V3_STYLE.SMALL, bold: false, color: REPORT_V3_STYLE.COLOR_MUTED });
  });
}

function renderOutlookFirst_(body, firstModel) {
  addSectionTitle_(body, '12-Month Outlook');
  var k = firstModel && firstModel.keyNumbers ? firstModel.keyNumbers : {};
  var wrap = body.appendTable([[' ', ' ']]);
  try { wrap.setBorderWidth(0); } catch (e) {}

  var left = wrap.getCell(0, 0);
  left.setBackgroundColor(REPORT_V3_STYLE.COLOR_CARD_BG);
  left.getChild(0).asParagraph().setText('Scenario A — Keep Current Setup');
  applyTextStyle_(left.getChild(0).asParagraph(), { fontFamily: REPORT_V3_STYLE.FONT_FAMILY, fontSize: REPORT_V3_STYLE.BODY, bold: true, color: REPORT_V3_STYLE.COLOR_TEXT });
  applyTextStyle_(left.appendParagraph('Recurring Net (12-mo): ' + formatUsd_(k.currentNet || 0)), { fontFamily: REPORT_V3_STYLE.FONT_FAMILY, fontSize: REPORT_V3_STYLE.BODY, color: REPORT_V3_STYLE.COLOR_TEXT });
  applyTextStyle_(left.appendParagraph('Annual Fees: ' + formatUsd_(k.currentFees || 0)), { fontFamily: REPORT_V3_STYLE.FONT_FAMILY, fontSize: REPORT_V3_STYLE.BODY, color: REPORT_V3_STYLE.COLOR_TEXT });
  applyTextStyle_(left.appendParagraph('Estimated Value: ' + formatUsd_(k.currentValue || 0)), { fontFamily: REPORT_V3_STYLE.FONT_FAMILY, fontSize: REPORT_V3_STYLE.BODY, color: REPORT_V3_STYLE.COLOR_TEXT });

  var right = wrap.getCell(0, 1);
  right.setBackgroundColor(REPORT_V3_STYLE.COLOR_CARD_BG);
  right.getChild(0).asParagraph().setText('Scenario B — Follow Recommended Actions');
  applyTextStyle_(right.getChild(0).asParagraph(), { fontFamily: REPORT_V3_STYLE.FONT_FAMILY, fontSize: REPORT_V3_STYLE.BODY, bold: true, color: REPORT_V3_STYLE.COLOR_TEXT });
  applyTextStyle_(right.appendParagraph('Projected Net (12-mo): ' + formatUsd_(k.optimizedNet || 0)), { fontFamily: REPORT_V3_STYLE.FONT_FAMILY, fontSize: REPORT_V3_STYLE.BODY, color: REPORT_V3_STYLE.COLOR_TEXT });
  applyTextStyle_(right.appendParagraph('Net Lift (Unlock): ' + formatUsdSigned_(k.delta || 0)), { fontFamily: REPORT_V3_STYLE.FONT_FAMILY, fontSize: REPORT_V3_STYLE.BODY, color: REPORT_V3_STYLE.COLOR_TEXT, bold: true });

  var n1 = body.appendParagraph('Recurring net = estimated rewards/benefits minus annual fees (welcome bonuses excluded).');
  applyTextStyle_(n1, { fontFamily: REPORT_V3_STYLE.FONT_FAMILY, fontSize: REPORT_V3_STYLE.SMALL, color: REPORT_V3_STYLE.COLOR_MUTED });
  var n2 = body.appendParagraph('Unlock is realizable if you complete the priority actions below.');
  applyTextStyle_(n2, { fontFamily: REPORT_V3_STYLE.FONT_FAMILY, fontSize: REPORT_V3_STYLE.SMALL, color: REPORT_V3_STYLE.COLOR_MUTED });
}

function renderOutlookMonthly_(body, monthlyModel) {
  addSectionTitle_(body, '12-Month Outlook');
  var recurring = monthlyModel && monthlyModel.recurringNet != null ? Number(monthlyModel.recurringNet) : 0;
  var items = monthlyModel && monthlyModel.items ? monthlyModel.items.slice(0, 2) : [];
  var sumImpact = 0;
  for (var i = 0; i < items.length; i++) {
    var v = items[i].impactUsd != null ? Number(items[i].impactUsd) : NaN;
    if (!isNaN(v) && v > 0) sumImpact += Math.abs(v);
  }
  addCard_(body, function(cell) {
    applyTextStyle_(cell.getChild(0).asParagraph(), { fontFamily: REPORT_V3_STYLE.FONT_FAMILY, fontSize: REPORT_V3_STYLE.BODY, bold: false, color: REPORT_V3_STYLE.COLOR_TEXT });
    cell.getChild(0).asParagraph().setText('If No Action: recurring net stays about ' + formatUsd_(recurring) + '.');
    if (sumImpact > 0) {
      var p = cell.appendParagraph("If You Complete This Month's Actions: protect/unlock about " + formatUsdSigned_(sumImpact) + ' annually.');
      applyTextStyle_(p, { fontFamily: REPORT_V3_STYLE.FONT_FAMILY, fontSize: REPORT_V3_STYLE.BODY, bold: false, color: REPORT_V3_STYLE.COLOR_TEXT });
    }
    var m = cell.appendParagraph('We surface only material risks and time-sensitive actions.');
    applyTextStyle_(m, { fontFamily: REPORT_V3_STYLE.FONT_FAMILY, fontSize: REPORT_V3_STYLE.SMALL, bold: false, color: REPORT_V3_STYLE.COLOR_MUTED });
  });
}

function renderHowToRead_(body) {
  addSectionTitle_(body, 'How to Read This Report');
  addCard_(body, function(cell) {
    var bullets = [
      'All numbers focus on recurring value (rewards/benefits) minus annual fees.',
      'Welcome bonuses are one-time. We track them as a separate lifecycle risk.',
      'Some adjustments may not increase net return, but improve long-term efficiency and monitoring accuracy.',
      'Welcome bonuses are one-time gains. If earned, they will not recur next year and are excluded from structural net calculations.',
      'Optimized Net estimates the outcome if you complete the priority actions.',
      'Unlock is the realistic improvement you can capture (no extra spending assumed).',
      'Monthly reports stay low-noise: we flag only losses, bonus risk, annual-fee events, or abnormal changes.',
      'Your inputs come from Card Assets: annual fee, spend range, and whether the bonus is confirmed.'
    ];
    for (var i = 0; i < bullets.length; i++) {
      var p = cell.appendParagraph('• ' + bullets[i]);
      applyTextStyle_(p, { fontFamily: REPORT_V3_STYLE.FONT_FAMILY, fontSize: 10, bold: false, color: REPORT_V3_STYLE.COLOR_MUTED });
    }
  });
}

function renderOutlookTwoLineFirst_(body, firstModel) {
  addSectionTitle_(body, '12-Month Outlook');
  var k = firstModel && firstModel.keyNumbers ? firstModel.keyNumbers : {};
  var t = body.appendTable([[' '], [' ']]);
  try { t.setBorderColor(REPORT_V3_STYLE.COLOR_BORDER); t.setBorderWidth(1); } catch (e) {}
  t.getCell(0, 0).setBackgroundColor(REPORT_V3_STYLE.COLOR_CARD_BG);
  t.getCell(1, 0).setBackgroundColor(REPORT_V3_STYLE.COLOR_CARD_BG);
  var l1 = 'If you keep your setup: Net ' + formatUsd_(k.currentNet || 0) + ' • Fees ' + formatUsd_(k.currentFees || 0) + ' • Value ' + formatUsd_(k.currentValue || 0);
  var l2 = 'If you follow our actions: Net ' + formatUsd_(k.optimizedNet || 0) + ' • Unlock ' + formatUsdSigned_(k.delta || 0);
  t.getCell(0, 0).getChild(0).asParagraph().setText(l1);
  t.getCell(1, 0).getChild(0).asParagraph().setText(l2);
  applyTextStyle_(t.getCell(0, 0).getChild(0).asParagraph(), { fontFamily: REPORT_V3_STYLE.FONT_FAMILY, fontSize: REPORT_V3_STYLE.BODY, bold: false, color: REPORT_V3_STYLE.COLOR_TEXT });
  applyTextStyle_(t.getCell(1, 0).getChild(0).asParagraph(), { fontFamily: REPORT_V3_STYLE.FONT_FAMILY, fontSize: REPORT_V3_STYLE.BODY, bold: true, color: REPORT_V3_STYLE.COLOR_TEXT });
  var b1 = body.appendParagraph('One-time Bonus at Risk (This year only): ' + formatUsd_(k.oneTimeBonusAtRisk || 0));
  applyTextStyle_(b1, { fontFamily: REPORT_V3_STYLE.FONT_FAMILY, fontSize: REPORT_V3_STYLE.BODY, bold: false, color: REPORT_V3_STYLE.COLOR_TEXT });
  var b2 = body.appendParagraph('Total Potential This Year: ' + formatUsd_(k.totalPotentialThisYear || k.currentNet || 0));
  applyTextStyle_(b2, { fontFamily: REPORT_V3_STYLE.FONT_FAMILY, fontSize: REPORT_V3_STYLE.BODY, bold: true, color: REPORT_V3_STYLE.COLOR_TEXT });
}

function renderOutlookTwoLineMonthly_(body, monthlyModel) {
  addSectionTitle_(body, '12-Month Outlook');
  var model = monthlyModel || {};
  var portfolio = model.portfolioSummary;
  var k = model.keyNumbers || null;
  var items = model.items || [];

  var netA;
  var feesA;
  var valA;
  if (portfolio) {
    netA = Number(portfolio.currentNet);
    feesA = Number(portfolio.currentFees);
    valA = Number(portfolio.currentValue);
  } else {
    netA = k && k.currentNet != null ? Number(k.currentNet) : Number(model.recurringNet);
    feesA = k && k.currentFees != null ? Number(k.currentFees) : Number(model.currentFees);
    valA = k && k.currentValue != null ? Number(k.currentValue) : Number(model.currentValue);
  }
  if (isNaN(netA)) netA = 0;
  if (isNaN(feesA)) feesA = 0;
  if (isNaN(valA)) valA = 0;

  Logger.log('DEBUG monthlyOutlook net=' + netA + ' fees=' + feesA + ' value=' + valA);

  var hasActions = items.length > 0;
  var netB = portfolio && portfolio.optimizedNet != null
    ? Number(portfolio.optimizedNet)
    : (k && k.optimizedNet != null ? Number(k.optimizedNet) : Number(model.optimizedNet));
  if (isNaN(netB) || !hasActions) netB = netA;
  var unlock = hasActions ? (netB - netA) : 0;

  var line1 = 'If you keep your setup: Net ' + formatUsd_(netA) + ' • Fees ' + formatUsd_(feesA) + ' • Value ' + formatUsd_(valA);
  var line2 = "If you follow this month's actions: Net " + formatUsd_(netB) + ' • Unlock ' + formatUsdSigned_(unlock);
  var t = body.appendTable([[' '], [' ']]);
  try { t.setBorderColor(REPORT_V3_STYLE.COLOR_BORDER); t.setBorderWidth(1); } catch (e) {}
  t.getCell(0, 0).setBackgroundColor(REPORT_V3_STYLE.COLOR_CARD_BG);
  t.getCell(1, 0).setBackgroundColor(REPORT_V3_STYLE.COLOR_CARD_BG);
  t.getCell(0, 0).getChild(0).asParagraph().setText(line1);
  t.getCell(1, 0).getChild(0).asParagraph().setText(line2);
  applyTextStyle_(t.getCell(0, 0).getChild(0).asParagraph(), { fontFamily: REPORT_V3_STYLE.FONT_FAMILY, fontSize: REPORT_V3_STYLE.BODY, bold: false, color: REPORT_V3_STYLE.COLOR_TEXT });
  applyTextStyle_(t.getCell(1, 0).getChild(0).asParagraph(), { fontFamily: REPORT_V3_STYLE.FONT_FAMILY, fontSize: REPORT_V3_STYLE.BODY, bold: false, color: REPORT_V3_STYLE.COLOR_TEXT });
  var bonusAtRisk = model.oneTimeBonusAtRisk != null
    ? Number(model.oneTimeBonusAtRisk)
    : (portfolio && portfolio.oneTimeBonusAtRisk != null ? Number(portfolio.oneTimeBonusAtRisk) : 0);
  if (isNaN(bonusAtRisk)) bonusAtRisk = 0;
  var totalPotential = model.totalPotentialThisYear != null
    ? Number(model.totalPotentialThisYear)
    : (portfolio && portfolio.totalPotentialThisYear != null ? Number(portfolio.totalPotentialThisYear) : (netA + bonusAtRisk));
  if (isNaN(totalPotential)) totalPotential = netA + bonusAtRisk;
  var b1 = body.appendParagraph('One-time Bonus at Risk (This year only): ' + formatUsd_(bonusAtRisk));
  applyTextStyle_(b1, { fontFamily: REPORT_V3_STYLE.FONT_FAMILY, fontSize: REPORT_V3_STYLE.BODY, bold: false, color: REPORT_V3_STYLE.COLOR_TEXT });
  var b2 = body.appendParagraph('Total Potential This Year: ' + formatUsd_(totalPotential));
  applyTextStyle_(b2, { fontFamily: REPORT_V3_STYLE.FONT_FAMILY, fontSize: REPORT_V3_STYLE.BODY, bold: true, color: REPORT_V3_STYLE.COLOR_TEXT });
}

function pickRecommendedCardsFromCatalog_(assets, catalogAll) {
  if (!catalogAll || !catalogAll.length) return [];
  var headers = catalogAll[0] || [];
  function idx(nameArr) {
    for (var i = 0; i < headers.length; i++) {
      var h = headers[i] == null ? '' : String(headers[i]).trim().toLowerCase();
      for (var j = 0; j < nameArr.length; j++) if (h === nameArr[j]) return i;
    }
    return -1;
  }
  var nameIdx = idx(['card name', 'card_name', 'name']);
  var issuerIdx = idx(['issuer']);
  var bonusIdx = idx(['typical bonus value (usd)', 'bonus_value_est_usd', 'typical bonus value']);
  var feeIdx = idx(['annual fee (usd)', 'annual_fee_current', 'annual fee']);
  var levelIdx = idx(['bonus level', 'bonus_level']);
  var typeIdx = idx(['product_type', 'product type']);
  var bestIdx = idx(['best_for_categories', 'best for categories']);
  if (nameIdx < 0) return [];

  var owned = {};
  var listAssets = assets || [];
  for (var a = 0; a < listAssets.length; a++) {
    var n = listAssets[a]['Card Name'] || listAssets[a]['Card name'] || listAssets[a].cardName || '';
    if (n) owned[String(n).trim().toLowerCase()] = true;
  }

  var rows = [];
  for (var r = 1; r < catalogAll.length; r++) {
    var row = catalogAll[r] || [];
    var cardName = row[nameIdx] == null ? '' : String(row[nameIdx]).trim();
    if (!cardName) continue;
    if (owned[cardName.toLowerCase()]) continue;
    var pType = typeIdx >= 0 && row[typeIdx] != null ? String(row[typeIdx]).toLowerCase() : '';
    if (pType && pType.indexOf('business') < 0) continue;
    var bonus = bonusIdx >= 0 ? Number(String(row[bonusIdx] || '').replace(/[^0-9.-]/g, '')) : 0;
    if (isNaN(bonus)) bonus = 0;
    var fee = feeIdx >= 0 ? Number(String(row[feeIdx] || '').replace(/[^0-9.-]/g, '')) : 0;
    if (isNaN(fee)) fee = 0;
    var levelRaw = levelIdx >= 0 && row[levelIdx] != null ? String(row[levelIdx]).toLowerCase() : '';
    var levelRank = levelRaw.indexOf('high') >= 0 ? 2 : (levelRaw.indexOf('medium') >= 0 ? 1 : 0);
    rows.push({
      cardName: cardName,
      issuer: issuerIdx >= 0 ? sanitizeOneLine_(row[issuerIdx] || '') : '',
      typicalBonusValue: bonus,
      annualFee: fee,
      bonusLevel: levelRaw,
      levelRank: levelRank,
      bestFor: bestIdx >= 0 ? sanitizeOneLine_(row[bestIdx] || '') : ''
    });
  }
  rows.sort(function(a, b) {
    if (b.levelRank !== a.levelRank) return b.levelRank - a.levelRank;
    if (b.typicalBonusValue !== a.typicalBonusValue) return b.typicalBonusValue - a.typicalBonusValue;
    var aPref = a.annualFee <= 150 ? 0 : 1;
    var bPref = b.annualFee <= 150 ? 0 : 1;
    return aPref - bPref;
  });
  return rows.slice(0, 3);
}

function buildRecommendationsBlock_(recs, promosMap) {
  var out = [];
  var list = recs || [];
  for (var i = 0; i < list.length; i++) {
    var r = list[i];
    var key = String(r.cardName || '').toLowerCase();
    out.push({
      cardName: r.cardName,
      issuer: r.issuer,
      bonusText: formatUsd_(r.typicalBonusValue || 0),
      feeText: formatUsd_(r.annualFee || 0),
      bestFor: r.bestFor,
      applyUrl: promosMap && promosMap[key] ? promosMap[key] : ''
    });
  }
  return out;
}

function buildNoIssuesOpportunityBlock_(topPromos) {
  var promos = topPromos || [];
  var out = [];
  out.push('Earning Coverage Check: confirm each major spend category maps to your highest-return card.');
  if (promos.length) out.push('Upcoming Promotions Worth Considering: ' + promos.length + ' active opportunities in catalog.');
  else out.push('Upcoming Promotions Worth Considering: no weekly promos in catalog; update catalog weekly.');
  out.push('Suggested Next Step: confirm spend allocation once this month (low effort, high confidence).');
  return out;
}

function _promosMapByCard_(promos) {
  var map = {};
  var list = promos || [];
  for (var i = 0; i < list.length; i++) {
    var p = list[i] || {};
    var line = sanitizeOneLine_(p.lineText || '');
    var m = line.match(/^\d+\)\s*(.*?)\s+—/);
    var key = m && m[1] ? String(m[1]).trim().toLowerCase() : '';
    if (key && p.applyUrl) map[key] = p.applyUrl;
  }
  return map;
}

function renderRecommendationCards_(body, recs, promos) {
  var promosMap = _promosMapByCard_(promos);
  var block = buildRecommendationsBlock_(recs, promosMap);
  if (!block.length) {
    var p = body.appendParagraph('No suitable recommendations found in current catalog.');
    applyTextStyle_(p, { fontFamily: REPORT_V3_STYLE.FONT_FAMILY, fontSize: REPORT_V3_STYLE.BODY, color: REPORT_V3_STYLE.COLOR_TEXT });
    return;
  }
  for (var i = 0; i < block.length; i++) {
    (function(it, idx) {
      addCard_(body, function(cell) {
        applyTextStyle_(cell.getChild(0).asParagraph(), { fontFamily: REPORT_V3_STYLE.FONT_FAMILY, fontSize: REPORT_V3_STYLE.BODY, bold: true, color: REPORT_V3_STYLE.COLOR_TEXT });
        cell.getChild(0).asParagraph().setText((idx + 1) + '. ' + displayCardName_(it.cardName) + (it.issuer ? ' (' + it.issuer + ')' : ''));
        applyTextStyle_(cell.appendParagraph('Typical bonus value (est): ' + it.bonusText + ' • Annual fee: ' + it.feeText), { fontFamily: REPORT_V3_STYLE.FONT_FAMILY, fontSize: REPORT_V3_STYLE.BODY, color: REPORT_V3_STYLE.COLOR_TEXT });
        if (it.bestFor) applyTextStyle_(cell.appendParagraph('Best for: ' + it.bestFor), { fontFamily: REPORT_V3_STYLE.FONT_FAMILY, fontSize: REPORT_V3_STYLE.SMALL, color: REPORT_V3_STYLE.COLOR_MUTED });
        if (it.applyUrl) appendLinkText_(cell, 'Apply Link', it.applyUrl);
      });
      addSpacer_(body, REPORT_V3_STYLE.GAP_CARD);
    })(block[i], i);
  }
}

function renderNoIssuesOpportunityCards_(body, promos) {
  var lines = buildNoIssuesOpportunityBlock_(promos);
  for (var i = 0; i < lines.length; i++) {
    (function(line) {
      addCard_(body, function(cell) {
      var p = cell.getChild(0).asParagraph();
      p.setText(line);
      applyTextStyle_(p, { fontFamily: REPORT_V3_STYLE.FONT_FAMILY, fontSize: REPORT_V3_STYLE.BODY, color: REPORT_V3_STYLE.COLOR_TEXT });
      });
    })(lines[i]);
    addSpacer_(body, REPORT_V3_STYLE.GAP_CARD);
  }
  if (promos && promos.length) appendPromotions_(body, promos.slice(0, 3), 'monthly');
}

function renderOnboardingFirst_(body, ss, reportDate, companyName, recs, promos) {
  appendHeader_(body, 'Business Card Starter Plan', companyName, reportDate, 'INITIAL REVIEW');
  addSectionTitle_(body, 'No active portfolio detected.');
  var intro = body.appendParagraph('Here is a starter structure to help you establish a profitable baseline.');
  applyTextStyle_(intro, { fontFamily: REPORT_V3_STYLE.FONT_FAMILY, fontSize: REPORT_V3_STYLE.BODY, color: REPORT_V3_STYLE.COLOR_TEXT });
  addSpacer_(body, REPORT_V3_STYLE.GAP_SECTION);
  addSectionTitle_(body, 'Starter Plan — 3 Recommended Business Cards');
  renderRecommendationCards_(body, recs, promos);
  addSectionTitle_(body, 'How to Choose');
  addCard_(body, function(cell) {
    applyTextStyle_(cell.getChild(0).asParagraph(), { fontFamily: REPORT_V3_STYLE.FONT_FAMILY, fontSize: REPORT_V3_STYLE.BODY, color: REPORT_V3_STYLE.COLOR_TEXT });
    cell.getChild(0).asParagraph().setText('• Start with one low-fee card aligned to your top spend category.');
    applyTextStyle_(cell.appendParagraph('• Add a second card only when spend volume supports the annual fee.'), { fontFamily: REPORT_V3_STYLE.FONT_FAMILY, fontSize: REPORT_V3_STYLE.BODY, color: REPORT_V3_STYLE.COLOR_TEXT });
    applyTextStyle_(cell.appendParagraph('• Confirm bonus completion monthly to avoid missing one-time value.'), { fontFamily: REPORT_V3_STYLE.FONT_FAMILY, fontSize: REPORT_V3_STYLE.BODY, color: REPORT_V3_STYLE.COLOR_TEXT });
  });
  addSpacer_(body, REPORT_V3_STYLE.GAP_SECTION);
  addSectionTitle_(body, 'Next Steps');
  addCard_(body, function(cell) {
    applyTextStyle_(cell.getChild(0).asParagraph(), { fontFamily: REPORT_V3_STYLE.FONT_FAMILY, fontSize: REPORT_V3_STYLE.BODY, color: REPORT_V3_STYLE.COLOR_TEXT });
    cell.getChild(0).asParagraph().setText('1) Choose one card from the shortlist and submit application.');
    applyTextStyle_(cell.appendParagraph('2) Set spend allocation and bonus tracking before first statement closes.'), { fontFamily: REPORT_V3_STYLE.FONT_FAMILY, fontSize: REPORT_V3_STYLE.BODY, color: REPORT_V3_STYLE.COLOR_TEXT });
    applyTextStyle_(cell.appendParagraph('3) Review again in 30 days for second-card timing.'), { fontFamily: REPORT_V3_STYLE.FONT_FAMILY, fontSize: REPORT_V3_STYLE.BODY, color: REPORT_V3_STYLE.COLOR_TEXT });
  });
  addSpacer_(body, REPORT_V3_STYLE.GAP_SECTION);
  appendPromotions_(body, promos, 'first');
  addSpacer_(body, REPORT_V3_STYLE.GAP_SECTION);
  appendFooter_(body);
}

function renderTwoColCards_(body, model, actions, reportDate, mode) {
  addSectionTitle_(body, 'Portfolio Snapshot');
  var acts = (actions || []).filter(function(a) { return !!sanitizeOneLine_(a); }).slice(0, 2);
  if (!acts.length) acts = ['Review current items and execute the highest-impact action.'];
  var d = new Date(reportDate);
  if (isNaN(d.getTime())) d = new Date();
  d.setDate(d.getDate() + 30);

  var t = body.appendTable([[' ', ' ']]);
  try { t.setBorderWidth(0); } catch (e) {}
  var left = t.getCell(0, 0);
  left.setBackgroundColor(REPORT_V3_STYLE.COLOR_CARD_BG);
  var right = t.getCell(0, 1);
  right.setBackgroundColor(REPORT_V3_STYLE.COLOR_CARD_BG);

  var p0 = left.getChild(0).asParagraph();
  p0.setText(' ');
  if (mode === 'first') {
    var k = model && model.keyNumbers ? model.keyNumbers : {};
    applyTextStyle_(left.appendParagraph('Current net: ' + formatUsd_(k.currentNet || 0) + ' -> After actions: ' + formatUsd_(k.optimizedNet || 0) + ' (Unlock: ' + formatUsdSigned_(k.delta || 0) + ')'), { fontFamily: REPORT_V3_STYLE.FONT_FAMILY, fontSize: REPORT_V3_STYLE.BODY, color: REPORT_V3_STYLE.COLOR_TEXT });
  } else {
    var recurring = model && model.recurringNet != null ? Number(model.recurringNet) : 0;
    applyTextStyle_(left.appendParagraph('Projected recurring net return: ' + formatUsd_(recurring) + ' after annual fees.'), { fontFamily: REPORT_V3_STYLE.FONT_FAMILY, fontSize: REPORT_V3_STYLE.BODY, color: REPORT_V3_STYLE.COLOR_TEXT });
  }
  applyTextStyle_(left.appendParagraph('Monitoring stays low-noise. You will only be notified on meaningful changes.'), { fontFamily: REPORT_V3_STYLE.FONT_FAMILY, fontSize: REPORT_V3_STYLE.SMALL, color: REPORT_V3_STYLE.COLOR_MUTED });

  var r0 = right.getChild(0).asParagraph();
  r0.setText('Next Actions');
  applyTextStyle_(r0, { fontFamily: REPORT_V3_STYLE.FONT_FAMILY, fontSize: REPORT_V3_STYLE.BODY, bold: true, color: REPORT_V3_STYLE.COLOR_TEXT });
  for (var i = 0; i < acts.length; i++) {
    applyTextStyle_(right.appendParagraph((i + 1) + ') ' + sanitizeOneLine_(acts[i])), { fontFamily: REPORT_V3_STYLE.FONT_FAMILY, fontSize: REPORT_V3_STYLE.BODY, color: REPORT_V3_STYLE.COLOR_TEXT });
  }
  applyTextStyle_(right.appendParagraph('Next review: ' + formatIsoDate_(d)), { fontFamily: REPORT_V3_STYLE.FONT_FAMILY, fontSize: REPORT_V3_STYLE.BODY, color: REPORT_V3_STYLE.COLOR_TEXT });
  applyTextStyle_(right.appendParagraph('Alerts trigger only on structural loss, bonus risk, annual fee events, or abnormal changes.'), { fontFamily: REPORT_V3_STYLE.FONT_FAMILY, fontSize: REPORT_V3_STYLE.SMALL, color: REPORT_V3_STYLE.COLOR_MUTED });
}

function appendPromotions_(body, promos, mode) {
  addSectionTitle_(body, mode === 'first' ? 'Optional Market Opportunities (Updated Weekly)' : 'Current Market Opportunities (Updated Weekly)');
  if (!promos || !promos.length) {
    body.appendParagraph('No active promotions available in this update.');
    return;
  }
  for (var i = 0; i < promos.length; i++) {
    (function(promo, idx) {
      addCard_(body, function(cell) {
        var line = sanitizeOneLine_(promo.lineText || '');
        var m = line.match(/^\d+\)\s*(.*?)\s+—\s*(.*?)(?:\s+\((.*?)\))?$/);
        var cardName = m ? m[1] : 'Card';
        var headline = m ? m[2] : line;
        var detail = m && m[3] ? m[3] : '';
        var p1 = cell.appendParagraph((idx + 1) + '. ' + displayCardName_(cardName));
        applyTextStyle_(p1, { fontFamily: REPORT_V3_STYLE.FONT_FAMILY, fontSize: REPORT_V3_STYLE.BODY, bold: true, color: REPORT_V3_STYLE.COLOR_TEXT });
        var p2 = cell.appendParagraph(ellipsize_(headline, 110));
        applyTextStyle_(p2, { fontFamily: REPORT_V3_STYLE.FONT_FAMILY, fontSize: REPORT_V3_STYLE.SMALL, bold: false, color: REPORT_V3_STYLE.COLOR_MUTED });
        if (detail) {
          var p3 = cell.appendParagraph(detail.replace(/Est\s/i, 'Est value: ').replace(/valid until/i, 'Valid until:'));
          applyTextStyle_(p3, { fontFamily: REPORT_V3_STYLE.FONT_FAMILY, fontSize: REPORT_V3_STYLE.BODY, bold: false, color: REPORT_V3_STYLE.COLOR_TEXT });
        }
      });
      addSpacer_(body, REPORT_V3_STYLE.GAP_CARD);
    })(promos[i], i);
  }
}

function appendNextActions_(body, actions, reportDate) {
  addSectionTitle_(body, 'Next Actions');
  var acts = (actions || []).filter(function(a) { return !!sanitizeOneLine_(a); }).slice(0, 2);
  if (!acts.length) acts = ['Review current items and execute the highest-impact action.'];
  var d = new Date(reportDate);
  if (isNaN(d.getTime())) d = new Date();
  d.setDate(d.getDate() + 30);
  addCard_(body, function(cell) {
    for (var i = 0; i < acts.length; i++) {
      var p = cell.appendParagraph((i + 1) + ') ' + sanitizeOneLine_(acts[i]));
      applyTextStyle_(p, { fontFamily: REPORT_V3_STYLE.FONT_FAMILY, fontSize: REPORT_V3_STYLE.BODY, bold: false, color: REPORT_V3_STYLE.COLOR_TEXT });
    }
    var p2 = cell.appendParagraph('Next review: ' + formatIsoDate_(d));
    applyTextStyle_(p2, { fontFamily: REPORT_V3_STYLE.FONT_FAMILY, fontSize: REPORT_V3_STYLE.BODY, bold: false, color: REPORT_V3_STYLE.COLOR_TEXT });
    var p3 = cell.appendParagraph('Alerts trigger only on structural loss, bonus risk, annual fee events, or abnormal changes.');
    applyTextStyle_(p3, { fontFamily: REPORT_V3_STYLE.FONT_FAMILY, fontSize: REPORT_V3_STYLE.SMALL, bold: false, color: REPORT_V3_STYLE.COLOR_MUTED });
  });
}

function appendFooter_(body) {
  addDivider_(body);
  var p = body.appendParagraph('Weekly promotions are informational. Reviews run monthly and alerts trigger only on meaningful changes.');
  applyTextStyle_(p, { fontFamily: REPORT_V3_STYLE.FONT_FAMILY, fontSize: REPORT_V3_STYLE.SMALL, bold: false, color: REPORT_V3_STYLE.COLOR_MUTED });
}

function inferSeverityTag_(it) {
  var typeRaw = String(it.issueType || it.type || '').toLowerCase();
  var title = String(it.title || '').toLowerCase();
  if (title.indexOf('keep as is') >= 0 || typeRaw === 'efficient') return 'OK';
  if (title.indexOf('spending role should be adjusted') >= 0) return 'LOW';
  return mapIssueTypeToLevel_(typeRaw);
}

