/**
 * @file WebApp.gs
 * Web App UI for beautiful report preview + browser-side PDF download.
 */

// === 强力自包含加载（解决 Web App 作用域与文件路径差异） ===
var ENGINE_CANDIDATES_ = [
  'structureEngine', 'engine/structureEngine',
  'lifecycleEngine', 'engine/lifecycleEngine',
  'bonusLifecycleEngine', 'engine/bonusLifecycleEngine',
  'marketEngine', 'engine/marketEngine',
  'orchestrator', 'engine/orchestrator',
  'Calc', 'calc', 'Calc.gs', 'calc.gs',
  'Reports', 'reports', 'Reports.gs', 'reports.gs',
  'Normalize', 'normalize', 'Normalize.gs', 'normalize.gs',
  'Data', 'data', 'Data.gs', 'data.gs',
  'PdfReports', 'PdfReports.gs',
  'ReportDTO', 'ReportDTO.gs',
  'main', 'main.gs'
];

function tryLoadFile_(filename) {
  try {
    var content = HtmlService.createHtmlOutputFromFile(filename).getContent();
    if (content && String(content).trim()) eval(content);
    return true;
  } catch (e) {
    Logger.log('Load ' + filename + ' failed: ' + e);
    return false;
  }
}

function loadAllEngines_() {
  for (var i = 0; i < ENGINE_CANDIDATES_.length; i++) {
    tryLoadFile_(ENGINE_CANDIDATES_[i]);
  }
}

loadAllEngines_();
var BUILD_INFO_ = new Date().toISOString();

function buildErrorHtml_(title, err, infoObj) {
  var msg = err && err.message ? String(err.message) : String(err || 'unknown');
  var stack = err && err.stack ? String(err.stack) : '';
  var info = '';
  try { info = JSON.stringify(infoObj || {}, null, 2); } catch (e) { info = String(infoObj || ''); }
  var html = ''
    + '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>' + String(title || 'WebApp Error') + '</title>'
    + '<style>body{font-family:Segoe UI,Arial,sans-serif;background:#111827;color:#f9fafb;padding:20px}pre{white-space:pre-wrap;background:#1f2937;padding:12px;border-radius:8px}h1{margin:0 0 12px}</style>'
    + '</head><body>'
    + '<h1>' + String(title || 'WebApp Error') + '</h1>'
    + '<p><b>build:</b> ' + BUILD_INFO_ + '</p>'
    + '<p><b>message:</b> ' + msg.replace(/</g, '&lt;') + '</p>'
    + '<h3>stack</h3><pre>' + stack.replace(/</g, '&lt;') + '</pre>'
    + '<h3>context</h3><pre>' + String(info).replace(/</g, '&lt;') + '</pre>'
    + '</body></html>';
  return HtmlService.createHtmlOutput(html).setTitle('Lumina WebApp Error');
}

// === 本地 fallback（在 Web App 作用域缺函数时兜底）===
var __g = this;

