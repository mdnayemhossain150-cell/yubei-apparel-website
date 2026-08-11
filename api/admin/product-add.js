'use strict';

/*
 * POST /api/admin/product-add — STAGE 2B DRY-RUN ONLY (persists nothing).
 *
 * Validates a proposed NEW product and returns a preview record with a
 * temporary internal preview ID (safeguard #1) that cannot collide with any
 * existing image filename, slug, or model. No real catalog identifier is
 * assigned; no photo is attached (that is Stage 2C). Writes nothing.
 */

const auth = require('./_lib/auth');
const perms = require('./_lib/permissions');
const csrf = require('./_lib/csrf');
const validate = require('./_lib/validate');
const catalog = require('./_lib/catalog');
const { json, readJsonBody } = require('./_lib/http');

module.exports = async function (req, res) {
  try {
    if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });

    let session = null;
    try { session = auth.getSessionFromReq(req); } catch (e) { session = null; }
    if (!session) return json(res, 401, { error: 'Not authenticated' });

    if (!perms.roleHasPermission(session.role, perms.PERMISSIONS.PRODUCT_ADD)) {
      return json(res, 403, { error: 'Forbidden: product:add permission required' });
    }
    if (!csrf.verify(req, session)) {
      return json(res, 403, { error: 'Invalid or missing CSRF token' });
    }

    const body = await readJsonBody(req);
    const v = validate.validateNewProduct(body && body.fields);
    if (!v.ok) {
      return json(res, 400, { error: 'Validation failed', fieldErrors: v.errors, editable: validate.EDITABLE });
    }

    const previewId = catalog.makePreviewId();

    return json(res, 200, {
      preview: true,
      persisted: false, // Stage 2B NEVER persists
      note: 'Preview only — this product is not saved to the live website.',
      previewId: previewId,
      product: Object.assign({ previewId: previewId, image: null, photoPending: true }, v.fields)
    });
  } catch (e) {
    return json(res, 500, { error: 'Unexpected error processing add preview' });
  }
};
