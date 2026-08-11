'use strict';

/*
 * POST /api/admin/product-update — STAGE 2A DRY-RUN ONLY.
 *
 * Validates a proposed edit to one existing product and returns a field-level
 * diff. It PERSISTS NOTHING: no file is written, no GitHub call is made. The
 * response always reports `persisted: false`.
 *
 * Guarantees:
 *   - Authenticated session required (401 otherwise).
 *   - Server-side permission check: product:edit (403 otherwise).
 *   - CSRF header required (403 otherwise).
 *   - STRICT whitelist: only name/model/sizeRange/description/category/season/
 *     colors/published may be edited; image/id/slug/status/notes/unknown are
 *     rejected (400).
 *   - Never invents a model number or size (blank -> "Available upon inquiry").
 *
 * Request body: { image: "<existing image filename>", fields: { ...editable... } }
 */

const auth = require('./_lib/auth');
const perms = require('./_lib/permissions');
const csrf = require('./_lib/csrf');
const validate = require('./_lib/validate');
const { json, readJsonBody } = require('./_lib/http');

// Read-only. Requiring the JSON bundles the current source of truth with the
// function; it is cloned in memory and never written back in Stage 2A.
const catalog = require('../../products.json');

function sameValue(a, b) {
  return JSON.stringify(a === undefined ? null : a) === JSON.stringify(b === undefined ? null : b);
}

module.exports = async function (req, res) {
  try {
    if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });

    let session = null;
    try { session = auth.getSessionFromReq(req); } catch (e) { session = null; }
    if (!session) return json(res, 401, { error: 'Not authenticated' });

    if (!perms.roleHasPermission(session.role, perms.PERMISSIONS.PRODUCT_EDIT)) {
      return json(res, 403, { error: 'Forbidden: product:edit permission required' });
    }

    if (!csrf.verify(req, session)) {
      return json(res, 403, { error: 'Invalid or missing CSRF token' });
    }

    const body = await readJsonBody(req);
    const image = body && body.image;
    const fields = body && body.fields;

    if (!image || typeof image !== 'string') {
      return json(res, 400, { error: 'Missing target product image key' });
    }

    const products = Array.isArray(catalog.products) ? catalog.products : [];
    const current = products.find(function (p) { return p.image === image; });
    if (!current) return json(res, 404, { error: 'Product not found' });

    const v = validate.validateFields(fields);
    if (!v.ok) {
      return json(res, 400, { error: 'Validation failed', fieldErrors: v.errors, editable: validate.EDITABLE });
    }

    // Apply to an in-memory clone ONLY — compute the diff, write nothing.
    const changed = {};
    Object.keys(v.fields).forEach(function (k) {
      if (!sameValue(current[k], v.fields[k])) {
        changed[k] = { from: current[k] === undefined ? null : current[k], to: v.fields[k] };
      }
    });

    return json(res, 200, {
      preview: true,
      persisted: false, // Stage 2A NEVER persists a catalog change
      note: 'Preview only — changes are not saved to the live website.',
      image: image,
      changed: changed,
      normalized: v.fields
    });
  } catch (e) {
    return json(res, 500, { error: 'Unexpected error processing edit preview' });
  }
};
