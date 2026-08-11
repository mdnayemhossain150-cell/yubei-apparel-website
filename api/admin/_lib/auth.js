'use strict';

/*
 * auth.js — password hashing + stateless session tokens, using ONLY Node's
 * built-in `crypto` module (no third-party dependencies).
 *
 *  - Passwords: scrypt (memory-hard KDF) with a per-account random salt.
 *    Stored format:  scrypt$<costLog2>$<saltHex>$<hashHex>
 *  - Sessions: an HMAC-SHA256 signed, expiring token kept in an HttpOnly cookie.
 *
 * Secrets (SESSION_SECRET and the account password hashes) come exclusively from
 * server-side environment variables — never from source, HTML, or the browser.
 */

const crypto = require('crypto');

const SESSION_COOKIE = 'yb_admin_session';
const SESSION_TTL_SECONDS = 60 * 60 * 2; // 2 hours

// ---------------------------------------------------------------------------
// Password hashing (scrypt)
// ---------------------------------------------------------------------------
function scryptParams(costLog2) {
  const N = Math.pow(2, costLog2);
  return { N: N, r: 8, p: 1, maxmem: 256 * 1024 * 1024 };
}

function hashPassword(password, costLog2) {
  const cost = costLog2 || 15; // 2^15 = 32768
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(String(password), salt, 64, scryptParams(cost));
  return 'scrypt$' + cost + '$' + salt.toString('hex') + '$' + hash.toString('hex');
}

function verifyPassword(password, stored) {
  try {
    if (!stored || typeof stored !== 'string') return false;
    const parts = stored.split('$');
    if (parts.length !== 4 || parts[0] !== 'scrypt') return false;
    const cost = parseInt(parts[1], 10);
    if (!(cost >= 12 && cost <= 20)) return false;
    const salt = Buffer.from(parts[2], 'hex');
    const expected = Buffer.from(parts[3], 'hex');
    const actual = crypto.scryptSync(String(password), salt, expected.length, scryptParams(cost));
    return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
  } catch (e) {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Session tokens (HMAC-signed, stateless)
// ---------------------------------------------------------------------------
function b64url(buf) {
  return Buffer.from(buf).toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function b64urlDecode(str) {
  return Buffer.from(String(str).replace(/-/g, '+').replace(/_/g, '/'), 'base64');
}
function getSecret() {
  const s = process.env.SESSION_SECRET;
  if (!s || String(s).length < 16) {
    throw new Error('SESSION_SECRET is missing or too short (needs >= 16 chars)');
  }
  return s;
}
function signSession(payload) {
  const body = b64url(JSON.stringify(payload));
  const sig = b64url(crypto.createHmac('sha256', getSecret()).update(body).digest());
  return body + '.' + sig;
}
function verifySession(token) {
  if (!token || typeof token !== 'string' || token.indexOf('.') === -1) return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const body = parts[0];
  const sig = parts[1];
  let expected;
  try {
    expected = b64url(crypto.createHmac('sha256', getSecret()).update(body).digest());
  } catch (e) {
    return null;
  }
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  let payload;
  try {
    payload = JSON.parse(b64urlDecode(body).toString('utf8'));
  } catch (e) {
    return null;
  }
  if (!payload || typeof payload.exp !== 'number' || Date.now() / 1000 > payload.exp) return null;
  return payload;
}

// ---------------------------------------------------------------------------
// Cookie helpers (HttpOnly + Secure + SameSite=Strict)
// ---------------------------------------------------------------------------
function buildSessionCookie(token, maxAgeSeconds) {
  return [
    SESSION_COOKIE + '=' + token,
    'Path=/',
    'HttpOnly',
    'Secure',
    'SameSite=Strict',
    'Max-Age=' + (maxAgeSeconds != null ? maxAgeSeconds : SESSION_TTL_SECONDS)
  ].join('; ');
}
function clearSessionCookie() {
  return SESSION_COOKIE + '=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0';
}
function parseCookies(req) {
  const header = (req.headers && req.headers.cookie) || '';
  const out = {};
  String(header).split(';').forEach(function (pair) {
    const idx = pair.indexOf('=');
    if (idx > -1) {
      const k = pair.slice(0, idx).trim();
      const v = pair.slice(idx + 1).trim();
      if (k) { try { out[k] = decodeURIComponent(v); } catch (e) { out[k] = v; } }
    }
  });
  return out;
}
function getSessionFromReq(req) {
  const cookies = parseCookies(req);
  return verifySession(cookies[SESSION_COOKIE]);
}

module.exports = {
  SESSION_COOKIE: SESSION_COOKIE,
  SESSION_TTL_SECONDS: SESSION_TTL_SECONDS,
  hashPassword: hashPassword,
  verifyPassword: verifyPassword,
  signSession: signSession,
  verifySession: verifySession,
  buildSessionCookie: buildSessionCookie,
  clearSessionCookie: clearSessionCookie,
  parseCookies: parseCookies,
  getSessionFromReq: getSessionFromReq
};
