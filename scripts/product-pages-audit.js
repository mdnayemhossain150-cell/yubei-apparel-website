#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SITE = 'https://www.yubeichildrenclothes.com';
const PRODUCT_DIR = path.join(ROOT, 'product');
const EXPECTED_COUNT = 87;
const BLOCKED_SLUGS = [
  'xxxxx', 'yb003', 'yb005', 'yb0286', 'q0051-q0050',
  'yb21007140', '00435', 'yb003-autumn', 'yb003-autumn-denim',
  'yb005-summer', 'yb005-autumn-denim', 'yb005-mix',
  'yb0286-autumn', 'yb0286-mix'
];

const errors = [];
function fail(message) { errors.push(message); }
function occurrences(text, value) { return text.split(value).length - 1; }
function uniqueCheck(values, label) {
  const seen = new Map();
  values.forEach(entry => {
    if (seen.has(entry.value)) fail(label + ' duplicate: ' + entry.value + ' (' + seen.get(entry.value) + ', ' + entry.model + ')');
    seen.set(entry.value, entry.model);
  });
}

const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'products.json'), 'utf8'));
const products = (data.canonicalProducts || []).filter(product => product.pageStatus === 'approved');
const sitemap = fs.readFileSync(path.join(ROOT, 'sitemap.xml'), 'utf8');
const productFiles = fs.readdirSync(PRODUCT_DIR).filter(file => file.endsWith('.html')).sort();

if (products.length !== EXPECTED_COUNT) fail('Expected ' + EXPECTED_COUNT + ' approved products, found ' + products.length);
if (productFiles.length !== EXPECTED_COUNT) fail('Expected ' + EXPECTED_COUNT + ' product HTML files, found ' + productFiles.length);

uniqueCheck(products.map(product => ({ model: product.model, value: product.slug })), 'permanent slug');

const titles = [];
const descriptions = [];
const canonicals = [];

products.forEach(product => {
  const relative = product.slug + '.html';
  const pagePath = path.join(PRODUCT_DIR, relative);
  const canonical = SITE + '/product/' + product.slug;
  if (!fs.existsSync(pagePath)) {
    fail(product.model + ': missing generated page ' + relative);
    return;
  }

  const html = fs.readFileSync(pagePath, 'utf8');
  const title = /<title>([^<]+)<\/title>/i.exec(html);
  const description = /<meta\s+name="description"\s+content="([^"]+)"/i.exec(html);
  const canonicalMatches = Array.from(html.matchAll(/<link\s+rel="canonical"\s+href="([^"]+)"/gi));
  const jsonLdBlocks = Array.from(html.matchAll(/<script\s+type="application\/ld\+json">([\s\S]*?)<\/script>/gi));

  if (/xxxxx/i.test(html)) fail(product.model + ': placeholder text leaked into indexable page');
  if (!title) fail(product.model + ': missing title');
  else titles.push({ model: product.model, value: title[1] });
  if (!description) fail(product.model + ': missing meta description');
  else descriptions.push({ model: product.model, value: description[1] });
  if (canonicalMatches.length !== 1) fail(product.model + ': expected one canonical, found ' + canonicalMatches.length);
  else {
    canonicals.push({ model: product.model, value: canonicalMatches[0][1] });
    if (canonicalMatches[0][1] !== canonical) fail(product.model + ': canonical is not self-referencing');
  }

  let hasProduct = false;
  let hasBreadcrumbs = false;
  jsonLdBlocks.forEach(block => {
    let schema;
    try { schema = JSON.parse(block[1]); }
    catch (error) { fail(product.model + ': invalid JSON-LD: ' + error.message); return; }
    const nodes = schema['@graph'] || [schema];
    nodes.forEach(node => {
      if (node['@type'] === 'Product') {
        hasProduct = true;
        if (node.sku !== product.model) fail(product.model + ': Product schema SKU mismatch');
        if (node.url !== canonical) fail(product.model + ': Product schema URL mismatch');
        if (!Array.isArray(node.image) || node.image.length !== product.images.length) fail(product.model + ': Product schema image array mismatch');
      }
      if (node['@type'] === 'BreadcrumbList') hasBreadcrumbs = true;
    });
  });
  if (!hasProduct) fail(product.model + ': Product schema missing');
  if (!hasBreadcrumbs) fail(product.model + ': Breadcrumb schema missing');
  if (occurrences(sitemap, '<loc>' + canonical + '</loc>') !== 1) fail(product.model + ': sitemap entry must appear exactly once');
  if (!/data-product-detail/.test(html) || !/id="productInquiryButton"/.test(html)) fail(product.model + ': inquiry integration missing');
});

uniqueCheck(titles, 'title');
uniqueCheck(descriptions, 'meta description');
uniqueCheck(canonicals, 'canonical URL');

const sitemapLocs = Array.from(sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)).map(match => match[1]);
const sitemapProductLocs = sitemapLocs.filter(url => url.startsWith(SITE + '/product/'));
if (sitemapProductLocs.length !== EXPECTED_COUNT) fail('Expected ' + EXPECTED_COUNT + ' product sitemap URLs, found ' + sitemapProductLocs.length);
BLOCKED_SLUGS.forEach(slug => {
  const blockedUrl = SITE + '/product/' + slug;
  if (sitemapProductLocs.includes(blockedUrl)) fail('Blocked product appears in sitemap: ' + blockedUrl);
  if (fs.existsSync(path.join(PRODUCT_DIR, slug + '.html'))) fail('Blocked product page exists: ' + slug + '.html');
});

if (errors.length) {
  console.error('Product-page audit failed with ' + errors.length + ' error(s):');
  errors.forEach(error => console.error('- ' + error));
  process.exit(1);
}

console.log('Product-page audit passed.');
console.log('Approved pages: ' + products.length);
console.log('Product HTML files: ' + productFiles.length);
console.log('Unique slugs/titles/descriptions/canonicals: ' + products.length + '/' + titles.length + '/' + descriptions.length + '/' + canonicals.length);
console.log('Valid Product + Breadcrumb schema pages: ' + products.length);
console.log('Product sitemap URLs: ' + sitemapProductLocs.length + ' (total sitemap URLs: ' + sitemapLocs.length + ')');
console.log('Blocked individual pages in files/sitemap: 0');
