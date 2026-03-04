/**
 * @file main.gs
 */

function doGetLegacy_(e) {
  return HtmlService.createHtmlOutputFromFile('index').setTitle('Lumina Business Card');
}

function onOpen() {
  var menu = SpreadsheetApp.getUi()
    .createMenu('Card Profit Watch')
    .addItem('Customer Credit Card Dashboard', 'generateDashboardReport');
  menu.addToUi();
}

function isAdminUser_() {
  var me = '';
  try { me = String(Session.getActiveUser().getEmail() || '').trim().toLowerCase(); } catch (e) {}
  if (!me) {
    try { me = String(Session.getEffectiveUser().getEmail() || '').trim().toLowerCase(); } catch (e3) {}
  }
  var raw = '';
  try { raw = String(PropertiesService.getScriptProperties().getProperty('ADMIN_EMAILS') || '').trim(); } catch (e2) {}
  // Keep behavior aligned with _assertAdminOnly_ in AdminTools.gs:
  // if ADMIN_EMAILS is not configured, do not hide admin menu actions.
  if (!raw) return true;
  if (!me) return false;
  var admins = raw
    .split(/[,\n;，；]/)
    .map(function(x){ return String(x || '').trim().toLowerCase().replace(/^["']|["']$/g, ''); })
    .filter(function(x){ return !!x; });
  return admins.indexOf(me) >= 0;
}

function hasAdminMenuOverride_() {
  try {
    return String(PropertiesService.getUserProperties().getProperty('ADMIN_MENU_OVERRIDE') || '') === '1';
  } catch (e) {
    return false;
  }
}

// Fallback when Google account email is unavailable to Session APIs.
// Set script property ADMIN_MENU_OVERRIDE_SECRET first, then run this once.
function enableAdminMenuOverride(secret) {
  var expected = '';
  try { expected = String(PropertiesService.getScriptProperties().getProperty('ADMIN_MENU_OVERRIDE_SECRET') || '').trim(); } catch (e) {}
  if (!expected) throw new Error('Missing Script Property: ADMIN_MENU_OVERRIDE_SECRET');
  if (String(secret || '').trim() !== expected) throw new Error('Invalid admin override secret.');
  PropertiesService.getUserProperties().setProperty('ADMIN_MENU_OVERRIDE', '1');
  return 'ADMIN_MENU_OVERRIDE enabled for current user';
}

function disableAdminMenuOverride() {
  PropertiesService.getUserProperties().deleteProperty('ADMIN_MENU_OVERRIDE');
  return 'ADMIN_MENU_OVERRIDE disabled for current user';
}

function debugAdminAccess() {
  var meActive = '';
  var meEffective = '';
  try { meActive = String(Session.getActiveUser().getEmail() || '').trim().toLowerCase(); } catch (e) {}
  try { meEffective = String(Session.getEffectiveUser().getEmail() || '').trim().toLowerCase(); } catch (e2) {}
  var me = meActive || meEffective || '';
  var raw = '';
  try { raw = String(PropertiesService.getScriptProperties().getProperty('ADMIN_EMAILS') || '').trim(); } catch (e3) {}
  var admins = raw
    .split(/[,\n;，；]/)
    .map(function(x){ return String(x || '').trim().toLowerCase(); })
    .filter(function(x){ return !!x; });
  var result = [
    'ActiveUser: ' + (meActive || '(empty)'),
    'EffectiveUser: ' + (meEffective || '(empty)'),
    'Resolved user: ' + (me || '(empty)'),
    'ADMIN_EMAILS raw: ' + (raw || '(empty)'),
    'ADMIN_EMAILS parsed: ' + (admins.join(' | ') || '(empty)'),
    'isAdminUser_: ' + (isAdminUser_() ? 'true' : 'false')
  ].join('\n');
  SpreadsheetApp.getUi().alert(result);
  return result;
}

function openBeautiful_(type) {
  var t = 'DASHBOARD';
  // Render UI directly inside Sheets dialog to avoid broken external URL routing.
  var tmpl = HtmlService.createTemplateFromFile('BeautifulReportUI');
  tmpl.initialType = t;
  tmpl.initialAutoRun = '1';
  tmpl.buildInfo = 'dialog-' + new Date().toISOString();
  SpreadsheetApp.getUi().showModalDialog(
    tmpl.evaluate().setWidth(1100).setHeight(700),
    'Credit Card Health Check Report'
  );
}

function normalizeWebAppExecUrl_(url) {
  var u = String(url || '').trim();
  if (!u) return '';
  if (u.indexOf('drive.google.com') >= 0) return '';
  if (u.indexOf('script.google.com/macros/s/') === -1) return '';
  if (u.indexOf('/dev') > -1) u = u.replace('/dev', '/exec');
  if (u.indexOf('/exec') === -1 && u.indexOf('/macros/s/') > -1) {
    if (u.lastIndexOf('/') !== u.length - 1) u += '/';
    u += 'exec';
  }
  return u;
}

function openPdfDialog_(url) {
  var safeUrl = String(url || '').replace(/"/g, '&quot;');
  SpreadsheetApp.getUi().showModalDialog(
    HtmlService.createHtmlOutput('<script>window.open("' + safeUrl + '");google.script.host.close();</script>').setWidth(120).setHeight(80),
    'Opening PDF...'
  );
}

// -----------------------------------------------------------------------------
// Email helper (Script Properties only)
// -----------------------------------------------------------------------------
function getReportRecipient_(){
  var raw = '';
  try {
    raw = String(PropertiesService.getScriptProperties().getProperty('REPORT_RECIPIENTS') || '').trim();
  } catch (e) {
    raw = '';
  }
  if (!raw) return '';
  var recipients = raw
    .split(/[,\n;，；]/)
    .map(function(x){ return String(x || '').trim(); })
    .filter(function(x){ return !!x; });
  return recipients.join(',');
}

function sendReportEmail(body, htmlBody, subject) {
  var to = getReportRecipient_();
  if (!to) {
    throw new Error('No email recipient configured in Script Properties: REPORT_RECIPIENTS');
  }
  // allow caller to supply full subject; normally passed document.title from client
  var subj = subject || 'Credit Card Health Check Report';
  try {
    MailApp.sendEmail({
      to: to,
      subject: subj,
      body: body || '',
      htmlBody: htmlBody || body || ''
    });
  } catch (e) {
    throw new Error('MailApp error while sending email: ' + (e && e.message ? e.message : String(e)));
  }
  return 'sent';
}

// One-time setup helper for onboarding / auto-sale provisioning.
function initializeTenantSettings(config) {
  var c = config || {};
  var props = PropertiesService.getScriptProperties();
  if (c.adminEmails != null) props.setProperty('ADMIN_EMAILS', String(c.adminEmails).trim());
  if (c.reportRecipients != null) props.setProperty('REPORT_RECIPIENTS', String(c.reportRecipients).trim());
  if (c.templateMonthlyDocId != null) props.setProperty('TEMPLATE_MONTHLY_DOC_ID', String(c.templateMonthlyDocId).trim());
  if (c.templateFirstDocId != null) props.setProperty('TEMPLATE_FIRST_DOC_ID', String(c.templateFirstDocId).trim());
  if (c.templateDashboardDocId != null) props.setProperty('TEMPLATE_DASHBOARD_DOC_ID', String(c.templateDashboardDocId).trim());
  if (c.productionSpreadsheetId != null) props.setProperty('PRODUCTION_SPREADSHEET_ID', String(c.productionSpreadsheetId).trim());
  return 'initialized';
}

function generateFirstReport() {
  openBeautiful_('DASHBOARD');
}

function generateMonthlyReport() {
  openBeautiful_('DASHBOARD');
}

function generateDashboardReport() {
  openBeautiful_('DASHBOARD');
}

function generateFirstReportLegacy_() {
  openBeautiful_('DASHBOARD');
}

function generateMonthlyReportLegacy_() {
  openBeautiful_('DASHBOARD');
}

function runAlertsCheck() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var reportsSheet = _getSheetByName(ss, SHEET_REPORTS || 'Debug');
  try {
    if (reportsSheet) {
      reportsSheet.getRange('B3').setValue('RUNNING');
      reportsSheet.getRange('B4').clearContent();
    }
    runAlertsReport(ss);
    if (reportsSheet) {
      reportsSheet.getRange('B3').setValue('DONE');
      reportsSheet.getRange('E1').setValue(new Date());
      reportsSheet.getRange('E3').setValue('ALERTS');
    }
  } catch (e) {
    Logger.log(e);
    if (reportsSheet) {
      reportsSheet.getRange('B3').setValue('ERROR');
      reportsSheet.getRange('B4').setValue(
        'Error while running Alerts check. '
        + 'Please verify required tabs/headers (Company_Profile, Card_Assets, Card_Catalog, Promo_Catalog). '
        + 'Details: ' + (e && e.message ? e.message : String(e))
      );
    }
  }
}

function confirmNoChange() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var assetsSheet = _getSheetByName(ss, getSheetName_(SHEET_ASSETS));
  if (!assetsSheet) {
    SpreadsheetApp.getUi().alert('Card Assets sheet not found');
    return;
  }
  var lastRow = assetsSheet.getLastRow();
  if (lastRow < 2) {
    SpreadsheetApp.getUi().alert('No data rows found');
    return;
  }
  var lastCol = Math.max(assetsSheet.getLastColumn(), 10);
  var data = assetsSheet.getRange(1, 1, lastRow, lastCol).getValues();
  var headers = data[0];
  var statusCol = _headerIndex(headers, 'Status');
  if (statusCol < 0) statusCol = _headerIndex(headers, '状态');
  if (statusCol < 0) {
    for (var s = 0; s < headers.length; s++) {
      if (headers[s] != null && String(headers[s]).toLowerCase().indexOf('status') >= 0) { statusCol = s; break; }
    }
  }
  var confirmedCol = _headerIndex(headers, 'assets_last_confirmed');
  if (confirmedCol < 0) {
    confirmedCol = headers.length;
    assetsSheet.getRange(1, confirmedCol + 1).setValue('assets_last_confirmed');
  }
  var now = new Date();
  var updated = 0;
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (statusCol >= 0 && statusCol < row.length) {
      var statusVal = row[statusCol];
      var statusStr = (statusVal == null ? '' : String(statusVal)).replace(/\s/g, '').toLowerCase();
      if (statusStr.indexOf('inactive') >= 0 || statusStr.indexOf('closed') >= 0 || statusStr.indexOf('cancel') >= 0 || statusStr === 'no' || statusStr === '否') continue;
      assetsSheet.getRange(i + 1, confirmedCol + 1).setValue(now);
      updated++;
    }
  }
  SpreadsheetApp.getUi().alert('Updated assets_last_confirmed for ' + updated + ' active cards');
}
