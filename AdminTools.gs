/**
 * @file AdminTools.gs
 * One-click customer view setup: hide internal tabs and protect key tabs.
 */

function _writeSetupWarning_(ss, msg) {
  var reports = _getSheetByName(ss, SHEET_REPORTS || 'Reports');
  if (reports) reports.getRange('B4').setValue('WARNING: ' + msg);
}

function _tryHideSheet_(ss, sheetName) {
  var sh = _getSheetByName(ss, sheetName);
  if (!sh) return;
  if (!sh.isSheetHidden()) sh.hideSheet();
}

function _tryShowSheet_(ss, sheetName) {
  var sh = _getSheetByName(ss, sheetName);
  if (!sh) return;
  if (sh.isSheetHidden()) sh.showSheet();
}

function _tryProtectSheet_(ss, sheetName) {
  var sh = _getSheetByName(ss, sheetName);
  if (!sh) return;
  var p = sh.protect();
  p.setWarningOnly(false);
  var editors = p.getEditors();
  if (editors && editors.length) p.removeEditors(editors);
  try {
    var me = Session.getActiveUser().getEmail();
    if (me) p.addEditor(me);
  } catch (e) {}
}

function setupCustomerView() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var hideTabs = ['Snapshots', 'Monthly_Events', 'Promo_Catalog', 'Card Catalog', 'Card_Catalog', 'decisionConfig', 'AuditTrail'];
  var protectTabs = ['Card Assets', 'Card_Assets', 'Business Profile', 'Company_Profile', 'Reports'];
  var warns = [];

  for (var i = 0; i < hideTabs.length; i++) {
    try {
      _tryHideSheet_(ss, hideTabs[i]);
    } catch (e) {
      warns.push('hide ' + hideTabs[i] + ' failed: ' + (e.message || String(e)));
    }
  }

  for (var j = 0; j < protectTabs.length; j++) {
    try {
      _tryProtectSheet_(ss, protectTabs[j]);
    } catch (e2) {
      warns.push('protect ' + protectTabs[j] + ' failed: ' + (e2.message || String(e2)));
    }
  }

  if (warns.length > 0) _writeSetupWarning_(ss, warns.join(' | '));
  SpreadsheetApp.getUi().alert(warns.length > 0 ? 'Customer view setup completed with warnings. See Reports!B4.' : 'Customer view setup completed.');
}

function setupDevTestView() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var showTabs = [
    'Card Catalog',
    'Card_Catalog',
    'Promo_Catalog',
    'Promotions',
    'Snapshots',
    'Monthly_Events',
    'decisionConfig',
    'AuditTrail'
  ];
  var warns = [];

  for (var i = 0; i < showTabs.length; i++) {
    try {
      _tryShowSheet_(ss, showTabs[i]);
    } catch (e) {
      warns.push('show ' + showTabs[i] + ' failed: ' + (e.message || String(e)));
    }
  }

  if (warns.length > 0) _writeSetupWarning_(ss, warns.join(' | '));
  SpreadsheetApp.getUi().alert(warns.length > 0 ? 'Dev/Test view setup completed with warnings. See Reports!B4.' : 'Dev/Test view setup completed. Tabs are now visible.');
}
