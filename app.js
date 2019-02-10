#!/usr/bin/env node

const puppeteer = require('puppeteer');
const Koa = require('koa');
const cors = require('@koa/cors');
const info = (...m) => console.log(...m);
const env = (k, d) => process.env.PRODUCTION
  ? process.env[k] || (console.error(`ERROR: missing env key '${k}'`), process.exit(1))
  : d;

const reporter = (browser, pat) => async ctx => {
  if (ctx.path === '/good-morning') {
    return ctx.body = 'oh hey hi!';
  }
  ctx.assert(ctx.path.startsWith('/report'), 404, `bad path: '${ctx.path}'`);
  ctx.assert(ctx.query.id, 400, `bad query: ${JSON.stringify(ctx.query)}`);
  ctx.assert(ctx.query.token, 400, `bad query: missing token ${JSON.stringify(ctx.query)}`);
  const { id, token } = ctx.query;
  const page = await browser.newPage();
  await page.setViewport({
    width: 800,
    height: 600,
    deviceScaleFactor: 2.5,
  });
  const response = await page.goto(`${pat}/project/${id}/report?token=${token}`, {
    timeout: 25000,  // try to avoid getting killed by heroku
    waitUntil: 'networkidle2',
  });

  ctx.assert(response.ok(), response.status(), `report request error: ${response.statusText()}`);

  const buff = await page.pdf({
    format: 'letter',
    margin: {
      top: '0.8in',
      left: '0.6in',
      right: '0.6in',
      bottom: '0.3in',
    },
  });

  ctx.type = 'application/pdf';
  ctx.body = buff;

  info(`successfully fetched and rendered report ${id}`);
};

async function bootstrap() {
  const port = parseInt(env('PORT', '3000'));
  const pat = env('PAT_HOST', 'http://localhost:8000');

  info(`starting in ${process.env.PRODUCTION ? 'PRODUCTION' : 'DEBUG'} mode.`);

  if (isNaN(port)) {
    throw new Error(`$PORT is not a valid number: ${port}`);
  }

  info('starting browser...');

  const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
  ['SIGINT', 'SIGTERM'].forEach(sig => process.once(sig, async () => {
    info('shutting down browser...');
    await browser.close();
    info('bye!');
    process.exit(0);
  }));

  info('started.');
  info(`launching koa app on port ${port}`);

  new Koa()
    .use(cors({ origin: pat }))
    .use(reporter(browser, pat))
    .listen(parseInt(port));

  info(`flying with ${pat}`);
}

if (!module.parent) bootstrap();
