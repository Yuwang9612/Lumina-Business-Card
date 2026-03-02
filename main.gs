/**
 * @file main.gs
 */

function doGetLegacy_(e) {
  return HtmlService.createHtmlOutputFromFile('index').setTitle('Lumina Business Card');
}

function onOpen() {
  var menu = SpreadsheetApp.getUi()
    .createMenu('Card Profit Watch')
    .addItem('Generate First Wake Up Report', 'generateFirstReport')
    .addItem('Generate Monthly Health Check Report', 'generateMonthlyReport');

  if (isAdminUser_()) {
    menu.addSeparator()
      .addItem('Set Admin View', 'setupAdminView')
      .addItem('Set Customer View', 'setupCustomerView')
      .addItem('Admin: Migrate Core Sheets To Production', 'migrateCoreSheetsToProduction');
  }
  menu.addToUi();
}

function isAdminUser_() {
  var me = '';
  try { me = String(Session.getActiveUser().getEmail() || '').trim().toLowerCase(); } catch (e) {}
  if (!me) return false;
  var raw = '';
  try { raw = String(PropertiesService.getScriptProperties().getProperty('ADMIN_EMAILS') || '').trim(); } catch (e2) {}
  if (!raw) return false;
  var admins = raw.split(',').map(function(x){ return String(x || '').trim().toLowerCase(); }).filter(function(x){ return !!x; });
  return admins.indexOf(me) >= 0;
}

function openBeautiful_(type) {
  var t = String(type || 'FIRST').toUpperCase() === 'MONTHLY' ? 'MONTHLY' : 'FIRST';
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

function generateFirstReport() {
  openBeautiful_('FIRST');
}

function generateMonthlyReport() {
  openBeautiful_('MONTHLY');
}

function generateFirstReportLegacy_() {
  openBeautiful_('FIRST');
}

function generateMonthlyReportLegacy_() {
  openBeautiful_('MONTHLY');
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
