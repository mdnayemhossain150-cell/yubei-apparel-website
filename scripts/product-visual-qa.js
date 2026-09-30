#!/usr/bin/env node
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const BASE = 'http://127.0.0.1:4173';
const OUTPUT = process.argv[2];
const PAGES = [
  { key: 'summer', slug: 'yb24815' },
  { key: 'autumn', slug: 'jz-07' },
  { key: 'winter', slug: 'yb0281' },
  { key: 'mix', slug: 'yb0205' },
  { key: 'multi', slug: 'yb0185', multi: true },
  { key: 'pilot', slug: 'yb253198-43', pilot: true }
];

if (!OUTPUT) throw new Error('Usage: node scripts/product-visual-qa.js <screenshot-output-directory>');
if (!fs.existsSync(EDGE)) throw new Error('Microsoft Edge not found at ' + EDGE);
fs.mkdirSync(OUTPUT, { recursive: true });

const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-yubei-visual-qa-'));
const edge = spawn(EDGE, [
  '--headless=new',
  '--disable-gpu',
  '--hide-scrollbars',
  '--remote-debugging-port=0',
  '--user-data-dir=' + profile,
  'about:blank'
], { windowsHide: true });

let stderr = '';
let nextId = 1;
const pending = new Map();
const browserErrors = [];
const resourceErrors = [];

function waitForWebSocket() {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Timed out waiting for Edge DevTools endpoint\n' + stderr)), 10000);
    edge.stderr.on('data', chunk => {
      stderr += chunk.toString();
      const match = stderr.match(/DevTools listening on (ws:\/\/[^\s]+)/);
      if (match) {
        clearTimeout(timeout);
        resolve(match[1]);
      }
    });
    edge.once('exit', code => {
      clearTimeout(timeout);
      reject(new Error('Edge exited before DevTools was ready: ' + code + '\n' + stderr));
    });
  });
}

