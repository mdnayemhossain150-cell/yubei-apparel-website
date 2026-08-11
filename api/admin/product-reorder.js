'use strict';

/*
 * POST /api/admin/product-reorder — STAGE 2B DRY-RUN ONLY (persists nothing).
 *
 * Validates that a proposed ordering is a STRICT permutation of the existing
 * product set (no added / removed / duplicated items). Writes nothing.
 *
 * Request body: { order: ["<image>", ...] }  // every existing image, once
 */

const auth = require('./_lib/auth');
const perms = require('./_lib/permissions');
const csrf = require('./_lib/csrf');
const catalog = require('./_lib/catalog');
const { json, readJsonBody } = require('./_lib/http');

module.exports = async function (req, res) {
  try {
    if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });

    let session = null;
    try { session = auth.getSessionFromReq(req); } catch (e) { session = null; }
    if (!session) return json(res, 401, { error: 'Not authenticated' });

    if (!perms.roleHasPermission(session.role, perms.PERMISSIONS.PRODUCT_REORDER)) {
      return json(res, 403, { error: 'Forbidden: product:reorder permission required' });
    }
    if (!csrf.verify(req, session)) {
      return json(res, 403, { error: 'Invalid or missing CSRF token' });
    }

    const body = await readJsonBody(req);
    const check = catalog.validateReorder(body && body.order);
    if (!check.ok) return json(res, 400, { error: 'Invalid order', detail: check.error });

    return json(res, 200, {
      preview: true,
      persisted: false, // Stage 2B NEVER persists
      note: 'Preview only — the catalog order is not saved to the live website.',
      count: body.order.length
    });
  } catch (e) {
    return json(res, 500, { error: 'Unexpected error processing reorder preview' });
  }
};
