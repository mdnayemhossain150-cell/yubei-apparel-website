'use strict';

/*
 * image.js — Stage 2C image checks. NO third-party library and NO full pixel
 * decode. This performs STRUCTURAL / HEADER validation only:
 *   - magic bytes (JPEG starts FF D8 FF)
 *   - EOI trailer (FF D9)
 *   - byte-size cap
 *   - dimensions parsed from the JPEG SOF marker (header parse, not a decode)
 *
 * The browser Canvas is what actually decodes the user's original file and
 * re-encodes it to JPEG. Authoritative server-side decode/re-encode/validation
 * with an approved image library is deferred to Stage 2D (before any write).
 */

const catalog = require('./catalog');

const MAX_BYTES = 300 * 1024;   // optimized JPEG must be <= 300KB
const MAX_B64 = 600 * 1024;     // base64 string cap (pre-decode)
const MIN_DIM = 400;
const MAX_DIM = 4000;
const SEASONS = { winter: 'winter', summer: 'summer', autumn: 'autumn', mix: 'mix' };

function isJpegMagic(buf) {
  return !!buf && buf.length >= 3 && buf[0] === 0xFF && buf[1] === 0xD8 && buf[2] === 0xFF;
}
function hasJpegEOI(buf) {
  return !!buf && buf.length >= 2 && buf[buf.length - 2] === 0xFF && buf[buf.length - 1] === 0xD9;
}

// Parse width/height from the first Start-Of-Frame marker. Header walk only.
function jpegDimensions(buf) {
  let i = 2;
  while (i + 1 < buf.length) {
    if (buf[i] !== 0xFF) { i++; continue; }
    let marker = buf[i + 1];
    if (marker === 0xFF) { i++; continue; }              // fill byte
    if (marker === 0xD8 || marker === 0xD9) { i += 2; continue; }
    if (marker >= 0xD0 && marker <= 0xD7) { i += 2; continue; } // RSTn (no length)
    if (i + 3 >= buf.length) break;
    const len = (buf[i + 2] << 8) | buf[i + 3];
    const isSOF = (marker >= 0xC0 && marker <= 0xCF) && marker !== 0xC4 && marker !== 0xC8 && marker !== 0xCC;
    if (isSOF) {
      if (i + 8 >= buf.length) break;
      const height = (buf[i + 5] << 8) | buf[i + 6];
      const width = (buf[i + 7] << 8) | buf[i + 8];
      return { width: width, height: height };
    }
    if (len < 2) break;
    i += 2 + len;
  }
  return null;
}

function decodeDataUrl(dataUrl) {
  if (typeof dataUrl !== 'string') return { ok: false, error: 'missing image data' };
  const m = /^data:image\/jpeg;base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  if (!m) return { ok: false, error: 'image must be a base64 JPEG data URL' };
  const b64 = m[1];
  if (b64.length > MAX_B64) return { ok: false, error: 'image too large (before decode)' };
  let buf;
  try { buf = Buffer.from(b64, 'base64'); } catch (e) { return { ok: false, error: 'invalid base64' }; }
  if (!buf || buf.length === 0) return { ok: false, error: 'empty image' };
  return { ok: true, buf: buf };
}

function validateJpeg(buf) {
  if (!isJpegMagic(buf)) return { ok: false, error: 'not a JPEG (magic bytes)' };
  if (!hasJpegEOI(buf)) return { ok: false, error: 'truncated or invalid JPEG (no EOI)' };
  if (buf.length > MAX_BYTES) return { ok: false, error: 'optimized image exceeds ' + Math.round(MAX_BYTES / 1024) + 'KB' };
  const dim = jpegDimensions(buf);
  if (!dim || !dim.width || !dim.height) return { ok: false, error: 'could not read JPEG dimensions' };
  if (dim.width < MIN_DIM || dim.height < MIN_DIM) return { ok: false, error: 'image too small (min ' + MIN_DIM + 'px)' };
  if (dim.width > MAX_DIM || dim.height > MAX_DIM) return { ok: false, error: 'image too large (max ' + MAX_DIM + 'px)' };
  return { ok: true, width: dim.width, height: dim.height, bytes: buf.length };
}

function sanitizeSeason(s) {
  const k = String(s || '').toLowerCase();
  return SEASONS[k] || null;
}

// Propose a safe, non-colliding filename for a NEW product's photo.
function safeAddFilename(season) {
  const sl = sanitizeSeason(season);
  if (!sl) return null;
  const keys = catalog.existingKeys();
  for (let n = 1; n < 1000; n++) {
    const name = sl + '-' + String(n).padStart(2, '0') + '.jpg';
    if (!keys.images.has(name)) return name;
  }
  return null;
}

// Body reader with an explicit large cap (the shared JSON reader caps at 100KB,
// which is too small for images and stays unchanged for other endpoints).
function readJsonBodyLarge(req, maxBytes) {
  return new Promise(function (resolve) {
    if (req.body != null) {
      if (typeof req.body === 'object') return resolve(req.body);
      if (typeof req.body === 'string') { try { return resolve(JSON.parse(req.body)); } catch (e) { return resolve({}); } }
    }
    const chunks = [];
    let size = 0, aborted = false;
    req.on('data', function (c) {
      size += c.length;
      if (size > maxBytes) { aborted = true; try { req.destroy(); } catch (e) {} }
      else chunks.push(c);
    });
    req.on('end', function () {
      if (aborted) return resolve({ __tooLarge: true });
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')); } catch (e) { resolve({}); }
    });
    req.on('error', function () { resolve({}); });
  });
}

module.exports = {
  MAX_BYTES: MAX_BYTES, MIN_DIM: MIN_DIM, MAX_DIM: MAX_DIM,
  isJpegMagic: isJpegMagic, hasJpegEOI: hasJpegEOI, jpegDimensions: jpegDimensions,
  decodeDataUrl: decodeDataUrl, validateJpeg: validateJpeg,
  sanitizeSeason: sanitizeSeason, safeAddFilename: safeAddFilename,
  readJsonBodyLarge: readJsonBodyLarge
};
