'use strict';

/*
 * GET /api/admin/session — returns the current authenticated user + permissions,
 * or { authenticated: false } with 401 if there is no valid session.
 */

const auth = require('./_lib/auth');
const accounts = require('./_lib/accounts');
const perms = require('./_lib/permissions');
const { json } = require('./_lib/http');

module.exports = function (req, res) {
  if (req.method !== 'GET') return json(res, 405, { error: 'Method not allowed' });

  let session = null;
  try { session = auth.getSessionFromReq(req); } catch (e) { session = null; }
  if (!session) return json(res, 401, { authenticated: false });

  const account = accounts.getAccountById(session.sub);
  const username = account ? (process.env[account.usernameEnv] || null) : null;

  return json(res, 200, {
    authenticated: true,
    user: {
      id: session.sub,
      role: session.role,
      username: username,
      label: account ? account.label : session.role
    },
    permissions: perms.permissionsForRole(session.role)
  });
};
