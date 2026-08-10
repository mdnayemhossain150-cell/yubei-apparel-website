#!/usr/bin/env node
/*
 * build-products.js — Yubei catalog generator
 *
 * Reads products.json (single source of truth) and injects the static product
 * grid + ItemList JSON-LD into products.html, between persistent HTML markers.
 * Idempotent: re-running replaces only the content between the markers.
 *
 * Usage:
 *   node build-products.js            # regenerate products.html in place
 *   node build-products.js <outPath>  # write result to <outPath> instead (local preview)
 *
 * DISPLAY RULES (B2B browse-all catalog):
 *   - Show ALL products from products.json (confirmed duplicates are already
 *     removed from the data; nothing else is hidden).
 *   - Products are never hidden for a missing model or size.
 *   - When model or size is unavailable ("xxxxx"), the card shows
 *     "Available upon inquiry" instead — the literal "xxxxx" is never rendered.
 *   - Photos are always shown (buyers select styles visually, then contact us).
 *   - Products with "published": false are excluded from the public page and
 *     schema (kept in products.json for internal reference only).
 *
 * On an in-place regeneration this also stamps ONLY the /products <lastmod> in
 * sitemap.xml with the current date (other pages' lastmod are left untouched).
 */
'use strict';

var fs = require('fs');
var path = require('path');

var DIR = __dirname;
var SITE = 'https://www.yubeichildrenclothes.com';
var SEASON_ORDER = ['Winter', 'Summer', 'Autumn', 'Mix']; // Winter first = default visible tab
var EAGER_COUNT = 2; // first N cards load eagerly for LCP
var PLACEHOLDER = 'xxxxx';
var AVAILABLE = 'Available upon inquiry';

var dataPath = path.join(DIR, 'products.json');
var htmlPath = path.join(DIR, 'products.html');
var sitemapPath = path.join(DIR, 'sitemap.xml');
var outPath = process.argv[2] ? path.resolve(process.argv[2]) : htmlPath;
var PRODUCTS_LOC = 'https://www.yubeichildrenclothes.com/products';

function escAttr(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function escText(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function has(v) { return v && v !== PLACEHOLDER; }
function imageRef(p) { return p.image.replace(/\.[^.]+$/, ''); } // "autumn-02.jpg" -> "autumn-02"

function orderedProducts(products) {
  var list = products.slice();
  list.sort(function (a, b) {
    var sa = SEASON_ORDER.indexOf(a.season), sb = SEASON_ORDER.indexOf(b.season);
    if (sa !== sb) return sa - sb;
    return products.indexOf(a) - products.indexOf(b); // stable within season
  });
  return list;
}

function cardHtml(p, index) {
  var src = './assets/' + p.image; // relative path — resolves in local preview, file://, and Vercel /products
  var hasModel = has(p.model);
  var hasSize = has(p.sizeRange);

  // Visible text (never shows "xxxxx")
  var displayModel = hasModel ? ('Model No: ' + escText(p.model)) : AVAILABLE;
  var displaySize = hasSize ? escText(p.sizeRange) : AVAILABLE;

  // Data attributes drive search / inquiry / share. Missing model gets a unique
  // style reference (image basename) so inquiry de-duplication still works.
  var dataModel = hasModel ? p.model : imageRef(p);
  var dataSize = hasSize ? p.sizeRange : '';

  var alt = p.name + ' — ' + (hasModel ? 'model ' + p.model + ', ' : '') + p.season +
            (hasSize ? ', size ' + p.sizeRange : '') + ' — Yubei Apparel wholesale kidswear';

  var loading = index < EAGER_COUNT ? 'eager' : 'lazy';
  var fetchPriority = index === 0 ? ' fetchpriority="high"' : '';

  return '' +
    '<article class="prod-card" data-model="' + escAttr(dataModel) + '" data-size="' + escAttr(dataSize) + '" data-season="' + escAttr(p.season) + '" data-src="' + escAttr(src) + '">' +
      '<img src="' + escAttr(src) + '" alt="' + escAttr(alt) + '" width="800" height="1000" loading="' + loading + '" decoding="async" data-zoom' + fetchPriority + '>' +
      '<div class="product-body">' +
        '<div class="product-model">' + displayModel + '</div>' +
        '<div class="product-meta"><div><b>Size:</b> ' + displaySize + '</div><div><b>Season:</b> ' + escText(p.season) + '</div></div>' +
        '<div class="product-actions"><button class="copy-model-btn" type="button">Copy Model No.</button><button class="share-product-btn" type="button">Share Product</button></div>' +
        '<button class="inquiry-add-btn" type="button">+ Add to Inquiry</button>' +
      '</div>' +
    '</article>';
}

function itemListJson(list) {
  var out = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Yubei Apparel Wholesale Kidswear Catalog',
    numberOfItems: list.length,
    itemListElement: list.map(function (p, i) {
      var product = {
        '@type': 'Product',
        name: p.name,
        category: p.category,
        image: SITE + '/assets/' + p.image,
        brand: { '@type': 'Brand', name: 'Yubei Apparel' }
      };
      if (has(p.model)) product.sku = p.model; // omit sku when unavailable (never "xxxxx")
      return { '@type': 'ListItem', position: i + 1, item: product };
    })
  };
  return '<script type="application/ld+json">\n' + JSON.stringify(out, null, 2) + '\n</script>';
}

function replaceBetween(html, startMarker, endMarker, inner) {
  var esc = function (s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); };
  var re = new RegExp('(' + esc(startMarker) + ')[\\s\\S]*?(' + esc(endMarker) + ')');
  if (!re.test(html)) throw new Error('Markers not found: ' + startMarker + ' ... ' + endMarker);
  return html.replace(re, '$1\n' + inner + '\n$2');
}

