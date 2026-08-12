'use strict';

/*
 * POST /api/admin/publish-preview — STAGE 2D-2a DRY-RUN ONLY (persists nothing).
 *
 * Composes the ENTIRE would-be publish in memory and returns compact diffs. It
 * proves the full pipeline (products.json -> build-products generators ->
 * products.html + sitemap) end-to-end WITHOUT writing anything, WITHOUT any
 * GitHub call, and WITHOUT a GitHub token.
 *
 * Guarantees:
 *   - Authenticated session required (401 otherwise).
 *   - Permission publish:preview required (403 otherwise).
 *   - CSRF header required (403 otherwise).
 *   - Every op is RE-VALIDATED server-side (client "preview OK" is never trusted).
 *   - NEUTRALITY (constraints #3/#4): a zero-op (or net-zero) compose returns
 *     products.json / products.html / sitemap.xml BYTE-IDENTICAL to disk, and
 *     the sitemap <lastmod> is NOT stamped when there is no actual change.
 *   - Only compact unified diffs are returned to the browser — never the full
 *     products.html. The full proposed file is built only in memory to validate.
 *   - Response always reports persisted: false.
 *
 * Request body:
 *   {
 *     edits:   { "<image>": { ...editable fields... }, ... },
 *     deletes: [ "<image>", ... ],
 *     order:   [ "<image>", ... ],          // strict permutation of current images
 *     adds:    [ { image?, name, category, season, ... }, ... ]
 *   }
 *
 * Bundling note: products.json is `require`d (guarantees Vercel bundles it) and
 * also read as raw text for byte-exact neutrality; products.html and sitemap.xml
 * are read via `path.join(__dirname, ...)` literals so @vercel/nft traces them.
 */

const fs = require('fs');
const path = require('path');

const auth = require('./_lib/auth');
const perms = require('./_lib/permissions');
const csrf = require('./_lib/csrf');
const validate = require('./_lib/validate');
const catalog = require('./_lib/catalog');
const compose = require('./_lib/compose');
const { json, readJsonBody } = require('./_lib/http');

// Bundling anchor (matches api/admin/products.js): requiring the JSON guarantees
// Vercel includes the file. We read RAW TEXT below for byte-exact neutrality.
require('../../products.json');

// build-products.js exports the pure generators (Stage 2D-1). Importing it does
// NOT run its CLI and does NOT touch the filesystem.
const generator = require('../../build-products.js');

const SAFE_IMAGE = /^[a-z0-9][a-z0-9\-]*\.jpg$/;

function readText(rel) {
  return fs.readFileSync(path.join(__dirname, '..', '..', rel), 'utf8');
}

function seasonCounts(products) {
  const shown = products.filter(function (p) { return p.published !== false; });
  const ordered = generator.orderedProducts(shown);
  const bySeason = {};
  ordered.forEach(function (p) { bySeason[p.season] = (bySeason[p.season] || 0) + 1; });
  const avail = ordered.filter(function (p) {
    return !generator.has(p.model) || !generator.has(p.sizeRange);
  }).length;
  return { shown: ordered.length, total: products.length, bySeason: bySeason, availableUponInquiry: avail };
}

