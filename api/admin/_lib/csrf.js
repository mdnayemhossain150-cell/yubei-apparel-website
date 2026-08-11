'use strict';

/*
 * csrf.js — double-submit CSRF protection for write endpoints.
 *
 * The token is derived (HMAC-SHA256) from the authenticated session, so it
 * cannot be forged without the server secret, and a cross-site page cannot read
 * it (the /api/admin/csrf response requires the SameSite=Strict session cookie,
 * which browsers will not send cross-site). Writes must echo it in the
 * `X-Admin-CSRF` request header.
 */

const crypto = require('crypto');

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s || String(s).length < 16) throw new Error('SESSION_SECRET is missing or too short');
  return s;
}

function tokenFor(session) {
  if (!session || !session.sub) return '';
  return crypto.createHmac('sha256', secret())
    .update('csrf|' + session.sub + '|' + session.iat)
    .digest('hex');
}

function verify(req, session) {
  try {
    const h = (req && req.headers) || {};
    const header = h['x-admin-csrf'] || h['X-Admin-CSRF'] || '';
    const expected = tokenFor(session);
    if (!header || !expected) return false;
    const a = Buffer.from(String(header));
    const b = Buffer.from(expected);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  } catch (e) {
    return false;
  }
}

module.exports = { tokenFor: tokenFor, verify: verify };