function delay(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

async function main() {
  const wsUrl = await waitForWebSocket();
  const ws = new WebSocket(wsUrl);
  await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = reject;
  });

  ws.onmessage = event => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
      const promise = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) promise.reject(new Error(message.error.message));
      else promise.resolve(message.result || {});
      return;
    }
    if (message.method === 'Runtime.exceptionThrown') browserErrors.push('exception: ' + JSON.stringify(message.params.exceptionDetails));
    if (message.method === 'Log.entryAdded' && message.params.entry.level === 'error') {
      resourceErrors.push({ text: message.params.entry.text, url: message.params.entry.url || '' });
    }
    if (message.method === 'Runtime.consoleAPICalled' && message.params.type === 'error') browserErrors.push('console: ' + JSON.stringify(message.params.args));
  };

  function command(method, params, sessionId) {
    return new Promise((resolve, reject) => {
      const id = nextId++;
      pending.set(id, { resolve, reject });
      const message = { id, method, params: params || {} };
      if (sessionId) message.sessionId = sessionId;
      ws.send(JSON.stringify(message));
    });
  }

  const target = await command('Target.createTarget', { url: 'about:blank' });
  const attached = await command('Target.attachToTarget', { targetId: target.targetId, flatten: true });
  const sessionId = attached.sessionId;
  await command('Page.enable', {}, sessionId);
  await command('Runtime.enable', {}, sessionId);
  await command('Log.enable', {}, sessionId);

  async function evaluate(expression) {
    const result = await command('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }, sessionId);
    if (result.exceptionDetails) throw new Error('Evaluation failed: ' + JSON.stringify(result.exceptionDetails));
    return result.result.value;
  }

  async function navigate(url) {
    await command('Page.navigate', { url }, sessionId);
    for (let attempt = 0; attempt < 100; attempt++) {
      await delay(50);
      const state = await evaluate('document.readyState');
      if (state === 'complete') break;
    }
    await delay(250);
  }

  async function viewport(width, height, mobile) {
    await command('Emulation.setDeviceMetricsOverride', {
      width,
      height,
      screenWidth: width,
      screenHeight: height,
      deviceScaleFactor: 1,
      mobile
    }, sessionId);
    await command('Emulation.setTouchEmulationEnabled', { enabled: mobile, maxTouchPoints: mobile ? 5 : 1 }, sessionId);
  }

  const results = [];
  for (const page of PAGES) {
    for (const mode of [
      { name: 'desktop', width: 1440, height: 900, mobile: false },
      { name: 'mobile-390x844', width: 390, height: 844, mobile: true }
    ]) {
      await viewport(mode.width, mode.height, mode.mobile);
      await navigate(BASE + '/product/' + page.slug);
      const checks = await evaluate(`(() => {
        const images = Array.from(document.images);
        const primary = document.getElementById('productMainImage');
        const thumbnailImages = Array.from(document.querySelectorAll('.product-thumb img'));
        const visibleImages = images.filter(image => {
          const rect = image.getBoundingClientRect();
          return rect.bottom >= 0 && rect.top <= innerHeight;
        });
        const menuButton = document.getElementById('mobileMenuButton');
        const mobileNav = document.getElementById('mobileNav');
        if (${mode.mobile}) menuButton.click();
        const result = {
          viewport: { width: innerWidth, height: innerHeight },
          overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          h1: document.querySelector('h1')?.textContent.trim(),
          breadcrumb: document.querySelector('.breadcrumb')?.textContent.replace(/\\s+/g, ' ').trim(),
          primaryImageLoaded: Boolean(primary && primary.complete && primary.naturalWidth > 0),
          thumbnailImagesLoaded: thumbnailImages.every(image => image.complete && image.naturalWidth > 0),
          visibleImagesLoaded: visibleImages.every(image => image.complete && image.naturalWidth > 0),
          lazyImagesPending: images.filter(image => !(image.complete && image.naturalWidth > 0)).length,
          galleryImages: document.querySelectorAll('.product-thumb').length,
          relatedLinks: document.querySelectorAll('.related-product-card').length,
          contextualLinks: document.querySelectorAll('.product-context .context-link').length,
          inquiryButton: Boolean(document.getElementById('productInquiryButton')),
          mobileMenuOpened: ${mode.mobile} ? mobileNav.classList.contains('open') : null
        };
        if (${mode.mobile}) menuButton.click();
        return result;
      })()`);
      const screenshot = await command('Page.captureScreenshot', {
        format: 'png',
        fromSurface: true,
        captureBeyondViewport: false
      }, sessionId);
      const filename = 'phase-b-cdp-' + page.key + '-' + mode.name + '.png';
      fs.writeFileSync(path.join(OUTPUT, filename), Buffer.from(screenshot.data, 'base64'));
      results.push({ page: page.key, slug: page.slug, mode: mode.name, checks, screenshot: filename });
    }
  }

  await viewport(390, 844, true);
  await navigate(BASE + '/product/yb0185');
  const gallery = await evaluate(`(() => {
    const thumbs = document.querySelectorAll('.product-thumb');
    if (thumbs.length < 2) return { passed: false, reason: 'second thumbnail missing' };
    const before = document.getElementById('productMainImage').getAttribute('src');
    thumbs[1].click();
    const after = document.getElementById('productMainImage').getAttribute('src');
    return { passed: before !== after && thumbs[1].getAttribute('aria-selected') === 'true', before, after };
  })()`);

  await navigate(BASE + '/product/yb24815');
  const inquiry = await evaluate(`(() => {
    localStorage.removeItem('yubeiInquiryListV1');
    const button = document.getElementById('productInquiryButton');
    button.click();
    const added = JSON.parse(localStorage.getItem('yubeiInquiryListV1') || '[]');
    const selectedAfterAdd = button.classList.contains('selected');
    button.click();
    const removed = JSON.parse(localStorage.getItem('yubeiInquiryListV1') || '[]');
    return { passed: added.length === 1 && added[0].model === 'YB24815' && selectedAfterAdd && removed.length === 0 };
  })()`);

  await navigate(BASE + '/products?model=YB24815');
  const modelQuery = await evaluate(`(() => {
    const visible = Array.from(document.querySelectorAll('.prod-card')).filter(card => getComputedStyle(card).display !== 'none');
    return { passed: visible.length === 1 && visible[0].dataset.model === 'YB24815', visibleCount: visible.length, model: visible[0]?.dataset.model || null };
  })()`);

  const report = {
    pagesTested: PAGES.length,
    viewportRuns: results.length,
    results,
    gallery,
    inquiry,
    modelQuery,
    consoleErrors: browserErrors,
    resourceErrors
  };
  console.log(JSON.stringify(report, null, 2));

  await command('Target.closeTarget', { targetId: target.targetId });
  ws.close();
}

main().finally(async () => {
  edge.kill();
  await delay(150);
  const resolvedTemp = path.resolve(os.tmpdir());
  const resolvedProfile = path.resolve(profile);
  if (resolvedProfile.startsWith(resolvedTemp + path.sep) && path.basename(resolvedProfile).startsWith('codex-yubei-visual-qa-')) {
    fs.rmSync(resolvedProfile, { recursive: true, force: true });
  }
}).catch(error => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
