'use strict';

/*
 * GET /api/admin/products — READ-ONLY.
 *
 * Reads the existing, unchanged products.json (the current source of truth) and
 * returns the catalog for display in the dashboard. This endpoint performs NO
 * writes and mutates nothing. Requires an authenticated session with the
 * product:view permission (both roles have it).
 */

const auth = require('./_lib/auth');
const perms = require('./_lib/permissions');
const { json } = require('./_lib/http');

// Bundled with the function and read-only. Requiring the JSON guarantees Vercel
// includes the file in the deployment. When (future, approved) write phases add
// editing, this will switch to a fresh fs read.
const catalog = require('../../products.json');

module.exports = function (req, res) {
  if (req.method !== 'GET') return json(res, 405, { error: 'Method not allowed' });

  let session = null;
  try { session = auth.getSessionFromReq(req); } catch (e) { session = null; }
  if (!session) return json(res, 401, { error: 'Not authenticated' });
  if (!perms.roleHasPermission(session.role, perms.PERMISSIONS.PRODUCT_VIEW)) {
    return json(res, 403, { error: 'Forbidden' });
  }

  const products = Array.isArray(catalog.products) ? catalog.products : [];
  return json(res, 200, {
    readOnly: true,
    counts: (catalog._meta && catalog._meta.counts) || null,
    total: products.length,
    products: products
  });
};
