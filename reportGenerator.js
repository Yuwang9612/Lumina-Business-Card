const puppeteer = require('puppeteer');
const ejs = require('ejs');
const fs = require('fs');
const path = require('path');

async function generateBeautifulReport(data, outputPath = 'Lumina_Beautiful_Report.pdf') {
  const templatePath = path.join(__dirname, 'templates', 'lumina_report.html');
  const template = fs.readFileSync(templatePath, 'utf8');
  
  const html = ejs.render(template, data);

  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  await page.setContent(html, { waitUntil: 'networkidle0' });
  
  await page.pdf({
    path: outputPath,
    format: 'A4',
    printBackground: true,
    margin: { top: '20px', bottom: '20px', left: '20px', right: '20px' }
  });

  await browser.close();
  console.log(`✅ 超漂亮 PDF 生成完成！ → ${outputPath}`);
}

module.exports = { generateBeautifulReport };