#!/usr/bin/env node
/*
 * Phase B product-page generator.
 *
 * Canonical product records live in products.json#canonicalProducts. Legacy
 * products[] records continue to power the existing catalog. Only records
 * explicitly marked "approved" and fully verified are generated.
 */
'use strict';

var fs = require('fs');
var path = require('path');

var ROOT = __dirname;
var SITE = 'https://www.yubeichildrenclothes.com';
var PLACEHOLDER = 'xxxxx';
var DATA_PATH = path.join(ROOT, 'products.json');
var OUTPUT_DIR = path.join(ROOT, 'product');
var SITEMAP_PATH = path.join(ROOT, 'sitemap.xml');
var SITEMAP_START = '<!--GENERATED_PRODUCT_PAGES:START-->';
var SITEMAP_END = '<!--GENERATED_PRODUCT_PAGES:END-->';

function esc(value) {
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function today() {
  var date = new Date();
  return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
}

function seasonUrl(season) {
  var routes = {
    Summer: '/summer-childrens-clothing-wholesale',
    Autumn: '/autumn-childrens-clothing-wholesale',
    Winter: '/winter-childrens-clothing-wholesale',
    Mix: '/products'
  };
  return routes[season] || '/products';
}

function validateProduct(product) {
  var errors = [];
  var required = ['model', 'slug', 'name', 'sizeRange', 'primaryImage'];
  required.forEach(function (key) {
    if (!product[key]) errors.push('missing ' + key);
  });
  if (String(product.model).toLowerCase() === PLACEHOLDER) errors.push('placeholder model is forbidden');
  if (String(product.slug).toLowerCase().indexOf(PLACEHOLDER) !== -1) errors.push('placeholder slug is forbidden');
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(product.slug || '')) errors.push('slug is not permanent URL-safe text');
  if (product.verificationStatus !== 'verified') errors.push('verificationStatus must be verified');
  if (!Array.isArray(product.images) || !product.images.length) errors.push('images[] is empty');
  if (!Array.isArray(product.seasonTags) || !product.seasonTags.length) errors.push('seasonTags[] is empty');
  if (!Array.isArray(product.categoryTags) || !product.categoryTags.length) errors.push('categoryTags[] is empty');
  if (!Array.isArray(product.images) || !product.images.some(function (image) { return image.src === product.primaryImage; })) errors.push('primaryImage is not in images[]');
  (product.images || []).forEach(function (image) {
    if (!image.src || !image.alt) errors.push('every image needs src and alt');
    else if (!fs.existsSync(path.join(ROOT, 'assets', image.src))) errors.push('missing image asset ' + image.src);
  });
  if (errors.length) throw new Error(product.model + ': ' + errors.join('; '));
}

function productDescription(product) {
  return product.name + ', model ' + product.model + ', in verified size range ' + product.sizeRange + '. View the product and add it to a wholesale inquiry with Yubei Apparel.';
}

function imageGallery(product) {
  var ordered = product.images.slice().sort(function (a) { return a.src === product.primaryImage ? -1 : 1; });
  var primary = ordered[0];
  var thumbnails = ordered.map(function (image, index) {
    return '<button class="product-thumb' + (index === 0 ? ' active' : '') + '" type="button" data-gallery-src="/assets/' + esc(image.src) + '" data-gallery-alt="' + esc(image.alt) + '" aria-label="Show product image ' + (index + 1) + ' of ' + ordered.length + '" aria-selected="' + (index === 0 ? 'true' : 'false') + '"><img src="/assets/' + esc(image.src) + '" alt="" width="112" height="140" loading="' + (index === 0 ? 'eager' : 'lazy') + '" decoding="async"></button>';
  }).join('');

  return '<div class="product-gallery" aria-label="Product image gallery">' +
    '<div class="product-main-image"><img id="productMainImage" src="/assets/' + esc(primary.src) + '" alt="' + esc(primary.alt) + '" width="800" height="1000" decoding="async" fetchpriority="high"></div>' +
    '<div class="product-thumbnails"' + (ordered.length === 1 ? ' data-single-image="true"' : '') + '>' + thumbnails + '</div>' +
  '</div>';
}

function relatedProducts(product, legacyProducts) {
  var cards = (product.relatedModels || []).map(function (model) {
    return legacyProducts.find(function (entry) { return entry.model === model && entry.published !== false; });
  }).filter(Boolean).slice(0, 3).map(function (entry) {
    var collection = entry.season === 'Mix' ? 'Custom Design' : entry.season;
    return '<a class="related-product-card" href="/products?model=' + encodeURIComponent(entry.model) + '">' +
      '<img src="/assets/' + esc(entry.image) + '" alt="' + esc(entry.name + ', model ' + entry.model) + '" width="800" height="1000" loading="lazy" decoding="async">' +
      '<span><strong>' + esc(entry.name) + '</strong><small>Model ' + esc(entry.model) + ' · ' + esc(collection) + '</small></span>' +
    '</a>';
  }).join('');
  return cards || '<a class="text-link" href="/products">Browse the complete product catalog</a>';
}

