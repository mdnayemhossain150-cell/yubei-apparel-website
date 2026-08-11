'use strict';

/*
 * POST /api/admin/login
 * Body: { username, password }
 * On success: sets an HttpOnly session cookie and returns { user, permissions }.
 * Generic error messages only (no username/password enumeration).
 */

const auth = require('./_lib/auth');
const accounts = require('./_lib/accounts');
const perms = require('./_lib/permissions');
const rateLimit = require('./_lib/rateLimit');
const { json, readJsonBody } = require('./_lib/http');

module.exports = async function (req, res) {
  try {
    if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });

    const limited = rateLimit.check(req);
    if (limited.limited) {
      return json(res, 429, { error: 'Too many attempts. Please try again later.' });
    }

    const body = await readJsonBody(req);
    const username = body && body.username;
    const password = body && body.password;

    const account = accounts.getAccountByUsername(username);
    const ok = account ? auth.verifyPassword(password, accounts.getStoredHash(account)) : false;

    if (!ok) {
      rateLimit.record(req, false);
      return json(res, 401, { error: 'Invalid username or password' });
    }
    rateLimit.record(req, true);

    const now = Math.floor(Date.now() / 1000);
    const token = auth.signSession({
      sub: account.id,
      role: account.role,
      iat: now,
      exp: now + auth.SESSION_TTL_SECONDS
    });

    return json(res, 200, {
      user: { id: account.id, username: process.env[account.usernameEnv], role: account.role, label: account.label },
      permissions: perms.permissionsForRole(account.role)
    }, { 'Set-Cookie': auth.buildSessionCookie(token) });
  } catch (e) {
    // e.g. SESSION_SECRET not configured — never leak details to the client.
    return json(res, 500, { error: 'Authentication is not fully configured on the server.' });
  }
};
