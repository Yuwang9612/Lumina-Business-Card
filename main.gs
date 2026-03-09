/**
 * @file main.gs
 */

function doGetLegacy_(e) {
  return HtmlService.createHtmlOutputFromFile('index').setTitle('Lumina Business Card');
}

function onOpen() {
  ensureStartHereSheet_();
  var menu = SpreadsheetApp.getUi()
    .createMenu('Card Profit Watch')
    .addItem('Customer Credit Card Dashboard', 'generateDashboardReport')
    .addSeparator()
    .addItem('Set Customer View', 'setupCustomerView');
  if (isAdminUser_() || hasAdminMenuOverride_()) {
    menu
      .addItem('Set Admin View', 'setupAdminView')
      .addItem('Admin: Migrate Core Sheets To Production', 'migrateCoreSheetsToProduction');
  }
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
  // For menu visibility, do not show admin actions unless a whitelist exists or override is enabled.
  if (!raw) return false;
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

function setAdminEmails(adminEmails) {
  var raw = String(adminEmails || '').trim();
  if (!raw) throw new Error('adminEmails is required');
  PropertiesService.getScriptProperties().setProperty('ADMIN_EMAILS', raw);
  return 'ADMIN_EMAILS updated';
}

function clearAdminEmails() {
  PropertiesService.getScriptProperties().deleteProperty('ADMIN_EMAILS');
  return 'ADMIN_EMAILS cleared';
}

function bootstrapPrimaryAdmin_() {
  return setAdminEmails('yuwang9612@gmail.com');
}

function setPrimaryAdminEmail() {
  return setAdminEmails('yuwang9612@gmail.com');
}

function grantCurrentUserAdminMenu() {
  PropertiesService.getUserProperties().setProperty('ADMIN_MENU_OVERRIDE', '1');
  return 'ADMIN_MENU_OVERRIDE enabled for current user';
}

function generateFirstReport() {
  openBeautiful_('DASHBOARD');
}

function generateMonthlyReport() {
  openBeautiful_('DASHBOARD');
}

function generateDashboardReport() {
  ensureStartHereSheet_();
  openBeautiful_('DASHBOARD');
}

function ensureStartHereSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) return null;

  var sheet = ss.getSheetByName('Start_Here');
  var created = false;
  if (!sheet) {
    sheet = ss.insertSheet('Start_Here', 0);
    created = true;
  }

  if (sheet.getIndex() !== 1) {
    ss.setActiveSheet(sheet);
    ss.moveActiveSheet(1);
  }

  if (created) {
    populateStartHereSheet_(sheet);
  }
  return sheet;
}

function populateStartHereSheet_(sheet) {
  if (!sheet) return;

  sheet.clear();
  sheet.setHiddenGridlines(true);
  sheet.setFrozenRows(2);
  sheet.setColumnWidth(1, 140);
  sheet.setColumnWidth(2, 1100);

  var rows = [
    ['TITLE', 'Lumina Credit Reward'],
    ['SUBTITLE', 'Business Credit Card Portfolio Decision System for SMB Owners'],
    ['', ''],
    ['What this workbook is', '- Helps SMB owners evaluate the real 12-month economics of their business credit card portfolio\n- Identifies cards that may be underperforming, annual-fee pressure, bonus windows, and replacement opportunities\n- Produces one structured Dashboard view and PDF output'],
    ['How to use', '1. Complete Company_Profile\n2. Complete Card_Assets\n3. Review Card_Catalog and Promo_Catalog\n4. Generate Dashboard\n5. Update your card data regularly and regenerate Dashboard when needed'],
    ['Accuracy depends on data quality', '- Report accuracy depends on the accuracy, completeness, and timeliness of user-provided data\n- The system does not automatically read live issuer account data\n- If inputs are outdated or incomplete, conclusions may drift from reality\n- Better monthly data maintenance leads to more reliable Dashboard results'],
    ['Ongoing usage', '- This system is designed for both initial portfolio review and ongoing monthly monitoring\n- The same Dashboard surface is used over time\n- Re-running the Dashboard after data updates helps track fee risk, bonus progress, loss detection, and opportunity changes'],
    ['Disclaimer', '- This workbook provides decision support only\n- Output accuracy depends on user input quality and catalog freshness\n- Promotions and issuer policies may change at any time\n- One-time bonuses are shown separately and are not recurring annual value\n- This product does not provide legal, tax, accounting, or financial advice\n- Final decisions should be reviewed by the business owner']
  ];

  sheet.getRange(1, 1, rows.length, 2).setValues(rows);

  sheet.getRange('A1:B1').merge();
  sheet.getRange('A2:B2').merge();

  sheet.getRange('A1:B1')
    .setValue('Lumina Credit Reward')
    .setFontSize(22)
    .setFontWeight('bold')
    .setBackground('#EAF4EC')
    .setFontColor('#173F35')
    .setHorizontalAlignment('left')
    .setVerticalAlignment('middle');

  sheet.getRange('A2:B2')
    .setValue('Business Credit Card Portfolio Decision System for SMB Owners')
    .setFontSize(12)
    .setFontWeight('bold')
    .setBackground('#F6FBF7')
    .setFontColor('#34554B')
    .setHorizontalAlignment('left')
    .setVerticalAlignment('middle');

  sheet.getRange(4, 1, 5, 1)
    .setFontWeight('bold')
    .setFontColor('#173F35')
    .setVerticalAlignment('top');

  sheet.getRange(4, 2, 5, 1)
    .setWrap(true)
    .setVerticalAlignment('top')
    .setHorizontalAlignment('left');

  sheet.getRange(4, 1, 5, 2)
    .setBorder(true, true, true, true, true, true, '#D5E6D9', SpreadsheetApp.BorderStyle.SOLID);

  sheet.getRange('A1:B8').setFontFamily('Arial');
  sheet.getRange('A3:B8').setBackground('#FFFFFF');
  sheet.setRowHeight(1, 34);
  sheet.setRowHeight(2, 24);
  for (var row = 4; row <= 8; row++) {
    sheet.setRowHeight(row, 84);
  }
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
