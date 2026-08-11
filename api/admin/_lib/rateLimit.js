'use strict';

/*
 * rateLimit.js — best-effort, in-memory login throttle.
 *
 * LIMITATION: serverless instances are ephemeral and are not guaranteed to
 * share memory, so this is a first line of defence rather than a hard global
 * limit. A durable store (e.g. Vercel KV) is planned for production hardening
 * in a later, approved phase.
 */

const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_ATTEMPTS = 8;
const attempts = new Map();

function keyFor(req) {
  const h = (req && req.headers) || {};
  const fwd = h['x-forwarded-for'] || h['x-real-ip'] || '';
  const ip = String(fwd).split(',')[0].trim() ||
    (req && req.socket && req.socket.remoteAddress) || 'unknown';
  return ip;
}

function check(req) {
  const key = keyFor(req);
  const now = Date.now();
  const rec = attempts.get(key);
  if (!rec || now - rec.first > WINDOW_MS) return { limited: false };
  return {
    limited: rec.count >= MAX_ATTEMPTS,
    retryAfterMs: WINDOW_MS - (now - rec.first)
  };
}

function record(req, success) {
  const key = keyFor(req);
  const now = Date.now();
  if (success) { attempts.delete(key); return; }
  const rec = attempts.get(key);
  if (!rec || now - rec.first > WINDOW_MS) {
    attempts.set(key, { first: now, count: 1 });
  } else {
    rec.count += 1;
  }
}

module.exports = { check: check, record: record, WINDOW_MS: WINDOW_MS, MAX_ATTEMPTS: MAX_ATTEMPTS };