function productSchema(product, url, description) {
  var images = product.images.map(function (image) { return SITE + '/assets/' + image.src; });
  var graph = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Product',
        '@id': url + '#product',
        name: product.name,
        url: url,
        description: description,
        sku: product.model,
        image: images,
        size: product.sizeRange,
        category: product.categoryTags.join(', '),
        color: product.colors.join(', '),
        brand: { '@type': 'Brand', name: 'Yubei Apparel' }
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: SITE + '/' },
          { '@type': 'ListItem', position: 2, name: 'Products', item: SITE + '/products' },
          { '@type': 'ListItem', position: 3, name: product.model, item: url }
        ]
      }
    ]
  };
  return JSON.stringify(graph).replace(/</g, '\\u003c');
}

function renderPage(product, legacyProducts) {
  var url = SITE + '/product/' + product.slug;
  var title = product.model + ' ' + product.categoryTags[0] + ' | Yubei Apparel';
  var description = productDescription(product);
  var metaDescription = 'View Yubei model ' + product.model + ', a ' + product.name.toLowerCase() + ' in verified sizes ' + product.sizeRange + '. Add it to your wholesale inquiry.';
  var primaryUrl = SITE + '/assets/' + product.primaryImage;
  var season = product.seasonTags[0];
  var collectionUrl = seasonUrl(season);
  var colors = product.colors.map(function (color) { return '<li>' + esc(color) + '</li>'; }).join('');
  var categories = product.categoryTags.map(function (category) { return '<li>' + esc(category) + '</li>'; }).join('');

  return '<!doctype html>\n' +
  '<html lang="en">\n<head>\n' +
  '  <meta charset="utf-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1">\n  <meta name="robots" content="index, follow, max-image-preview:large">\n' +
  '  <title>' + esc(title) + '</title>\n' +
  '  <meta name="description" content="' + esc(metaDescription) + '">\n' +
  '  <link rel="canonical" href="' + esc(url) + '">\n' +
  '  <link rel="icon" href="/assets/yubei-logo-nav-v1.webp" type="image/webp">\n' +
  '  <meta property="og:type" content="product"><meta property="og:site_name" content="Yubei Apparel"><meta property="og:title" content="' + esc(title) + '"><meta property="og:description" content="' + esc(metaDescription) + '"><meta property="og:url" content="' + esc(url) + '"><meta property="og:image" content="' + esc(primaryUrl) + '"><meta property="og:image:alt" content="' + esc(product.images.find(function (image) { return image.src === product.primaryImage; }).alt) + '">\n' +
  '  <meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="' + esc(title) + '"><meta name="twitter:description" content="' + esc(metaDescription) + '"><meta name="twitter:image" content="' + esc(primaryUrl) + '"><meta name="twitter:image:alt" content="' + esc(product.images.find(function (image) { return image.src === product.primaryImage; }).alt) + '">\n' +
  '  <link rel="preload" as="image" href="/assets/' + esc(product.primaryImage) + '" fetchpriority="high">\n' +
  '  <link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Sora:wght@700;800&family=Inter:wght@400;600;700&display=swap" rel="stylesheet" media="print" onload="this.media=\'all\'">\n' +
  '  <link rel="stylesheet" href="/seo-pages.css"><link rel="stylesheet" href="/product-detail.css">\n' +
  '  <script type="application/ld+json">' + productSchema(product, url, description) + '</script>\n' +
  '  <script async src="https://www.googletagmanager.com/gtag/js?id=G-WW106PE6L3"></script><script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag(\'js\',new Date());gtag(\'config\',\'G-WW106PE6L3\');</script>\n' +
  '  <script defer src="/seo-pages.js"></script><script defer src="/language.js"></script><script defer src="/analytics-events.js"></script><script defer src="/product-detail.js"></script>\n' +
  '</head>\n<body>\n' +
  '  <header class="site-header"><a class="brand" href="/" aria-label="Yubei Apparel home"><img src="/assets/yubei-logo-nav-v1.webp" alt="Yubei Apparel logo" width="40" height="40"><b>YUBEI <span>APPAREL</span></b></a><nav class="desktop-nav" aria-label="Main navigation"><a href="/about">About</a><a href="/products" aria-current="page">Products</a><a href="/services">Services</a><a href="/certificates">Certificates</a><a href="/activity">Activity</a><a href="/contact">Contact</a></nav><div class="header-tools"><select id="languageSwitcher" aria-label="Choose language"><option value="en">EN</option><option value="ar">العربية</option></select><a class="quote-link" href="/contact">Request Quote</a><button class="mobile-menu-button" id="mobileMenuButton" type="button" aria-expanded="false" aria-controls="mobileNav" aria-label="Menu">☰</button></div></header>\n' +
  '  <nav class="mobile-nav" id="mobileNav" aria-label="Mobile navigation"><a href="/about">About</a><a href="/products" aria-current="page">Products</a><a href="/services">Services</a><a href="/certificates">Certificates</a><a href="/activity">Activity</a><a href="/contact">Contact</a></nav>\n' +
  '  <main>\n    <div class="breadcrumb"><a href="/">Home</a> / <a href="/products">Products</a> / <span>' + esc(product.model) + '</span></div>\n' +
  '    <section class="product-detail-section" data-product-detail data-model="' + esc(product.model) + '" data-size="' + esc(product.sizeRange) + '" data-season="' + esc(season) + '">\n      <div class="product-detail-grid">\n        ' + imageGallery(product) + '\n' +
  '        <div class="product-summary"><div class="eyebrow">' + esc(season) + ' Collection</div><h1>' + esc(product.name) + '</h1><p class="product-sku">Model / SKU: <strong>' + esc(product.model) + '</strong></p><p class="product-intro">' + esc(description) + '</p><dl class="product-facts"><div><dt>Verified size range</dt><dd>' + esc(product.sizeRange) + '</dd></div><div><dt>Season</dt><dd>' + esc(product.seasonTags.join(', ')) + '</dd></div><div><dt>Category</dt><dd><ul>' + categories + '</ul></dd></div><div><dt>Colors shown</dt><dd><ul>' + colors + '</ul></dd></div></dl><button class="inquiry-add-btn product-inquiry-button" id="productInquiryButton" type="button">+ Add to Inquiry</button><p class="product-inquiry-status" id="productInquiryStatus" aria-live="polite"></p><div class="product-secondary-actions"><a href="/products?model=' + encodeURIComponent(product.model) + '">Find this model in the catalog</a><a href="' + collectionUrl + '">Browse the ' + esc(season) + ' collection</a></div></div>\n' +
  '      </div>\n    </section>\n' +
  '    <section class="section alt"><div class="container"><div class="section-heading"><div class="eyebrow">Related Styles</div><h2>Explore More ' + esc(season) + ' Kidswear</h2><p>These catalog links keep the existing model-search workflow available while individual product pages are introduced carefully.</p></div><div class="related-product-grid">' + relatedProducts(product, legacyProducts) + '</div></div></section>\n' +
  '    <section class="section"><div class="container narrow product-context"><h2>Wholesale Sourcing Links</h2><p>Learn more about Yubei as a <a class="context-link" href="/china-childrens-clothing-manufacturer">children\'s clothing manufacturer in China</a>, our location in the <a class="context-link" href="/zhili-childrens-clothing-manufacturer">Zhili kidswear manufacturing center</a>, and our <a class="context-link" href="/oem-childrens-clothing-manufacturer">children\'s clothing OEM and ODM services</a>.</p><div class="cta-actions"><a class="button-primary" href="/contact">Request a Quote</a><a class="button-secondary" href="/products">View Full Catalog</a></div></div></section>\n' +
  '  </main>\n' +
  '  <footer class="site-footer"><div class="footer-inner"><div><strong>Yubei Apparel</strong><p>Children\'s clothing manufacturer and exporter in Zhili, Huzhou, China.</p></div><div><strong>Contact Us</strong><p>+86 183 6725 9637<br><a href="mailto:358630530@qq.com">358630530@qq.com</a></p></div><div><strong>Address</strong><p>North Gate, 1st Floor, Building B1, No. 9 Zhanwang Road, Zhili Town, Huzhou, Zhejiang</p></div></div><div class="copyright">© 2026 Huzhou Zhili Yubei Clothing Co., Ltd. — All rights reserved.</div></footer>\n' +
  '  <a class="whatsapp-float" href="https://wa.me/8618367259637" target="_blank" rel="noopener" aria-label="Chat on WhatsApp">WA</a>\n' +
  '</body>\n</html>\n';
}

