/*
  send_email_merge20060302.js
  说明：包含将 HTML 邮件功能合并到目标分支时需要复制的三处代码片段。
  使用方法：打开目标分支对应文件，按注释指示复制粘贴相应代码块。
  生成日期：2026-03-02
*/

/* ======================================================
   PART 1 — appsscript.json: add send_mail scope
   将下面这行加入到 appsscript.json 的 oauthScopes 数组中：
   (将其并入现有数组，避免重复)
   ====================================================== */

// "https://www.googleapis.com/auth/script.send_mail"


/* ======================================================
   PART 2 — main.gs: sendReportEmail implementation
   将此函数替换或新增到 main.gs 中（确保 getReportRecipient_() 存在）
   ====================================================== */

/*
function sendReportEmail(body, htmlBody, subject) {
  var to = getReportRecipient_();
  if (!to) {
    throw new Error('No email recipient configured in Config!A2');
  }
  // subject is fixed to 'Credit Card Health Check Report' regardless of passed value
  var subj = 'Credit Card Health Check Report';
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
*/


/* ======================================================
   PART 3 — BeautifulReportUI.html: client HTML builder + sendEmail
   将下面两段代码插入到页面脚本内（确保辅助函数存在）
   - buildEmailHtml(dto)
   - sendEmail()
  (also add a button with id="sendEmailBtn" next to downloadBtn and wire it in initPage)
/* buildEmailHtml(dto) */
/*
function buildEmailHtml(dto){
  var k = dto.kpis || {};
  var t = dto.portfolio && dto.portfolio.totals ? dto.portfolio.totals : {};
  var html = '';
  html += '<div style="font-family:Segoe UI,Arial,sans-serif;color:#0f172a;">';
  html += '<h2 style="margin:0 0 8px;">' + safeText(dto.client_name||'') + ' - ' + safeText(dto.report_type||'') + '</h2>';
  html += '<div style="color:#64748b;font-size:13px;margin-bottom:12px;">Generated: ' + safeText(formatIso(dto.generated_at)) + '</div>';
  html += '<table style="width:100%;border-collapse:collapse;margin-bottom:12px;">';
  html += '<tr><td style="padding:6px;border:1px solid #eef2f7;font-weight:700;">Keep current (12-month net)</td><td style="padding:6px;border:1px solid #eef2f7;text-align:right;">' + safeText(formatUsd(k.recurring_net||0)) + '</td></tr>';
  html += '<tr><td style="padding:6px;border:1px solid #eef2f7;font-weight:700;">After fixes (12-month net)</td><td style="padding:6px;border:1px solid #eef2f7;text-align:right;">' + safeText(formatUsdOrDash(k.optimized_net)) + '</td></tr>';
  html += '<tr><td style="padding:6px;border:1px solid #eef2f7;font-weight:700;">Unlock (12-month delta)</td><td style="padding:6px;border:1px solid #eef2f7;text-align:right;">' + safeText(formatUsdOrDash(k.unlock)) + '</td></tr>';
  html += '</table>';
  html += '<div style="margin-bottom:8px;"><strong>Top actions</strong></div>';
  var actions = dto.actions || [];
  if (!actions.length) {
    html += '<div style="color:#64748b;">No urgent actions.</div>';
  } else {
    html += '<ul>' + actions.slice(0,5).map(function(a){ return '<li>' + (a.priority!=null?('P'+safeText(String(a.priority))+' '):'') + safeText(a.card_name||'') + ' - ' + safeText(a.action||a.title||'Review') + ' (' + safeText(formatUsd(a.impact_usd||0)) + ')</li>'; }).join('') + '</ul>';
  }
  html += '<div style="margin-top:12px;"><strong>Portfolio totals</strong></div>';
  html += '<div>Fees: <strong>' + safeText(formatUsd(t.annual_fees||0)) + '</strong> | Value: <strong>' + safeText(formatUsd(t.value||0)) + '</strong> | Net: <strong>' + safeText(formatUsd(t.net||0)) + '</strong></div>';
  html += '<div style="margin-top:12px;"><strong>Promotions</strong></div>';
  var promos = dto.promotions || [];
  if (!promos.length) {
    html += '<div style="color:#64748b;">No active promotions.</div>';
  } else {
    html += '<ul>' + promos.slice(0,5).map(function(p){ return '<li>' + safeText(p.promo_headline||p.card_name||'Promotion') + ' — end: ' + safeText(p.promo_end_date||'-') + '</li>'; }).join('') + '</ul>';
  }
  html += '<hr style="border:none;border-top:1px solid #eef2f7;margin:12px 0;" />';
  html += '<div style="font-size:12px;color:#64748b;">12-month net = estimated value - annual fees (recurring only).<br/>Optimized net and unlock are estimates based on suggested actions.</div>';
  html += '</div>';
  return html;
}
*/

/* sendEmail() */
/*
function sendEmail(){
  var dto=LAST_RENDERED_DATA||normalizeDto(FALLBACK_REPORT_DATA);
  var body=buildEmailBody(dto);
  var html = buildEmailHtml ? buildEmailHtml(dto) : '<pre>' + safeText(body) + '</pre>';
  setStatus('Sending email...');
  google.script.run
    .withSuccessHandler(function(res){ setStatus('Email sent'); })
    .withFailureHandler(function(err){
        var msg = (err && err.message) ? err.message : 'unknown';
        setStatus('Email failed: ' + msg);
        showDebug('sendEmail failed', err);
    })
    .sendReportEmail(body, html, dto.report_type);
}
*/

/* EOF */