function todayStamp() {
  var d = new Date();
  var mm = String(d.getMonth() + 1).padStart(2, '0');
  var dd = String(d.getDate()).padStart(2, '0');
  return d.getFullYear() + '-' + mm + '-' + dd;
}

// Update ONLY the <lastmod> inside the /products <url> block (its <loc> precedes
// the <lastmod>). No other page's lastmod is touched.
function updateProductsLastmod() {
  if (!fs.existsSync(sitemapPath)) { console.log('sitemap.xml: not found — lastmod not updated'); return; }
  var xml = fs.readFileSync(sitemapPath, 'utf8');
  var today = todayStamp();
  var re = new RegExp('(<loc>' + PRODUCTS_LOC.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '</loc>\\s*<lastmod>)[^<]*(</lastmod>)');
  if (!re.test(xml)) { console.log('sitemap.xml: /products entry not found — lastmod unchanged'); return; }
  var updated = xml.replace(re, '$1' + today + '$2');
  if (updated === xml) { console.log('sitemap.xml: /products lastmod already ' + today + ' — no change'); return; }
  fs.writeFileSync(sitemapPath, updated);
  console.log('sitemap.xml: /products lastmod set to ' + today);
}

function main() {
  var data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  var html = fs.readFileSync(htmlPath, 'utf8');
  var published = data.products.filter(function (p) { return p.published !== false; });
  var list = orderedProducts(published);

  var cards = list.map(cardHtml).join('\n');
  var itemList = itemListJson(list);

  html = replaceBetween(html, '<!--PRODUCTS:START-->', '<!--PRODUCTS:END-->', cards);
  html = replaceBetween(html, '<!--ITEMLIST:START-->', '<!--ITEMLIST:END-->', itemList);

  if (html.indexOf(PLACEHOLDER) !== -1) throw new Error('Refusing to write: "' + PLACEHOLDER + '" leaked into output.');

  fs.writeFileSync(outPath, html);

  // Only stamp the real sitemap on an in-place regeneration (not scratchpad previews).
  if (outPath === htmlPath) updateProductsLastmod();

  var counts = {};
  list.forEach(function (p) { counts[p.season] = (counts[p.season] || 0) + 1; });
  var availCount = list.filter(function (p) { return !has(p.model) || !has(p.sizeRange); }).length;
  console.log('Generated ' + path.basename(outPath));
  console.log('Products shown: ' + list.length + ' of ' + data.products.length);
  console.log('By season: ' + JSON.stringify(counts));
  console.log('Cards showing "Available upon inquiry": ' + availCount);
}

main();
