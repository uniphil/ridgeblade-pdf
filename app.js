const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:8000/project/3/report/for-pdf', {waitUntil: 'networkidle2'});
  await page.pdf({
    path: 'hn.pdf',
    format: 'letter',
    margin: {
      top: '0.5in',
      left: '0.5in',
      right: '0.5in',
      bottom: '0.5in',
    },
  });

  await browser.close();
})();
