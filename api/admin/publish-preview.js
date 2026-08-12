'use strict';

/*
 * POST /api/admin/publish-preview — STAGE 2D-2a/2D-2b DRY-RUN ONLY (persists nothing).
 *
 * Composes the ENTIRE would-be publish in memory and returns compact diffs + an
 * asset manifest. Proves the full pipeline (products.json -> build-products
 * generators -> products.html + sitemap, PLUS processed image bytes) end-to-end
 * WITHOUT writing anything, WITHOUT any GitHub call, and WITHOUT a GitHub token.
 *
 * Stage 2D-2b additions:
 *   - Accepts staged, already-processed JPEG bytes (from /api/admin/image-process)
 *     for photo replacements and for photo-bearing adds.
 *   - Assembles an in-memory would-be-commit object that carries the asset
 *     Buffers (held only for the request lifetime, then discarded); returns a
 *     manifest (path/action/bytes/sha) — never the binary bytes, never a write.
 *   - Photo-bearing adds become fully composable (no longer pendingAdds).
 *   - An image-only replacement counts as an effective change: the sitemap
 *     /products lastmod IS stamped even though products.html text is unchanged.
 *
 * Guarantees:
 *   - Session (401) -> publish:preview (403) -> CSRF (403).
 *   - Every op RE-VALIDATED server-side; processed photo bytes re-validated.
 *   - NEUTRALITY: a zero-op / net-zero preview returns products.json /
 *     products.html / sitemap.xml BYTE-IDENTICAL and does NOT stamp the sitemap.
 *   - Only compact unified diffs returned — never the full products.html.
 *   - persisted: false on every path; no fs write; no GitHub.
 */

const fs = require('fs');
const path = require('path');

const auth = require('./_lib/auth');
const perms = require('./_lib/permissions');
const csrf = require('./_lib/csrf');
const validate = require('./_lib/validate');
const catalog = require('./_lib/catalog');
const compose = require('./_lib/compose');
const image = require('./_lib/image');
const imageProcess = require('./_lib/imageProcess');
const { json } = require('./_lib/http');

// Bundling anchor (matches api/admin/products.js): requiring the JSON guarantees
// Vercel includes the file. We read RAW TEXT below for byte-exact neutrality.
require('../../products.json');

// build-products.js exports the pure generators (Stage 2D-1). Importing it does
// NOT run its CLI and does NOT touch the filesystem.
const generator = require('../../build-products.js');

const SAFE_IMAGE = /^[a-z0-9][a-z0-9\-]*\.jpg$/;
const MAX_PREVIEW_BODY = 10 * 1024 * 1024; // room for a batch of processed photos
const MAX_PHOTOS = 12;                      // bound in-memory asset bytes per preview

function readText(rel) {
  return fs.readFileSync(path.join(__dirname, '..', '..', rel), 'utf8');
}