module.exports = async function (req, res) {
  try {
    if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });

    let session = null;
    try { session = auth.getSessionFromReq(req); } catch (e) { session = null; }
    if (!session) return json(res, 401, { error: 'Not authenticated' });

    if (!perms.roleHasPermission(session.role, perms.PERMISSIONS.PUBLISH_PREVIEW)) {
      return json(res, 403, { error: 'Forbidden: publish:preview permission required' });
    }
    if (!csrf.verify(req, session)) {
      return json(res, 403, { error: 'Invalid or missing CSRF token' });
    }

    const body = (await readJsonBody(req)) || {};

    // ---- Load current sources of truth as RAW TEXT (read-only). --------------
    let rawJson, currentHtml, currentXml;
    try {
      rawJson = readText('products.json');
      currentHtml = readText('products.html');
      currentXml = readText('sitemap.xml');
    } catch (e) {
      return json(res, 500, { error: 'Could not read catalog sources for preview' });
    }

    const currentImages = catalog.products().map(function (p) { return p.image; });
    const imageSet = {};
    currentImages.forEach(function (img) { imageSet[img] = true; });

    // ---- Re-validate every op from scratch. ---------------------------------
    const fieldErrors = {};
    const normalizedEdits = {};
    const edits = (body.edits && typeof body.edits === 'object' && !Array.isArray(body.edits)) ? body.edits : {};
    Object.keys(edits).forEach(function (img) {
      if (!imageSet[img]) { fieldErrors['edit:' + img] = ['unknown product']; return; }
      const v = validate.validateFields(edits[img]);
      if (!v.ok) fieldErrors['edit:' + img] = v.errors;
      else normalizedEdits[img] = v.fields;
    });

    const deletes = Array.isArray(body.deletes) ? body.deletes : [];
    deletes.forEach(function (img) {
      if (!imageSet[img]) fieldErrors['delete:' + img] = ['unknown product'];
    });

    let order = null;
    if (body.order != null) {
      const chk = catalog.validateReorder(body.order);
      if (!chk.ok) fieldErrors['order'] = [chk.error];
      else order = body.order;
    }

    // Adds: compose only those with a valid, safe image filename. Photo-pending
    // adds (no processed image yet — that is Stage 2D-2b) are excluded and
    // reported so the preview stays truthful about what could actually publish.
    const composableAdds = [];
    const pendingAdds = [];
    const adds = Array.isArray(body.adds) ? body.adds : [];
    adds.forEach(function (a, idx) {
      const v = validate.validateNewProduct(a && a.fields ? a.fields : a);
      if (!v.ok) { fieldErrors['add:' + idx] = v.errors; return; }
      const image = a && typeof a.image === 'string' ? a.image : null;
      const name = v.fields.name;
      if (!image || !SAFE_IMAGE.test(image)) {
        pendingAdds.push({ name: name, reason: 'image pending — authoritative image processing is Stage 2D-2b' });
        return;
      }
      if (imageSet[image]) { fieldErrors['add:' + idx] = ['image filename already in use: ' + image]; return; }
      // Assemble a product object in the catalog's house key order.
      const f = v.fields;
      composableAdds.push({
        model: f.model, slug: (name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
        season: f.season, image: image, name: name, category: f.category,
        sizeRange: f.sizeRange, colors: f.colors, status: 'new', notes: '',
        description: f.description, published: f.published
      });
    });

    if (Object.keys(fieldErrors).length) {
      return json(res, 400, { error: 'Validation failed', fieldErrors: fieldErrors });
    }

    // ---- Compose products.json (line-preserving, byte-exact for unchanged). --
    const composed = compose.applyOps(rawJson, {
      order: order, edits: normalizedEdits, deletes: deletes, adds: composableAdds
    });
    if (!composed.ok) return json(res, 500, { error: 'Compose failed: ' + composed.error });

    // ---- Run the real generators on the proposed data (in memory only). -----
    let proposedHtml;
    try {
      proposedHtml = generator.renderProductsHtml(currentHtml, composed.proposedData).html;
    } catch (e) {
      // e.g. placeholder ("xxxxx") leak guard or missing markers — surfaced, not a 500.
      return json(res, 422, { error: 'Generator rejected the proposed catalog', detail: String(e && e.message || e) });
    }

    const jsonChanged = composed.proposedText !== rawJson;
    const htmlChanged = proposedHtml !== currentHtml;
    const effectiveChange = jsonChanged || htmlChanged;

    // ---- Sitemap: stamp ONLY when there is an actual catalog change. ---------
    let sitemap = { status: 'unchanged', changed: false, lastmod: null };
    if (effectiveChange) {
      const today = generator.todayStamp();
      const r = generator.stampProductsLastmod(currentXml, today);
      sitemap = { status: r.status, changed: r.xml !== currentXml, lastmod: r.status === 'updated' ? today : null };
    }

    // ---- Compact diffs only (NEVER the full products.html). ------------------
    const jsonDiff = compose.unifiedDiff(rawJson, composed.proposedText, {
      context: 2, fromFile: 'products.json (current)', toFile: 'products.json (proposed)'
    });
    const htmlDiff = compose.unifiedDiff(currentHtml, proposedHtml, {
      context: 3, fromFile: 'products.html (current)', toFile: 'products.html (proposed)'
    });

    return json(res, 200, {
      preview: true,
      persisted: false, // Stage 2D-2a NEVER persists and NEVER calls GitHub.
      note: 'Preview only — nothing was written. No files changed, no GitHub, no token.',
      summary: composed.summary,
      pendingAdds: pendingAdds,
      productsJson: {
        changed: jsonChanged,
        currentBytes: Buffer.byteLength(rawJson, 'utf8'),
        proposedBytes: Buffer.byteLength(composed.proposedText, 'utf8'),
        identical: !jsonChanged,
        diff: jsonDiff
      },
      productsHtml: {
        changed: htmlChanged,
        currentBytes: Buffer.byteLength(currentHtml, 'utf8'),
        proposedBytes: Buffer.byteLength(proposedHtml, 'utf8'),
        identical: !htmlChanged,
        diff: htmlDiff // compact unified diff ONLY
      },
      sitemap: sitemap,
      counts: seasonCounts(composed.proposedData.products)
    });
  } catch (e) {
    return json(res, 500, { error: 'Unexpected error building publish preview' });
  }
};
