#!/usr/bin/env node

const puppeteer = require('puppeteer');
const Koa = require('koa');
const info = (...m) => console.log(...m);
const env = (k, d) => process.env[k] || ( process.env.PRODUCTION
  ? (console.error(`ERROR: missing env key '${k}'`), process.exit(1))
  : d);

const reporter = (browser, pat, secret) => async ctx => {
  ctx.assert(ctx.path.startsWith('/report'), 404, `bad path: '${ctx.path}'`);
  ctx.assert(ctx.query.id, 400, `bad query: ${JSON.stringify(ctx.query)}`);
  ctx.assert(ctx.query.secret === secret, 403, `nope`);
  const {id, hash} = ctx.query;
  const page = await browser.newPage();
  const response = await page.goto(`${pat}/project/${id}/report/for-pdf?secret=${secret}`, {
    waitUntil: 'networkidle2',
  });

  ctx.assert(response.ok(), response.status(), `report request error: ${response.statusText()}`);

  const buff = await page.pdf({
    format: 'letter',
    margin: {
      top: '0.5in',
      left: '0.5in',
      right: '0.5in',
      bottom: '0.5in',
    },
  });

  ctx.type = 'application/pdf';
  ctx.body = buff;

  info(`successfully fetched and rendered report ${id}`);
};

async function bootstrap() {
  const secret = env('PDF_SECRET', 'secret');
  const pat = env('PAT_HOST', 'http://localhost:8000');

  info('starting browser...');

  const browser = await puppeteer.launch();
  ['SIGINT', 'SIGTERM'].forEach(sig => process.once(sig, async () => {
    info('shutting down browser...');
    await browser.close();
    info('bye!');
  }));

  info('started.');
  info('launching koa app...');

  new Koa()
    .use(reporter(browser, pat, secret))
    .listen(3000);

  info('flying.');
}

if (!module.parent) bootstrap();