// Batch-aware safe filename for a NEW product photo: avoids both the committed
// catalog AND filenames already assigned to earlier adds in THIS preview.
function nextAddFilename(season, used) {
  const sl = image.sanitizeSeason(season);
  if (!sl) return null;
  for (let n = 1; n < 1000; n++) {
    const name = sl + '-' + String(n).padStart(2, '0') + '.jpg';
    if (!used.has(name) && SAFE_IMAGE.test(name)) return name;
  }
  return null;
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

    // Large body: staged processed photos may accompany the op-set.
    const body = await image.readJsonBodyLarge(req, MAX_PREVIEW_BODY);
    if (body && body.__tooLarge) return json(res, 413, { error: 'Preview payload too large' });
    const b = body || {};

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

    const fieldErrors = {};
    const assets = [];        // manifest entries returned to the browser
    const commitAssetFiles = []; // in-memory would-be-commit binary files (Buffers)

    // ---- Edits ---------------------------------------------------------------
    const normalizedEdits = {};
    const edits = (b.edits && typeof b.edits === 'object' && !Array.isArray(b.edits)) ? b.edits : {};
    Object.keys(edits).forEach(function (img) {
      if (!imageSet[img]) { fieldErrors['edit:' + img] = ['unknown product']; return; }
      const v = validate.validateFields(edits[img]);
      if (!v.ok) fieldErrors['edit:' + img] = v.errors;
      else normalizedEdits[img] = v.fields;
    });

    // ---- Deletes -------------------------------------------------------------
    const deletes = Array.isArray(b.deletes) ? b.deletes : [];
    deletes.forEach(function (img) { if (!imageSet[img]) fieldErrors['delete:' + img] = ['unknown product']; });

    // ---- Reorder -------------------------------------------------------------
    let order = null;
    if (b.order != null) {
      const chk = catalog.validateReorder(b.order);
      if (!chk.ok) fieldErrors['order'] = [chk.error];
      else order = b.order;
    }

    // ---- Replace-photo operations (existing products get new bytes). ---------
    // products.json / products.html are unchanged (same filename); the change is
    // an asset write only. Re-validate the processed JPEG bytes server-side.
    const replacePhotos = Array.isArray(b.photos) ? b.photos : [];
    replacePhotos.forEach(function (p, idx) {
      const img = p && p.image;
      if (!img || !imageSet[img]) { fieldErrors['photo:' + idx] = ['unknown product image']; return; }
      const rv = imageProcess.revalidateProcessed(p.dataUrl);
      if (!rv.ok) { fieldErrors['photo:' + idx] = [rv.error]; return; }
      assets.push({ path: 'assets/' + img, action: 'replace', bytes: rv.bytes, width: rv.width, height: rv.height, sha256: rv.sha256 });
      commitAssetFiles.push({ path: 'assets/' + img, buffer: rv.buf, size: rv.bytes, sha256: rv.sha256 });
    });

    // ---- Adds ----------------------------------------------------------------
    // A photo-bearing add is fully composable: its bytes are re-validated, it
    // gets a batch-aware non-colliding <season>-NN.jpg, and it composes into
    // products.json + products.html. An add WITHOUT a photo stays pending.
    const used = new Set(currentImages);
    const composableAdds = [];
    const pendingAdds = [];
    const adds = Array.isArray(b.adds) ? b.adds : [];
    adds.forEach(function (a, idx) {
      const v = validate.validateNewProduct(a && a.fields ? a.fields : a);
      if (!v.ok) { fieldErrors['add:' + idx] = v.errors; return; }
      const f = v.fields;
      if (!a || !a.dataUrl) {
        pendingAdds.push({ name: f.name, reason: 'no photo attached — a new product needs an image to publish' });
        return;
      }
      const rv = imageProcess.revalidateProcessed(a.dataUrl);
      if (!rv.ok) { fieldErrors['add:' + idx] = [rv.error]; return; }
      const fname = nextAddFilename(f.season, used);
      if (!fname) { fieldErrors['add:' + idx] = ['could not assign a safe filename for season ' + f.season]; return; }
      used.add(fname);
      composableAdds.push({
        model: f.model,
        slug: (f.name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
        season: f.season, image: fname, name: f.name, category: f.category,
        sizeRange: f.sizeRange, colors: f.colors, status: 'new', notes: '',
        description: f.description, published: f.published
      });
      assets.push({ path: 'assets/' + fname, action: 'add', bytes: rv.bytes, width: rv.width, height: rv.height, sha256: rv.sha256 });
      commitAssetFiles.push({ path: 'assets/' + fname, buffer: rv.buf, size: rv.bytes, sha256: rv.sha256 });
    });

    if (commitAssetFiles.length > MAX_PHOTOS) {
      return json(res, 413, { error: 'Too many photos in one preview (max ' + MAX_PHOTOS + ')' });
    }
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
      return json(res, 422, { error: 'Generator rejected the proposed catalog', detail: String(e && e.message || e) });
    }

    const jsonChanged = composed.proposedText !== rawJson;
    const htmlChanged = proposedHtml !== currentHtml;
    const assetsChanged = assets.length > 0;
    // Decision (approved): an image-only replacement is an effective catalog change.
    const effectiveChange = jsonChanged || htmlChanged || assetsChanged;

    // ---- Sitemap: stamp ONLY when there is an actual catalog change. ---------
    let sitemap = { status: 'unchanged', changed: false, lastmod: null };
    let proposedXml = currentXml;
    if (effectiveChange) {
      const today = generator.todayStamp();
      const r = generator.stampProductsLastmod(currentXml, today);
      proposedXml = r.xml;
      sitemap = { status: r.status, changed: r.xml !== currentXml, lastmod: r.status === 'updated' ? today : null };
    }

    // ---- Assemble the in-memory would-be commit (shape 2D-3 will hand GitHub).
    // Text files + asset Buffers live in RAM only for this request, then are
    // discarded when the response is sent. NOTHING is written anywhere.
    const commitFiles = [];
    if (jsonChanged) commitFiles.push({ path: 'products.json', type: 'text', content: composed.proposedText });
    if (htmlChanged) commitFiles.push({ path: 'products.html', type: 'text', content: proposedHtml });
    if (sitemap.changed) commitFiles.push({ path: 'sitemap.xml', type: 'text', content: proposedXml });
    commitAssetFiles.forEach(function (f) { commitFiles.push({ path: f.path, type: 'binary', buffer: f.buffer, size: f.size, sha256: f.sha256 }); });
    const totalAssetBytes = commitAssetFiles.reduce(function (n, f) { return n + f.size; }, 0);

    // ---- Compact diffs only (NEVER the full products.html). ------------------
    const jsonDiff = compose.unifiedDiff(rawJson, composed.proposedText, {
      context: 2, fromFile: 'products.json (current)', toFile: 'products.json (proposed)'
    });
    const htmlDiff = compose.unifiedDiff(currentHtml, proposedHtml, {
      context: 3, fromFile: 'products.html (current)', toFile: 'products.html (proposed)'
    });

    return json(res, 200, {
      preview: true,
      persisted: false, // NEVER persists and NEVER calls GitHub.
      note: 'Preview only — nothing was written. No files changed, no assets saved, no GitHub, no token.',
      summary: {
        edited: composed.summary.edited,
        deleted: composed.summary.deleted,
        added: composed.summary.added,
        reordered: composed.summary.reordered,
        photosReplaced: replacePhotos.length,
        effectiveChange: effectiveChange
      },
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
      assets: assets, // manifest only — bytes are NOT returned
      wouldBeCommit: {
        fileCount: commitFiles.length,
        textFiles: commitFiles.filter(function (f) { return f.type === 'text'; }).map(function (f) { return f.path; }),
        assetFiles: assets.map(function (a) { return { path: a.path, action: a.action, bytes: a.bytes, sha256: a.sha256 }; }),
        totalAssetBytes: totalAssetBytes
      },
      counts: seasonCounts(composed.proposedData.products)
    });
  } catch (e) {
    return json(res, 500, { error: 'Unexpected error building publish preview' });
  }
};
