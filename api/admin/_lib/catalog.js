'use strict';

/*
 * catalog.js — read-only helpers over the current products.json.
 *
 * NOTHING here writes to disk. Requiring the JSON bundles it with the function
 * and returns a cached, read-only object. Stage 2B only inspects it.
 */

const crypto = require('crypto');
// _lib/ is two levels under api/admin, so the repo-root products.json is ../../../
const catalog = require('../../../products.json');

function products() {
  return Array.isArray(catalog.products) ? catalog.products : [];
}

function findByImage(image) {
  const list = products();
  for (let i = 0; i < list.length; i++) {
    if (list[i].image === image) return list[i];
  }
  return null;
}

function existingKeys() {
  const list = products();
  return {
    images: new Set(list.map(function (p) { return p.image; })),
    slugs: new Set(list.map(function (p) { return p.slug; })),
    models: new Set(list.map(function (p) { return p.model; }))
  };
}

// Safeguard #1: a temporary internal preview ID that cannot collide with any
// existing image filename, slug, or model. It is clearly synthetic ("preview-…")
// and is never a real catalog identifier.
function makePreviewId() {
  const keys = existingKeys();
  for (let attempt = 0; attempt < 5; attempt++) {
    const id = 'preview-' + crypto.randomBytes(9).toString('hex');
    if (!keys.images.has(id) && !keys.slugs.has(id) && !keys.models.has(id)) return id;
  }
  // Extremely unlikely fallback
  return 'preview-' + Date.now() + '-' + crypto.randomBytes(4).toString('hex');
}

// Validate that a proposed ordering is a STRICT permutation of the existing
// product set — no added, removed, or duplicated items.
function validateReorder(order) {
  const imgs = products().map(function (p) { return p.image; });
  if (!Array.isArray(order)) return { ok: false, error: 'order must be an array' };
  if (order.length !== imgs.length) return { ok: false, error: 'order length mismatch (expected ' + imgs.length + ')' };
  const set = new Set(imgs);
  const seen = new Set();
  for (let i = 0; i < order.length; i++) {
    const k = order[i];
    if (typeof k !== 'string' || !set.has(k)) return { ok: false, error: 'unknown item in order: ' + String(k) };
    if (seen.has(k)) return { ok: false, error: 'duplicate item in order: ' + k };
    seen.add(k);
  }
  return { ok: true };
}

module.exports = {
  products: products,
  findByImage: findByImage,
  existingKeys: existingKeys,
  makePreviewId: makePreviewId,
  validateReorder: validateReorder
};
