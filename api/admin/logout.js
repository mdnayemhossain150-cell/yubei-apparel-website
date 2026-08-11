'use strict';

/*
 * POST /api/admin/logout — clears the session cookie.
 */

const auth = require('./_lib/auth');
const { json } = require('./_lib/http');

module.exports = function (req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });
  return json(res, 200, { ok: true }, { 'Set-Cookie': auth.clearSessionCookie() });
};
