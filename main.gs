/**
 * @file main.gs
 */

function doGet(e) {
  return HtmlService.createHtmlOutputFromFile('index').setTitle('Lumina Business Card');
}

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Card Profit Watch')
    .addItem('Generate First Wake-up Report', 'generateFirstReport')
    .addItem('Generate Monthly Health Report', 'generateMonthlyReport')
    .addItem('Run Alerts Check', 'runAlertsCheck')
    .addSeparator()
    .addItem('Admin: Setup Dev/Test View', 'setupDevTestView')
    .addItem('Admin: Setup Customer View', 'setupCustomerView')
    .addSeparator()
    .addItem('Confirm No Change (All Active Cards)', 'confirmNoChange')
    .addToUi();
}

function openPdfDialog_(url) {
  var safeUrl = String(url || '').replace(/"/g, '&quot;');
  SpreadsheetApp.getUi().showModalDialog(
    HtmlService.createHtmlOutput('<script>window.open("' + safeUrl + '");google.script.host.close();</script>').setWidth(120).setHeight(80),
    'Opening PDF...'
  );
}

function generateFirstReport() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  Logger.log(
    '[RUN] action=GenerateFirstWakeupReport ts=%s DATA_ENV=%s REPORT_MONTH_OVERRIDE=%s',
    new Date(),
    String((DECISION_CONFIG && DECISION_CONFIG.DATA_ENV) || ''),
    String((DECISION_CONFIG && DECISION_CONFIG.REPORT_MONTH_OVERRIDE) || '')
  );
  var reportsSheet = _getSheetByName(ss, 'Reports');
  try {
    if (reportsSheet) {
      reportsSheet.getRange('B3').setValue('RUNNING');
      reportsSheet.getRange('B4').clearContent();
    }
    var firstModel = runFirstReport(ss);
    var pdfRes = generateFirstPdf(ss, firstModel);
    if (reportsSheet && pdfRes && pdfRes.fileUrl) reportsSheet.getRange('B5').setValue('First PDF: ' + pdfRes.fileUrl);
    if (pdfRes && pdfRes.fileUrl) openPdfDialog_(pdfRes.fileUrl);
    if (reportsSheet) {
      reportsSheet.getRange('B3').setValue('DONE');
      reportsSheet.getRange('E1').setValue(new Date());
      reportsSheet.getRange('E3').setValue('FIRST');
    }
  } catch (e) {
    Logger.log(e);
    if (reportsSheet) {
      reportsSheet.getRange('B3').setValue('ERROR');
      reportsSheet.getRange('B4').setValue('ERROR: First PDF export failed - ' + (e.message || String(e)));
    }
    SpreadsheetApp.getUi().alert('First report PDF failed: ' + (e.message || String(e)));
  }
}

function generateMonthlyReport() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  Logger.log(
    '[RUN] action=GenerateMonthlyHealthReport ts=%s DATA_ENV=%s REPORT_MONTH_OVERRIDE=%s',
    new Date(),
    String((DECISION_CONFIG && DECISION_CONFIG.DATA_ENV) || ''),
    String((DECISION_CONFIG && DECISION_CONFIG.REPORT_MONTH_OVERRIDE) || '')
  );
  var reportsSheet = _getSheetByName(ss, 'Reports');
  try {
    if (reportsSheet) {
      reportsSheet.getRange('B3').setValue('RUNNING');
      reportsSheet.getRange('B4').clearContent();
    }
    var monthlyModel = runMonthlyReport(ss);
    var pdfRes = generateMonthlyPdf(ss, monthlyModel);
    if (reportsSheet && pdfRes && pdfRes.fileUrl) reportsSheet.getRange('B5').setValue('Monthly PDF: ' + pdfRes.fileUrl);
    if (pdfRes && pdfRes.fileUrl) openPdfDialog_(pdfRes.fileUrl);
    if (reportsSheet) {
      reportsSheet.getRange('B3').setValue('DONE');
      reportsSheet.getRange('E1').setValue(new Date());
      reportsSheet.getRange('E3').setValue('MONTHLY');
    }
  } catch (e) {
    Logger.log(e);
    if (reportsSheet) {
      reportsSheet.getRange('B3').setValue('ERROR');
      reportsSheet.getRange('B4').setValue('ERROR: Monthly PDF export failed - ' + (e.message || String(e)));
    }
    SpreadsheetApp.getUi().alert('Monthly report PDF failed: ' + (e.message || String(e)));
  }
}

function runAlertsCheck() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var reportsSheet = _getSheetByName(ss, 'Reports');
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
      reportsSheet.getRange('B4').setValue(e.message || String(e));
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