function renderSitemap(products) {
  var sitemap = fs.readFileSync(SITEMAP_PATH, 'utf8');
  var entries = products.map(function (product) {
    return '  <url>\n    <loc>' + SITE + '/product/' + product.slug + '</loc>\n    <lastmod>' + today() + '</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.7</priority>\n  </url>';
  }).join('\n');
  var block = SITEMAP_START + '\n' + entries + '\n  ' + SITEMAP_END;
  if (sitemap.indexOf(SITEMAP_START) !== -1 && sitemap.indexOf(SITEMAP_END) !== -1) {
    var start = sitemap.indexOf(SITEMAP_START);
    var end = sitemap.indexOf(SITEMAP_END) + SITEMAP_END.length;
    sitemap = sitemap.slice(0, start) + block + sitemap.slice(end);
  } else {
    sitemap = sitemap.replace(/\s*<\/urlset>\s*$/, '\n  ' + block + '\n</urlset>\n');
  }
  return sitemap;
}

function updateSitemap(products) {
  fs.writeFileSync(SITEMAP_PATH, renderSitemap(products));
}

function filePatch(relativePath, content) {
  var absolute = path.join(ROOT, relativePath);
  var lines = content.replace(/\r\n/g, '\n').split('\n');
  if (!fs.existsSync(absolute)) {
    return ['*** Add File: ' + relativePath].concat(lines.map(function (line) { return '+' + line; }));
  }
  var original = fs.readFileSync(absolute, 'utf8').replace(/\r\n/g, '\n').split('\n');
  return ['*** Update File: ' + relativePath, '@@']
    .concat(original.map(function (line) { return '-' + line; }))
    .concat(lines.map(function (line) { return '+' + line; }));
}

