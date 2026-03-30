const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

const WEB_APP_URL = process.env.LUMINA_WEB_APP_URL || process.argv[2];

if (!WEB_APP_URL) {
  console.error('Missing Web App URL. Set LUMINA_WEB_APP_URL or pass it as argv[2].');
  process.exit(1);
}

async function callAppsScript(frame, method, ...args) {
  return frame.evaluate(
    ({ method, args }) =>
      new Promise((resolve) => {
        google.script.run
          .withSuccessHandler((out) => resolve({ ok: true, out }))
          .withFailureHandler((err) =>
            resolve({
              ok: false,
              err: String((err && err.message) || err),
            })
          )[method](...args);
      }),
    { method, args }
  );
}

async function main() {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.goto(`${WEB_APP_URL}?debug=1`, {
    waitUntil: 'networkidle2',
    timeout: 120000,
  });

  const frame = page.frames().find((item) => item.url().includes('/blank'));
  if (!frame) {
    throw new Error('Dashboard frame not found.');
  }

  await frame.waitForFunction(
    () => !document.body.innerText.includes('Loading preview...'),
    { timeout: 120000 }
  );

  const before = await frame.evaluate(() => ({
    bodyText: document.body.innerText,
    generated: document.body.innerText.match(/GENERATED:\s*(.*)/)?.[1] || '',
  }));

  await frame.evaluate(() => regenerateSnapshot());
  await frame.waitForFunction(
    () => document.body.innerText.includes('Preview updated'),
    { timeout: 120000 }
  );
  await new Promise((resolve) => setTimeout(resolve, 4000));

  const after = await frame.evaluate(() => ({
    bodyText: document.body.innerText,
    generated: document.body.innerText.match(/GENERATED:\s*(.*)/)?.[1] || '',
  }));

  const dashboardData = await callAppsScript(frame, 'getBeautifulReportData', 'Lumina Logic LLC', {
    report_type: 'DASHBOARD',
    force_regenerate: false,
  });

  const pdfResult = await callAppsScript(frame, 'generateReportForWeb', 'DASHBOARD');

  const output = {
    checked_at: new Date().toISOString(),
    url: WEB_APP_URL,
    before_generated: before.generated,
    after_generated: after.generated,
    regenerate_changed_timestamp: before.generated !== after.generated,
    preview_contains_bleeding: after.bodyText.includes('BLEEDING'),
    preview_contains_download_pdf: after.bodyText.includes('Download PDF'),
    preview_contains_strategy_table: after.bodyText.includes('Do Nothing vs Act'),
    dashboard_data: dashboardData,
    pdf_result: pdfResult,
  };

  const artifactsDir = path.join(process.cwd(), 'docs', '40_tests', 'runs', 'artifacts');
  fs.mkdirSync(artifactsDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const screenshotPath = path.join(artifactsDir, `web-dashboard-${stamp}.png`);
  const jsonPath = path.join(artifactsDir, `web-dashboard-${stamp}.json`);

  await page.screenshot({ path: screenshotPath, fullPage: true });
  fs.writeFileSync(jsonPath, JSON.stringify(output, null, 2));

  console.log(JSON.stringify({ ...output, screenshotPath, jsonPath }, null, 2));
  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
