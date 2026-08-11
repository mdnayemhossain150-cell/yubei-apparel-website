'use strict';

/*
 * POST /api/admin/product-delete — STAGE 2B DRY-RUN ONLY (persists nothing).
 *
 * Validates that a delete target exists and returns its exact name + model
 * (safeguard #2) so the client can show the user precisely what would be
 * removed. Requires an explicit confirm flag. Writes nothing.
 *
 * Request body: { image: "<existing image filename>", confirm: true }
 */

const auth = require('./_lib/auth');
const perms = require('./_lib/permissions');
const csrf = require('./_lib/csrf');
const catalog = require('./_lib/catalog');
const validate = require('./_lib/validate');
const { json, readJsonBody } = require('./_lib/http');

function has(v) { return v && v !== validate.PLACEHOLDER; }

module.exports = async function (req, res) {
  try {
    if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });

    let session = null;
    try { session = auth.getSessionFromReq(req); } catch (e) { session = null; }
    if (!session) return json(res, 401, { error: 'Not authenticated' });

    if (!perms.roleHasPermission(session.role, perms.PERMISSIONS.PRODUCT_DELETE)) {
      return json(res, 403, { error: 'Forbidden: product:delete permission required' });
    }
    if (!csrf.verify(req, session)) {
      return json(res, 403, { error: 'Invalid or missing CSRF token' });
    }

    const body = await readJsonBody(req);
    const image = body && body.image;
    if (!image || typeof image !== 'string') {
      return json(res, 400, { error: 'Missing target product image key' });
    }
    if (body.confirm !== true) {
      return json(res, 400, { error: 'Explicit confirmation required (confirm: true)' });
    }

    const current = catalog.findByImage(image);
    if (!current) return json(res, 404, { error: 'Product not found' });

    return json(res, 200, {
      preview: true,
      persisted: false, // Stage 2B NEVER persists
      note: 'Preview only — this product is not removed from the live website.',
      image: image,
      target: {
        name: current.name || '',
        model: has(current.model) ? current.model : null, // null => "Available upon inquiry"
        season: current.season || ''
      }
    });
  } catch (e) {
    return json(res, 500, { error: 'Unexpected error processing delete preview' });
  }
};
