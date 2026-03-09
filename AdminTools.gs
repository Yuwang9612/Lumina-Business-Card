/**
 * @file AdminTools.gs
 * One-click customer view setup: hide internal tabs and protect key tabs.
 */

var CUSTOMER_VISIBLE_TABS = ['Start_Here', 'Company_Profile', 'Card_Assets'];

function _allSheetNames_(ss) {
  var sheets = ss.getSheets();
  var out = [];
  for (var i = 0; i < sheets.length; i++) out.push(sheets[i].getName());
  return out;
}

function _hasSheet_(ss, name) {
  return !!_getSheetByName(ss, name);
}

function _firstExistingSheet_(ss, names) {
  for (var i = 0; i < names.length; i++) {
    var sh = _getSheetByName(ss, names[i]);
    if (sh) return sh;
  }
  return null;
}

function _writeSetupWarning_(ss, msg) {
  var reports = _getSheetByName(ss, SHEET_REPORTS || 'Debug');
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

function _assertAdminOnly_() {
  if (typeof hasAdminMenuOverride_ === 'function' && hasAdminMenuOverride_()) return true;
  var me = '';
  try { me = String(Session.getActiveUser().getEmail() || '').trim().toLowerCase(); } catch (e) {}
  if (!me) {
    try { me = String(Session.getEffectiveUser().getEmail() || '').trim().toLowerCase(); } catch (e3) {}
  }
  var props = PropertiesService.getScriptProperties();
  var raw = String(props.getProperty('ADMIN_EMAILS') || '').trim();
  if (!raw) return true; // If not configured, keep current behavior aligned with main.gs.
  if (!me) throw new Error('Admin check failed: active user email unavailable and no admin override is enabled.');
  var allowed = raw
    .split(/[,\n;，；]/)
    .map(function(x){ return String(x || '').trim().toLowerCase().replace(/^["']|["']$/g, ''); })
    .filter(function(x){ return !!x; });
  if (allowed.indexOf(me) === -1) throw new Error('Only admins can run this action.');
  return true;
}

function migrateCoreSheetsToProduction() {
  _assertAdminOnly_();
  var props = PropertiesService.getScriptProperties();
  var targetId = String(props.getProperty('PRODUCTION_SPREADSHEET_ID') || '').trim();
  if (!targetId) throw new Error('Missing script property: PRODUCTION_SPREADSHEET_ID');
  var source = SpreadsheetApp.getActiveSpreadsheet();
  var target = SpreadsheetApp.openById(targetId);
  var tabs = ['Company_Profile', 'Card_Assets', 'Card_Catalog', 'Promo_Catalog'];
  for (var i = 0; i < tabs.length; i++) {
    var name = tabs[i];
    var src = _getSheetByName(source, name);
    var dst = _getSheetByName(target, name);
    if (!src || !dst) throw new Error('Missing tab for migration: ' + name);
    dst.clearContents();
    var r = src.getDataRange();
    var values = r.getValues();
    if (values && values.length && values[0].length) {
      dst.getRange(1, 1, values.length, values[0].length).setValues(values);
    }
  }
  SpreadsheetApp.getUi().alert('Migration complete: Company_Profile/Card_Assets/Card_Catalog/Promo_Catalog copied to production spreadsheet.');
}

function setupCustomerView() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var allTabs = _allSheetNames_(ss);
  var visible = {};
  for (var v = 0; v < CUSTOMER_VISIBLE_TABS.length; v++) visible[CUSTOMER_VISIBLE_TABS[v]] = true;
  // Keep at least one sheet visible to avoid Apps Script hide errors.
  var firstVisible = _firstExistingSheet_(ss, CUSTOMER_VISIBLE_TABS);
  if (!firstVisible) {
    SpreadsheetApp.getUi().alert('Customer view failed: required sheet missing (Company_Profile or Card_Assets).');
    return;
  }

  var protectTabs = ['Card_Assets', 'Company_Profile'];
  var warns = [];

  for (var i = 0; i < allTabs.length; i++) {
    var tab = allTabs[i];
    try {
      if (visible[tab]) _tryShowSheet_(ss, tab);
      else _tryHideSheet_(ss, tab);
    } catch (e) {
      warns.push('toggle ' + tab + ' failed: ' + (e.message || String(e)));
    }
  }

  for (var j = 0; j < protectTabs.length; j++) {
    if (!_hasSheet_(ss, protectTabs[j])) continue;
    try {
      _tryProtectSheet_(ss, protectTabs[j]);
    } catch (e2) {
      warns.push('protect ' + protectTabs[j] + ' failed: ' + (e2.message || String(e2)));
    }
  }

  try { ss.setActiveSheet(firstVisible); } catch (e3) {}
  if (warns.length > 0) _writeSetupWarning_(ss, warns.join(' | '));
  SpreadsheetApp.getUi().alert(
    warns.length > 0
      ? 'Customer view setup completed with warnings. Only Company_Profile and Card_Assets are visible.'
      : 'Customer view setup completed. Only Company_Profile and Card_Assets are visible.'
  );
}

function setupAdminView() {
  _assertAdminOnly_();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var showTabs = _allSheetNames_(ss);
  var warns = [];

  for (var i = 0; i < showTabs.length; i++) {
    try {
      _tryShowSheet_(ss, showTabs[i]);
    } catch (e) {
      warns.push('show ' + showTabs[i] + ' failed: ' + (e.message || String(e)));
    }
  }

  if (warns.length > 0) _writeSetupWarning_(ss, warns.join(' | '));
  SpreadsheetApp.getUi().alert(warns.length > 0 ? 'Admin view setup completed with warnings.' : 'Admin view setup completed. All tabs are visible.');
}

// Backward-compatible alias.
function setupDevTestView() {
  return setupAdminView();
}