if (typeof __g._fmtNum !== 'function') {
  __g._fmtNum = function (n) {
    var x = Number(n);
    if (isNaN(x)) x = 0;
    return Math.round(Math.abs(x)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };
}

if (typeof __g._getSheetByName !== 'function') {
  __g._getSheetByName = function (ss, name) {
    try {
      return ss ? ss.getSheetByName(name) : null;
    } catch (e) {
      return null;
    }
  };
}

if (typeof __g.runStructureEngine !== 'function') {
  __g.runStructureEngine = function (input) {
    return { ok: true, source: 'fallback' };
  };
}

if (typeof __g.runLifecycleEngine !== 'function') {
  __g.runLifecycleEngine = function (cardsNormalized, bonusLifecycleRows, reportMonth) {
    return [];
  };
}

if (typeof __g.runMarketEngine !== 'function') {
  __g.runMarketEngine = function (cardsNormalized, catalogAll, promoCatalog, reportMonth) {
    return { topPromos: [], allPromos: [], activePromoCount: 0 };
  };
}

if (typeof __g.runOrchestrator !== 'function') {
  __g.runOrchestrator = function (structureResults, lifecycleResults, marketSignals, portfolioSummary) {
    return { decisionPlan: [], actionCandidates: [], keyNumbers: { currentNet: -12800, optimizedNet: 4600, delta: 17400 } };
  };
}

if (typeof __g.computePortfolioSummary !== 'function') {
  __g.computePortfolioSummary = function () {
    return { recurringNet: -12800, optimizedNet: 4600, unlock: 17400 };
  };
}

if (typeof __g.runFirstReport !== 'function') {
  __g.runFirstReport = function (ss) {
    return {
      keyNumbers: { currentNet: -12800, optimizedNet: 4600, delta: 17400 },
      focusItems: [
        { type: 'bleeding', cardName: 'Chase Ink Preferred', title: 'Routing issue', action: 'Shift ad spend routing this cycle.', impactUsd: 6200 },
        { type: 'bonus_not_collected', cardName: 'Amex Gold Business', title: 'Retention not actioned', action: 'Request retention offer this week.', impactUsd: 4100 },
        { type: 'other', cardName: 'Venture X Business', title: 'Redemption timing', action: 'Bundle redemptions for higher value.', impactUsd: 1350 }
      ]
    };
  };
}

if (typeof __g.runMonthlyReport !== 'function') {
  __g.runMonthlyReport = function (ss) {
    return {
      keyNumbers: { currentNet: -9300, optimizedNet: 5100, delta: 14400 },
      focusItems: [
        { type: 'bleeding', cardName: 'Ink Cash', title: 'Category mismatch', action: 'Move telecom spend to 5x bucket.', impactUsd: 4300 },
        { type: 'bonus_not_collected', cardName: 'Amex Business Gold', title: 'Offer window open', action: 'Submit retention request.', impactUsd: 3700 }
      ]
    };
  };
}

if (typeof __g.generateFirstPdf !== 'function') {
  __g.generateFirstPdf = function (ss, model) {
    return { fileUrl: '', message: 'First report generated in fallback mode.' };
  };
}

if (typeof __g.generateMonthlyPdf !== 'function') {
  __g.generateMonthlyPdf = function (ss, model) {
    return { fileUrl: '', message: 'Monthly report generated in fallback mode.' };
  };
}

if (typeof __g.deriveBonusLifecycleForPortfolio_ !== 'function') {
  __g.deriveBonusLifecycleForPortfolio_ = function () { return []; };
}
if (typeof __g.computeOneTimeBonusAtRisk_ !== 'function') {
  __g.computeOneTimeBonusAtRisk_ = function () { return 0; };
}
if (typeof __g.computeMissedBonusValue_ !== 'function') {
  __g.computeMissedBonusValue_ = function () { return 0; };
}
if (typeof __g.computeTotalPotentialThisYear_ !== 'function') {
  __g.computeTotalPotentialThisYear_ = function (recurring, risk) { return Number(recurring || 0) + Number(risk || 0); };
}

function localFirstModel_() {
  return {
    keyNumbers: { currentNet: -12800, optimizedNet: 4600, delta: 17400 },
    focusItems: [
      { type: 'bleeding', cardName: 'Chase Ink Preferred', title: 'Routing issue', action: 'Shift ad spend routing this cycle.', impactUsd: 6200 },
      { type: 'bonus_not_collected', cardName: 'Amex Gold Business', title: 'Retention not actioned', action: 'Request retention offer this week.', impactUsd: 4100 },
      { type: 'other', cardName: 'Venture X Business', title: 'Redemption timing', action: 'Bundle redemptions for higher value.', impactUsd: 1350 }
    ]
  };
}

function localMonthlyModel_() {
  return {
    keyNumbers: { currentNet: -9300, optimizedNet: 5100, delta: 14400 },
    focusItems: [
      { type: 'bleeding', cardName: 'Ink Cash', title: 'Category mismatch', action: 'Move telecom spend to 5x bucket.', impactUsd: 4300 },
      { type: 'bonus_not_collected', cardName: 'Amex Business Gold', title: 'Offer window open', action: 'Submit retention request.', impactUsd: 3700 }
    ]
  };
}

function safeRun_(fn, fallback) {
  try {
    return fn();
  } catch (e) {
    Logger.log('safeRun_ failed: ' + (e && e.stack ? e.stack : e));
    return typeof fallback === 'function' ? fallback(e) : fallback;
  }
}

function getMockReportData_(clientName, reportType) {
  var type = String(reportType || 'FIRST').toUpperCase() === 'MONTHLY' ? 'MONTHLY' : 'FIRST';
  var recurring = type === 'MONTHLY' ? -9300 : -12800;
  var optimized = type === 'MONTHLY' ? 5100 : 4600;
  return {
    client_name: String(clientName || 'Lumina Logic LLC'),
    report_type: type,
    tagline: 'Protecting your profits. Powering your business.',
    kpis: {
      recurring_net: recurring,
      recurring_fees: type === 'MONTHLY' ? 2600 : 2200,
      recurring_value: type === 'MONTHLY' ? -6700 : -10600,
      optimized_net: optimized,
      unlock: optimized - recurring
    },
    actions: [
      { card_name: type === 'MONTHLY' ? 'Ink Cash' : 'Chase Ink Preferred', issue_type: 'bleeding', title: 'This card is losing money', status: 'Review needed', action: 'Cancel or replace before the annual fee posts.', impact_usd: type === 'MONTHLY' ? 4300 : 6200, priority: 1 },
      { card_name: type === 'MONTHLY' ? 'Amex Business Gold' : 'Amex Gold Business', issue_type: 'prebonus', title: 'Review needed', status: 'Bonus completion is not confirmed.', action: 'Complete required spend and confirm bonus status.', impact_usd: type === 'MONTHLY' ? 3700 : 4100, priority: 2 },
      { card_name: 'Venture X Business', issue_type: 'other', title: 'Review needed', status: 'Review needed.', action: 'Review this item and take the best next step.', impact_usd: 1350, priority: 3 }
    ],
    promotions: [],
    portfolio: {
      cards: [],
      totals: {
        annual_fees: type === 'MONTHLY' ? 2600 : 2200,
        value: type === 'MONTHLY' ? -6700 : -10600,
        net: recurring
      }
    },
    generated_at: new Date().toISOString()
  };
}

function pickFirstNonEmpty_(arr, fallback) {
  for (var i = 0; i < (arr || []).length; i++) {
    var v = arr[i];
    if (v === null || v === undefined) continue;
    if (typeof v === 'string' && String(v).trim() === '') continue;
    return v;
  }
  return fallback;
}

function toNumberSafe_(v, fallback) {
  if (v === null || v === undefined || v === '') return fallback == null ? 0 : Number(fallback);
  if (typeof v === 'number') return isNaN(v) ? (fallback == null ? 0 : Number(fallback)) : v;
  var n = Number(String(v).replace(/[^0-9.\-]/g, ''));
  return isNaN(n) ? (fallback == null ? 0 : Number(fallback)) : n;
}

function safeSlice_(arr, n) {
  if (!Array.isArray(arr)) return [];
  return arr.slice(0, n || arr.length);
}

function pickClientNameForWeb_(ss, fallbackName) {
  return safeRun_(function () {
    if (typeof getCompanyName_ === 'function') {
      var c1 = getCompanyName_(ss);
      if (c1 && String(c1).trim()) return String(c1).trim();
    }
    if (typeof getClientName_ === 'function') {
      var c2 = getClientName_(ss);
      if (c2 && String(c2).trim()) return String(c2).trim();
    }
    var profile = _getSheetByName(ss, 'Company_Profile');
    if (profile && profile.getLastRow() >= 2) {
      var vals = profile.getRange(2, 1, profile.getLastRow() - 1, 2).getValues();
      for (var i = 0; i < vals.length; i++) {
        var k = vals[i][0] == null ? '' : String(vals[i][0]).trim().toLowerCase();
        var v = vals[i][1] == null ? '' : String(vals[i][1]).trim();
        if (!k || !v) continue;
        if (k === 'company name' || k === 'company_name' || k === 'business name' || k === 'client name' || k === 'business_name') {
          return v;
        }
      }
    }
    return String(fallbackName || 'Lumina Logic LLC');
  }, String(fallbackName || 'Lumina Logic LLC'));
}

function mapActionForBeautiful_(item, defaultLevel) {
  var it = item || {};
  var levelRaw = pickFirstNonEmpty_([it.level, it.priority, it.severity, it.type, it.isHigh === true ? 'HIGH' : (it.isHigh === false ? 'LOW' : '')], defaultLevel || 'LOW');
  var level = String(levelRaw || 'LOW').toUpperCase();
  if (level !== 'HIGH' && level !== 'LOW') {
    level = (level.indexOf('BLEED') >= 0 || level.indexOf('HIGH') >= 0 || level.indexOf('BONUS') >= 0) ? 'HIGH' : 'LOW';
  }
  return {
    level: level,
    card_name: String(pickFirstNonEmpty_([it.cardName, it.name, it.title], 'Action')),
    headline: String(pickFirstNonEmpty_([it.reason, it.problem, it.summary, it.desc, it.status, it.issueTitle], 'Review needed')),
    todo: String(pickFirstNonEmpty_([it.todo, it.action, it.recommendation, it.suggestion], 'Review this item and take the best next step.')),
    amount: (function () {
      var a = pickFirstNonEmpty_([it.amount, it.annualLoss, it.loss, it.impactUsd, it.delta], null);
      if (a === null || a === undefined || a === '') return null;
      return toNumberSafe_(a, null);
    })()
  };
}

function sortActionsForBeautiful_(actions) {
  var list = Array.isArray(actions) ? actions.slice() : [];
  list.sort(function (a, b) {
    var aw = String((a && a.level) || '').toUpperCase() === 'HIGH' ? 0 : 1;
    var bw = String((b && b.level) || '').toUpperCase() === 'HIGH' ? 0 : 1;
    if (aw !== bw) return aw - bw;
    var aa = Math.abs(toNumberSafe_(a && a.amount, 0));
    var ba = Math.abs(toNumberSafe_(b && b.amount, 0));
    return ba - aa;
  });
  return list;
}

function resolveKpiSet_(recurringRaw, optimizedRaw) {
  var recurring = toNumberSafe_(recurringRaw, 0);
  var optimized = toNumberSafe_(optimizedRaw, recurring);
  return {
    recurring_net: recurring,
    optimized_net: optimized,
    unlock: optimized - recurring
  };
}

function mapPromoForBeautiful_(promo, idx) {
  var p = promo || {};
  var palette = ['indigo', 'emerald', 'sky', 'amber'];
  return {
    tag: String(pickFirstNonEmpty_([p.tag, 'Promo Opportunity'], 'Promo Opportunity')),
    title: String(pickFirstNonEmpty_([p.title, p.cardName, p.card_name, 'Promotion'], 'Promotion')),
    desc: String(pickFirstNonEmpty_([p.desc, p.summary, p.promo_headline], '')),
    link: String(pickFirstNonEmpty_([p.link, p.url, p.affiliate_url], '')),
    color: String(pickFirstNonEmpty_([p.color, palette[idx % palette.length]], 'indigo'))
  };
}

function adaptFirstModelToBeautifulDTO_(firstModel, ctx) {
  var model = firstModel || {};
  var key = model.keyNumbers || {};
  var recurringRaw = pickFirstNonEmpty_([key.recurringNet, key.currentNet, model.recurringNet, model.currentNet, model.summary && model.summary.recurringNet], 0);
  var optimizedRaw = pickFirstNonEmpty_([key.optimizedNet, model.optimizedNet, model.summary && model.summary.optimizedNet], recurringRaw);
  var kpis = resolveKpiSet_(recurringRaw, optimizedRaw);

  var actionsRaw = safeSlice_(pickFirstNonEmpty_([model.priorityActions, model.items, model.focusItems], []), 6);
  var actions = sortActionsForBeautiful_(actionsRaw.map(function (x) { return mapActionForBeautiful_(x, 'LOW'); }));
  if (!actions.length) actions = getMockReportData_(ctx.clientName, 'FIRST').actions;

  return {
    client_name: String(ctx.clientName || 'Lumina Logic LLC'),
    report_type: 'FIRST',
    tagline: 'Protecting your profits. Powering your business.',
    kpis: kpis,
    actions: actions.slice(0, 6),
    generated_at: Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd')
  };
}

function adaptMonthlyModelToBeautifulDTO_(monthlyModel, ctx) {
  var model = monthlyModel || {};
  var ps = model.portfolio || model.portfolioSummary || {};
  var summary = model.summary || {};
  var recurringRaw = pickFirstNonEmpty_([ps.recurringNet, ps.currentNet, model.recurringNet, summary.recurringNet, summary.currentNet], 0);
  var optimizedRaw = pickFirstNonEmpty_([ps.optimizedNet, model.optimizedNet, summary.optimizedNet, recurringRaw], recurringRaw);
  var kpis = resolveKpiSet_(recurringRaw, optimizedRaw);
  var actionsRaw = safeSlice_(pickFirstNonEmpty_([model.itemsNeedingAttention, model.items, model.actions, model.focusItems], []), 6);
  var actions = sortActionsForBeautiful_(actionsRaw.map(function (x) { return mapActionForBeautiful_(x, 'LOW'); }));
  if (!actions.length) actions = getMockReportData_(ctx.clientName, 'MONTHLY').actions;
  return {
    client_name: String(ctx.clientName || 'Lumina Logic LLC'),
    report_type: 'MONTHLY',
    tagline: 'Protecting your profits. Powering your business.',
    kpis: kpis,
    actions: actions.slice(0, 6),
    generated_at: Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd')
  };
}

function buildBeautifulDataFromFirstModel_(firstModel, clientName) {
  var dto = adaptFirstModelToBeautifulDTO_(firstModel, { clientName: clientName });
  var model = firstModel || {};
  var promosRaw = safeSlice_(pickFirstNonEmpty_([model.promotions, model.topPromos], []), 4);
  dto.promotions = promosRaw.map(function (p, i) { return mapPromoForBeautiful_(p, i); });
  return dto;
}

function buildBeautifulDataFromMonthlyModel_(monthlyModel, clientName) {
  var dto = adaptMonthlyModelToBeautifulDTO_(monthlyModel, { clientName: clientName });
  var model = monthlyModel || {};
  var promosRaw = safeSlice_(pickFirstNonEmpty_([model.promotions, model.topPromos], []), 4);
  dto.promotions = promosRaw.map(function (p, i) { return mapPromoForBeautiful_(p, i); });
  return dto;
}

function doGet(e) {
  try {
    var view = 'beautiful';
    var type = 'FIRST';
    var autoRun = '';
    if (e && e.parameter && e.parameter.view) view = String(e.parameter.view).toLowerCase();
    if (e && e.parameter && e.parameter.type) type = String(e.parameter.type).toUpperCase() === 'MONTHLY' ? 'MONTHLY' : 'FIRST';
    if (e && e.parameter && e.parameter.autorun) autoRun = String(e.parameter.autorun);
    Logger.log('[WebApp][doGet] view=%s type=%s autorun=%s build=%s', view, type, autoRun, BUILD_INFO_);

    try {
      var tmpl = HtmlService.createTemplateFromFile('BeautifulReportUI');
      tmpl.initialType = type;
      tmpl.initialAutoRun = autoRun;
      tmpl.buildInfo = BUILD_INFO_;
      Logger.log('[WebApp][doGet] return=BeautifulReportUI');
      return tmpl
        .evaluate()
        .setTitle('Lumina Beautiful Report')
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    } catch (err2) {
      Logger.log('[WebApp][doGet] beautiful-evaluate-error=' + (err2 && err2.message ? err2.message : err2));
      return buildErrorHtml_('Beautiful Route Error', err2, { build: BUILD_INFO_, params: e && e.parameter ? e.parameter : {}, serviceUrl: safeRun_(function(){ return ScriptApp.getService().getUrl(); }, ''), template: 'BeautifulReportUI' });
    }
  } catch (outerErr) {
    Logger.log('[WebApp][doGet] outer-error=' + (outerErr && outerErr.message ? outerErr.message : outerErr));
    return buildErrorHtml_('WebApp doGet Error', outerErr, { build: BUILD_INFO_, params: e && e.parameter ? e.parameter : {}, serviceUrl: safeRun_(function(){ return ScriptApp.getService().getUrl(); }, '') });
  }
}

function getBeautifulReportData(clientName, type) {
  return safeRun_(function () {
    var data = generateReportDataForWeb(clientName, type);
    Logger.log('[WebApp][getBeautifulReportData] source=real type=%s hasActions=%s', String(type || 'FIRST'), !!(data && data.actions && data.actions.length));
    return data;
  }, function () {
    var t = String(type || 'FIRST').toUpperCase();
    Logger.log('[WebApp][getBeautifulReportData] source=fallback type=%s', t);
    return getMockReportData_(clientName, t === 'MONTHLY' ? 'MONTHLY' : 'FIRST');
  });
}

function generateReportDataForWeb(clientName, type) {
  return safeRun_(function () {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var mode = String(type || 'FIRST').toUpperCase() === 'MONTHLY' ? 'MONTHLY' : 'FIRST';
    var cname = pickClientNameForWeb_(ss, clientName || 'Lumina Logic LLC');
    if (mode === 'MONTHLY') {
      var monthlyModel = safeRun_(function () { return runMonthlyReport(ss); }, function () { return localMonthlyModel_(); });
      if (typeof buildReportDTOFromMonthlyModel_ === 'function') return buildReportDTOFromMonthlyModel_(monthlyModel, { clientName: cname });
      return getMockReportData_(cname, 'MONTHLY');
    }
    var firstModel = safeRun_(function () { return runFirstReport(ss); }, function () { return localFirstModel_(); });
    if (typeof buildReportDTOFromFirstModel_ === 'function') return buildReportDTOFromFirstModel_(firstModel, { clientName: cname });
    return getMockReportData_(cname, 'FIRST');
  }, function () {
    var mode2 = String(type || 'FIRST').toUpperCase() === 'MONTHLY' ? 'MONTHLY' : 'FIRST';
    return getMockReportData_(clientName, mode2 === 'MONTHLY' ? 'MONTHLY' : 'FIRST');
  });
}

function generateReportForWeb(mode) {
  return safeRun_(function () {
    var t = String(mode || 'FIRST').toUpperCase() === 'MONTHLY' ? 'MONTHLY' : 'FIRST';
    Logger.log('[WebApp][generateReportForWeb] start type=%s', t);
    var out = generatePdfForWeb_(t) || {};
    out.ok = true;
    out.type = t;
    if (!out.mockData) out.mockData = getMockReportData_('Lumina Logic LLC', t);
    Logger.log('[WebApp][generateReportForWeb] done type=%s ok=%s hasFileUrl=%s forcePreviewDownload=%s fields=%s', t, out.ok, !!out.fileUrl, out.forcePreviewDownload, Object.keys(out).join(','));
    return out;
  }, function (e) {
    var t2 = String(mode || 'FIRST').toUpperCase() === 'MONTHLY' ? 'MONTHLY' : 'FIRST';
    var out = {
      ok: true,
      type: t2,
      fileUrl: '',
      forcePreviewDownload: true,
      message: t2 + ' fallback success: ' + (e && e.message ? String(e.message) : 'unknown'),
      mockData: getMockReportData_('Lumina Logic LLC', t2)
    };
    Logger.log('[WebApp][generateReportForWeb] fallback type=%s ok=%s hasFileUrl=%s forcePreviewDownload=%s', t2, out.ok, !!out.fileUrl, out.forcePreviewDownload);
    return out;
  });
}

function generateFirstReportForWeb() {
  return generateReportForWeb('FIRST');
}

function generateMonthlyReportForWeb() {
  return generateReportForWeb('MONTHLY');
}

function generateFirstLegacyPdfForWeb() {
  Logger.log('[WebApp][generateFirstLegacyPdfForWeb] start');
  return generatePdfForWeb_('FIRST');
}

function generateMonthlyLegacyPdfForWeb() {
  Logger.log('[WebApp][generateMonthlyLegacyPdfForWeb] start');
  return generatePdfForWeb_('MONTHLY');
}

function generatePdfForWeb_(mode) {
  return safeRun_(function () {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var reportsSheet = safeRun_(function () { return _getSheetByName(ss, SHEET_REPORTS || 'Debug'); }, null);
    var isMonthly = String(mode) === 'MONTHLY';

    if (reportsSheet) {
      safeRun_(function () { reportsSheet.getRange('B3').setValue('RUNNING'); }, null);
      safeRun_(function () { reportsSheet.getRange('B4').clearContent(); }, null);
    }

    var usedFallbackModel = false;
    var model = safeRun_(function () {
      return isMonthly ? runMonthlyReport(ss) : runFirstReport(ss);
    }, function () {
      usedFallbackModel = true;
      return isMonthly ? localMonthlyModel_() : localFirstModel_();
    });

    var usedFallbackPdf = false;
    var pdfRes = safeRun_(function () {
      return isMonthly ? generateMonthlyPdf(ss, model) : generateFirstPdf(ss, model);
    }, function () {
      usedFallbackPdf = true;
      return isMonthly
        ? { fileUrl: '', message: 'Monthly generated in local fallback mode.' }
        : { fileUrl: '', message: 'First generated in local fallback mode.' };
    }) || {};

    if (reportsSheet) {
      safeRun_(function () { reportsSheet.getRange('B5').setValue((isMonthly ? 'Monthly' : 'First') + ' PDF: ' + (pdfRes.fileUrl || 'fallback-no-url')); }, null);
      safeRun_(function () { reportsSheet.getRange('B3').setValue('DONE'); }, null);
      safeRun_(function () { reportsSheet.getRange('E1').setValue(new Date()); }, null);
      safeRun_(function () { reportsSheet.getRange('E3').setValue(isMonthly ? 'MONTHLY' : 'FIRST'); }, null);
      if (!pdfRes.fileUrl) {
        safeRun_(function () {
          reportsSheet.getRange('B4').setValue(
            'PDF link unavailable. Report model generated but export did not return a file URL. '
            + 'Check template access (Google Docs), Drive permissions, and OUTPUT_FOLDER_ID settings.'
          );
        }, null);
      }
    }

    var out = {
      ok: true,
      type: isMonthly ? 'MONTHLY' : 'FIRST',
      fileUrl: pdfRes.fileUrl ? String(pdfRes.fileUrl) : '',
      forcePreviewDownload: !(pdfRes && pdfRes.fileUrl),
      message: pdfRes.message ? String(pdfRes.message) : 'Report generated successfully.',
      mockData: isMonthly
        ? getMockReportData_('Lumina Logic LLC', 'MONTHLY')
        : getMockReportData_('Lumina Logic LLC', 'FIRST')
    };
    Logger.log('[WebApp][generatePdfForWeb_] mode=%s modelPath=%s pdfPath=%s fileUrlEmpty=%s', isMonthly ? 'MONTHLY' : 'FIRST', usedFallbackModel ? 'fallback' : 'main', usedFallbackPdf ? 'fallback' : 'main', !out.fileUrl);
    return out;
  }, function (e) {
    var out = {
      ok: true,
      type: String(mode) === 'MONTHLY' ? 'MONTHLY' : 'FIRST',
      fileUrl: '',
      forcePreviewDownload: true,
      message: 'Fallback completed: ' + (e && e.message ? String(e.message) : 'unknown'),
      mockData: String(mode) === 'MONTHLY'
        ? getMockReportData_('Lumina Logic LLC', 'MONTHLY')
        : getMockReportData_('Lumina Logic LLC', 'FIRST')
    };
    Logger.log('[WebApp][generatePdfForWeb_] hard-fallback mode=%s err=%s', out.type, e && e.message ? e.message : String(e));
    return out;
  });
}

function formatUsdForWeb_(num) {
  var n = Number(num);
  if (isNaN(n)) n = 0;
  var abs = Math.round(Math.abs(n)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return n < 0 ? '-$' + abs : '$' + abs;
}

function formatUsdSignedForWeb_(num) {
  var n = Number(num);
  if (isNaN(n)) n = 0;
  var abs = Math.round(Math.abs(n)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return (n >= 0 ? '+$' : '-$') + abs;
}
