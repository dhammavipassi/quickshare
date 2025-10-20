// Serverless-friendly HTML screenshot using puppeteer-core + @sparticuz/chromium
// Falls back to local puppeteer if available when not on Vercel

const path = require('path');

async function launchBrowser() {
  const isVercel = !!process.env.VERCEL || !!process.env.AWS_REGION;
  let puppeteer, chromium;
  if (isVercel) {
    chromium = require('@sparticuz/chromium');
    puppeteer = require('puppeteer-core');
    const executablePath = await chromium.executablePath();
    // Help dynamic linker find bundled libs (bin and ../lib)
    try {
      const binDir = path.dirname(executablePath);
      const libDir = path.join(binDir, '..', 'lib');
      const extra = [binDir, libDir, process.env.LD_LIBRARY_PATH].filter(Boolean).join(':');
      process.env.LD_LIBRARY_PATH = extra;
    } catch (_) {}
    return puppeteer.launch({
      args: [...chromium.args, '--no-sandbox', '--disable-setuid-sandbox'],
      defaultViewport: chromium.defaultViewport,
      executablePath,
      headless: chromium.headless,
    });
  } else {
    try {
      puppeteer = require('puppeteer');
      return puppeteer.launch({ headless: 'new' });
    } catch (_) {
      // fallback to core if puppeteer is not installed
      chromium = require('@sparticuz/chromium');
      puppeteer = require('puppeteer-core');
      const executablePath = await chromium.executablePath();
      return puppeteer.launch({
        args: chromium.args,
        defaultViewport: chromium.defaultViewport,
        executablePath,
        headless: chromium.headless,
      });
    }
  }
}

async function screenshotHTML(html, opts = {}) {
  const {
    viewportWidth = 1024,
    viewportHeight = 800,
    scale = 1,
    darkMode = false,
    waitUntil = 'networkidle2',
  } = opts;

  const browser = await launchBrowser();
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: viewportWidth, height: viewportHeight, deviceScaleFactor: Math.min(Math.max(scale,1), 2) });
    if (darkMode) {
      try { await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'dark' }]); } catch(_){}
    }
    await page.setContent(html, { waitUntil, timeout: 30000 });
    const buffer = await page.screenshot({ fullPage: true, type: 'png' });
    await page.close();
    return buffer;
  } finally {
    try { await browser.close(); } catch(_){}
  }
}

module.exports = { screenshotHTML };
