'use strict';

/*
 * GET /api/admin/csrf — returns the CSRF token bound to the current session.
 * Requires an authenticated session. The token must be sent back in the
 * `X-Admin-CSRF` header on write requests. No secret value is exposed.
 */

const auth = require('./_lib/auth');
const csrf = require('./_lib/csrf');
const { json } = require('./_lib/http');

module.exports = function (req, res) {
  if (req.method !== 'GET') return json(res, 405, { error: 'Method not allowed' });

  let session = null;
  try { session = auth.getSessionFromReq(req); } catch (e) { session = null; }
  if (!session) return json(res, 401, { error: 'Not authenticated' });

  return json(res, 200, { csrfToken: csrf.tokenFor(session) });
};
