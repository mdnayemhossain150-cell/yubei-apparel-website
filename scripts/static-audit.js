#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SITE = 'https://www.yubeichildrenclothes.com';
const PAGES = {
  'index.html': '/', 'products.html': '/products', 'about.html': '/about',
  'services.html': '/services', 'certificates.html': '/certificates',
  'activity.html': '/activity', 'contact.html': '/contact',
  'zhili-childrens-clothing-manufacturer.html': '/zhili-childrens-clothing-manufacturer'
};
const errors = [];
const warnings = [];
const ok = [];

function read(file) { return fs.readFileSync(path.join(ROOT, file), 'utf8'); }
function matches(text, re) { return Array.from(text.matchAll(re)); }
function fail(message) { errors.push(message); }
function warn(message) { warnings.push(message); }
function pass(message) { ok.push(message); }

for (const [file, route] of Object.entries(PAGES)) {
  const html = read(file);
  const title = /<title>([\s\S]*?)<\/title>/i.exec(html);
  const description = /<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i.exec(html);
  const canonicals = matches(html, /<link\s+rel=["']canonical["']\s+href=["']([^"']+)["']/gi);
  const h1s = matches(html, /<h1\b/gi);
  if (!title || !title[1].trim()) fail(file + ': missing title');
  if (!description || !description[1].trim()) fail(file + ': missing meta description');
  if (canonicals.length !== 1) fail(file + ': expected one canonical, found ' + canonicals.length);
  else if (canonicals[0][1] !== SITE + route) fail(file + ': incorrect canonical ' + canonicals[0][1]);
  if (h1s.length !== 1) fail(file + ': expected one H1, found ' + h1s.length);
  for (const key of ['og:title', 'og:description', 'og:url', 'og:image']) {
    if (!new RegExp('<meta\\s+property=["\']' + key + '["\']', 'i').test(html)) fail(file + ': missing ' + key);
  }
  for (const key of ['twitter:card', 'twitter:title', 'twitter:description', 'twitter:image']) {
    if (!new RegExp('<meta\\s+name=["\']' + key + '["\']', 'i').test(html)) fail(file + ': missing ' + key);
  }
  for (const block of matches(html, /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try { JSON.parse(block[1]); } catch (e) { fail(file + ': invalid JSON-LD: ' + e.message); }
  }
  const images = matches(html, /<img\b[^>]*>/gi);
  images.forEach((m, i) => {
    if (!/\balt\s*=\s*["'][^"']*["']/i.test(m[0])) fail(file + ': image ' + (i + 1) + ' missing alt');
    const src = /\bsrc\s*=\s*["']([^"']+)["']/i.exec(m[0]);
    if (src && /^(?:\.\/|\/)?assets\//.test(src[1])) {
      const local = src[1].replace(/^(?:\.\/|\/)/, '');
      if (!fs.existsSync(path.join(ROOT, local))) fail(file + ': missing image file ' + local);
    }
  });
  for (const link of matches(html, /<a\b[^>]*href\s*=\s*["']([^"']+)["']/gi)) {
    const href = link[1].split('#')[0].split('?')[0];
    if (!href || /^(https?:|mailto:|tel:|javascript:)/i.test(href)) continue;
    const normalized = href === '/' ? 'index.html' : href.replace(/^\//, '') + '.html';
    if (!fs.existsSync(path.join(ROOT, normalized))) fail(file + ': broken internal link ' + link[1]);
  }
  pass(file + ': core SEO, JSON-LD, links and images checked');
}

const sitemap = read('sitemap.xml');
if (!/^<\?xml[\s\S]*<urlset\b[\s\S]*<\/urlset>\s*$/i.test(sitemap.trim())) fail('sitemap.xml: invalid basic XML structure');
for (const route of Object.values(PAGES)) {
  const url = SITE + route;
  if (!sitemap.includes('<loc>' + url + '</loc>')) fail('sitemap.xml: missing ' + url);
}
const robots = read('robots.txt');
if (!/User-agent:\s*\*/i.test(robots) || !/Sitemap:\s*https:\/\//i.test(robots)) fail('robots.txt: missing global agent or sitemap');

let catalog;
try { catalog = JSON.parse(read('products.json')); } catch (e) { fail('products.json: invalid JSON: ' + e.message); }
if (catalog) {
  const products = Array.isArray(catalog.products) ? catalog.products : [];
  const duplicateGroups = (field, skipPlaceholder) => {
    const groups = new Map();
    products.forEach(p => {
      const value = p[field];
      if (!value || (skipPlaceholder && value === 'xxxxx')) return;
      if (!groups.has(value)) groups.set(value, []);
      groups.get(value).push(p.image);
    });
    return Array.from(groups).filter(([, files]) => files.length > 1);
  };
  duplicateGroups('slug', false).forEach(([value, files]) => warn('duplicate slug "' + value + '": ' + files.join(', ')));
  duplicateGroups('model', true).forEach(([value, files]) => warn('duplicate model "' + value + '": ' + files.join(', ')));
  products.forEach(p => { if (!fs.existsSync(path.join(ROOT, 'assets', p.image))) fail('products.json: missing asset ' + p.image); });
  pass('products.json: parsed and ' + products.length + ' product assets checked');
}

console.log('Static audit: ' + ok.length + ' checks passed, ' + warnings.length + ' warnings, ' + errors.length + ' errors');
ok.forEach(x => console.log('PASS  ' + x));
warnings.forEach(x => console.log('WARN  ' + x));
errors.forEach(x => console.error('ERROR ' + x));
process.exitCode = errors.length ? 1 : 0;
