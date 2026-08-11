'use strict';

/*
 * GET /api/admin/health — TEMPORARY, PREVIEW-ONLY configuration diagnostic.
 *
 * Reports ONLY whether each required environment variable NAME is present
 * (booleans) and whether the values meet basic format rules. It NEVER returns
 * any secret value (no SESSION_SECRET, no hashes, no usernames).
 *
 * Safety:
 *   - Returns 404 on production (VERCEL_ENV === 'production'), so it is inert
 *     even if this branch is ever merged.
 *   - Marked no-store + noindex.
 *
 * Purpose: pinpoint env-var misconfiguration (e.g. a key typo/trailing space,
 * wrong scope, or a value < 16 chars) that makes login return 500.
 * REMOVE or gate behind auth before go-live.
 */

const { json } = require('./_lib/http');

function present(name) {
  return typeof process.env[name] === 'string' && process.env[name].length > 0;
}
function looksLikeScrypt(name) {
  return /^scrypt\$\d+\$[0-9a-f]+\$[0-9a-f]+$/.test(process.env[name] || '');
}

module.exports = function (req, res) {
  if (process.env.VERCEL_ENV === 'production') {
    res.statusCode = 404;
    res.end('Not found');
    return;
  }
  const secret = process.env.SESSION_SECRET || '';
  return json(res, 200, {
    ok: true,
    vercelEnv: process.env.VERCEL_ENV || null, // "preview" | "development" (not secret)
    nodeVersion: process.version,
    vars: {
      // booleans only — no values are ever returned
      SESSION_SECRET: { present: present('SESSION_SECRET'), lengthOK: secret.length >= 16 },
      SUPER_ADMIN_USERNAME: { present: present('SUPER_ADMIN_USERNAME') },
      SUPER_ADMIN_PASSWORD_HASH: {
        present: present('SUPER_ADMIN_PASSWORD_HASH'),
        looksLikeScrypt: looksLikeScrypt('SUPER_ADMIN_PASSWORD_HASH')
      },
      CONTENT_ADMIN_USERNAME: { present: present('CONTENT_ADMIN_USERNAME') },
      CONTENT_ADMIN_PASSWORD_HASH: {
        present: present('CONTENT_ADMIN_PASSWORD_HASH'),
        looksLikeScrypt: looksLikeScrypt('CONTENT_ADMIN_PASSWORD_HASH')
      }
    }
  });
};