function main() {
  var data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
  var canonical = Array.isArray(data.canonicalProducts) ? data.canonicalProducts : [];
  var publishable = canonical.filter(function (product) { return product.pageStatus === 'approved'; });
  var models = new Set();
  var slugs = new Set();
  publishable.forEach(function (product) {
    validateProduct(product);
    if (models.has(product.model)) throw new Error('Duplicate generated model ' + product.model);
    if (slugs.has(product.slug)) throw new Error('Duplicate generated slug ' + product.slug);
    models.add(product.model);
    slugs.add(product.slug);
  });
  if (publishable.length !== 87) throw new Error('Expected exactly 87 approved product pages, found ' + publishable.length);
  if (process.argv.indexOf('--stdout') !== -1) {
    if (publishable.length !== 1) throw new Error('--stdout requires exactly one publishable product');
    process.stdout.write(renderPage(publishable[0], data.products || []));
    return;
  }
  var patchRange = process.argv.find(function (arg) { return arg.indexOf('--patch-range=') === 0; });
  if (patchRange) {
    var bounds = patchRange.slice('--patch-range='.length).split(':').map(Number);
    var start = bounds[0];
    var end = bounds[1];
    if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end <= start || end > publishable.length) {
      throw new Error('Invalid --patch-range; expected start:end within 0:' + publishable.length);
    }
    var patch = ['*** Begin Patch'];
    publishable.slice(start, end).forEach(function (product) {
      patch = patch.concat(filePatch('product/' + product.slug + '.html', renderPage(product, data.products || [])));
    });
    if (process.argv.indexOf('--include-sitemap') !== -1) {
      patch = patch.concat(filePatch('sitemap.xml', renderSitemap(publishable)));
    }
    patch.push('*** End Patch');
    process.stdout.write(patch.join('\n'));
    return;
  }
  if (process.argv.indexOf('--check') !== -1) {
    publishable.forEach(function (product) {
      var output = path.join(OUTPUT_DIR, product.slug + '.html');
      if (!fs.existsSync(output)) throw new Error('Missing generated page ' + output);
      var html = fs.readFileSync(output, 'utf8');
      if (html.indexOf('<link rel="canonical" href="' + SITE + '/product/' + product.slug + '">') === -1) throw new Error(product.model + ': generated canonical mismatch');
      if (html.indexOf('"@type":"Product"') === -1) throw new Error(product.model + ': Product schema missing');
      if (html.indexOf('data-model="' + product.model + '"') === -1) throw new Error(product.model + ': inquiry product data missing');
    });
    var sitemap = fs.readFileSync(SITEMAP_PATH, 'utf8');
    publishable.forEach(function (product) {
      if (sitemap.indexOf('<loc>' + SITE + '/product/' + product.slug + '</loc>') === -1) throw new Error(product.model + ': sitemap entry missing');
    });
    console.log('Product-page generator check passed for ' + publishable.length + ' page(s).');
    return;
  }
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  publishable.forEach(function (product) {
    fs.writeFileSync(path.join(OUTPUT_DIR, product.slug + '.html'), renderPage(product, data.products || []));
  });
  updateSitemap(publishable);
  console.log('Generated ' + publishable.length + ' verified product page(s): ' + publishable.map(function (product) { return '/product/' + product.slug; }).join(', '));
  console.log('Prepared canonical records not generated: ' + canonical.filter(function (product) { return product.pageStatus !== 'pilot' && product.pageStatus !== 'approved'; }).length);
}

main();
