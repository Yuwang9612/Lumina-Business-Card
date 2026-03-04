# 合并 email 功能说明

下面是把“HTML 邮件发送”功能合并到目标分支时需复制的文件与代码片段（直接复制粘贴到目标分支对应文件）：

---

## 1. 文件: [appsscript.json](appsscript.json)

- 复制内容：在 `oauthScopes` 数组中确保包含以下 scope（与现有 scopes 合并，不要重复）：

```json
"https://www.googleapis.com/auth/script.send_mail"
```

> 说明：此 scope 允许使用 `MailApp.sendEmail` 发送邮件。合并后需要在运行时重新授权。

---

## 2. 文件: [main.gs](main.gs)

- 复制/替换内容：用下面的 `sendReportEmail` 实现替换或新增（保持 `getReportRecipient_()` 存在）：

```js
function sendReportEmail(body, htmlBody, reportType) {
  var to = getReportRecipient_();
  if (!to) {
    throw new Error('No email recipient configured in Config!A2');
  }
  var subj = 'Credit Card Health Check Report';
  if (reportType) subj += ' - ' + String(reportType);
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
```

- 说明：函数从 `Config!A2` 读取收件人；同时发送纯文本与 HTML（若提供）。

---

## 3. 文件: [BeautifulReportUI.html](BeautifulReportUI.html)

将以下两段脚本插入或替换到页面脚本中（保持页面中已有的辅助函数：`safeText`、`formatIso`、`formatUsd`、`formatUsdOrDash`、`normalizeDto`、`buildEmailBody`、`LAST_RENDERED_DATA` 等不变）。

### A) `buildEmailHtml(dto)`（HTML 生成器）

```js
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
```

### B) `sendEmail()`（发送调用）

```js
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
```

- 说明：如果 `buildEmailHtml` 不存在，客户端会回退为带 `<pre>` 的纯文本。确保 `google.script.run` 可用（在 Apps Script 对话中）。

---

## 4. 合并后注意事项（运行时）

- 在目标环境打开 Sheets 对话时会弹出权限授权提示，**必须接受 `script.send_mail` 权限**，否则会报权限不足错误。 
- 收件人由 `Config!A2` 提供，合并前请确认该单元格已配置有效邮箱地址。
- 如果看到权限错误：确认部署（或 `clasp push`）已将更新的 `appsscript.json` 推送到项目，并在 UI 中完成授权。
- 测试步骤：打开对话 -> 点击 `Send Email` -> 检查 `Config!A2` 收到 HTML 邮件。

---

如需我把以上内容另存为补丁文件（可直接复制到目标分支对应文件）或生成单独的纯文本片段便于粘贴，请告诉我。