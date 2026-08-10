#!/usr/bin/env node
/*
 * build-products.js — Yubei catalog generator (Phase A)
 *
 * Reads products.json (single source of truth) and injects the static product
 * grid + ItemList JSON-LD into products.html, between persistent HTML markers.
 * Idempotent: re-running replaces only the content between the markers.
 *
 * Usage:
 *   node build-products.js            # regenerate products.html in place
 *   node build-products.js <outPath>  # write result to <outPath> instead (used for local preview)
 *
 * PUBLIC rule (Phase A): a product is shown publicly only if
 *   status is "ok" or "corrected", model and sizeRange are not "xxxxx",
 *   and notes do NOT contain "IP review". Everything else stays in
 *   products.json but is excluded from the public page and schema.
 */
'use strict';

var fs = require('fs');
var path = require('path');

var DIR = __dirname;
var SITE = 'https://www.yubeichildrenclothes.com';
var SEASON_ORDER = ['Winter', 'Summer', 'Autumn', 'Mix']; // Winter first = default visible tab
var EAGER_COUNT = 2; // first N cards load eagerly for LCP

var dataPath = path.join(DIR, 'products.json');
var htmlPath = path.join(DIR, 'products.html');
var outPath = process.argv[2] ? path.resolve(process.argv[2]) : htmlPath;

function escAttr(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function escText(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function isPublic(p) {
  var placeholder = 'xxxxx';
  if (p.status !== 'ok' && p.status !== 'corrected') return false;
  if (!p.model || p.model === placeholder) return false;
  if (!p.sizeRange || p.sizeRange === placeholder) return false;
  if (p.notes && /IP review/i.test(p.notes)) return false;
  return true;
}

function orderedPublic(products) {
  var pub = products.filter(isPublic);
  pub.sort(function (a, b) {
    var sa = SEASON_ORDER.indexOf(a.season), sb = SEASON_ORDER.indexOf(b.season);
    if (sa !== sb) return sa - sb;
    return products.indexOf(a) - products.indexOf(b); // stable within season
  });
  return pub;
}

function cardHtml(p, index) {
  var src = '/assets/' + p.image;
  var alt = p.name + ' — model ' + p.model + ', size ' + p.sizeRange + ', ' + p.season + ' — Yubei Apparel wholesale kidswear';
  var loading = index < EAGER_COUNT ? 'eager' : 'lazy';
  var fetchPriority = index === 0 ? ' fetchpriority="high"' : '';
  return '' +
    '<article class="prod-card" data-model="' + escAttr(p.model) + '" data-size="' + escAttr(p.sizeRange) + '" data-season="' + escAttr(p.season) + '" data-src="' + escAttr(src) + '">' +
      '<img src="' + escAttr(src) + '" alt="' + escAttr(alt) + '" width="800" height="1000" loading="' + loading + '" decoding="async" data-zoom' + fetchPriority + '>' +
      '<div class="product-body">' +
        '<div class="product-model">Model No: ' + escText(p.model) + '</div>' +
        '<div class="product-meta"><div><b>Size:</b> ' + escText(p.sizeRange) + '</div><div><b>Season:</b> ' + escText(p.season) + '</div></div>' +
        '<div class="product-actions"><button class="copy-model-btn" type="button">Copy Model No.</button><button class="share-product-btn" type="button">Share Product</button></div>' +
        '<button class="inquiry-add-btn" type="button">+ Add to Inquiry</button>' +
      '</div>' +
    '</article>';
}

function itemListJson(pub) {
  var list = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Yubei Apparel Wholesale Kidswear Catalog',
    numberOfItems: pub.length,
    itemListElement: pub.map(function (p, i) {
      return {
        '@type': 'ListItem',
        position: i + 1,
        item: {
          '@type': 'Product',
          name: p.name,
          sku: p.model,
          category: p.category,
          image: SITE + '/assets/' + p.image,
          brand: { '@type': 'Brand', name: 'Yubei Apparel' }
        }
      };
    })
  };
  return '<script type="application/ld+json">\n' + JSON.stringify(list, null, 2) + '\n</script>';
}

function replaceBetween(html, startMarker, endMarker, inner) {
  var re = new RegExp('(' + startMarker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')[\\s\\S]*?(' + endMarker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')');
  if (!re.test(html)) throw new Error('Markers not found: ' + startMarker + ' ... ' + endMarker);
  return html.replace(re, '$1\n' + inner + '\n$2');
}

function main() {
  var data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  var html = fs.readFileSync(htmlPath, 'utf8');
  var pub = orderedPublic(data.products);

  var cards = pub.map(cardHtml).join('\n');
  var itemList = itemListJson(pub);

  html = replaceBetween(html, '<!--PRODUCTS:START-->', '<!--PRODUCTS:END-->', cards);
  html = replaceBetween(html, '<!--ITEMLIST:START-->', '<!--ITEMLIST:END-->', itemList);

  fs.writeFileSync(outPath, html);

  var counts = {};
  pub.forEach(function (p) { counts[p.season] = (counts[p.season] || 0) + 1; });
  console.log('Generated ' + path.basename(outPath));
  console.log('Public products: ' + pub.length + ' of ' + data.products.length);
  console.log('By season: ' + JSON.stringify(counts));
  console.log('Excluded: ' + (data.products.length - pub.length) + ' (need_confirmation / xxxxx / IP-flagged)');
}

main();
