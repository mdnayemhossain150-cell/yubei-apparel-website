'use strict';

/*
 * POST /api/admin/image-validate — STAGE 2C DRY-RUN ONLY (persists nothing).
 *
 * Receives a browser-Canvas-optimized JPEG (base64 data URL) and performs
 * STRUCTURAL/HEADER validation only (magic bytes, EOI, byte cap, SOF dimensions
 * — NOT a full pixel decode). Confirms a safe target filename:
 *   - mode 'replace': the target product's OWN existing filename (server-derived)
 *   - mode 'add':     a proposed non-colliding <season>-NN.jpg
 *
 * Writes nothing to assets/ or products.json. Authoritative server-side
 * decode/re-encode with an approved library is Stage 2D (before any write).
 *
 * Body: { mode: 'replace'|'add', image?: '<existing>', season?: '<season>', dataUrl: 'data:image/jpeg;base64,...' }
 */

const auth = require('./_lib/auth');
const perms = require('./_lib/permissions');
const csrf = require('./_lib/csrf');
const catalog = require('./_lib/catalog');
const image = require('./_lib/image');
const { json } = require('./_lib/http');

const MAX_REQ = 4 * 1024 * 1024; // hard request cap

module.exports = async function (req, res) {
  try {
    if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });

    let session = null;
    try { session = auth.getSessionFromReq(req); } catch (e) { session = null; }
    if (!session) return json(res, 401, { error: 'Not authenticated' });

    if (!perms.roleHasPermission(session.role, perms.PERMISSIONS.IMAGE_UPLOAD)) {
      return json(res, 403, { error: 'Forbidden: image:upload permission required' });
    }
    if (!csrf.verify(req, session)) {
      return json(res, 403, { error: 'Invalid or missing CSRF token' });
    }

    const body = await image.readJsonBodyLarge(req, MAX_REQ);
    if (body && body.__tooLarge) return json(res, 413, { error: 'Upload too large' });

    const dec = image.decodeDataUrl(body && body.dataUrl);
    if (!dec.ok) return json(res, 400, { error: dec.error });

    const v = image.validateJpeg(dec.buf);
    if (!v.ok) return json(res, 400, { error: v.error });

    const mode = body && body.mode;
    let targetFilename = null;

    if (mode === 'replace') {
      if (!body.image || typeof body.image !== 'string') return json(res, 400, { error: 'Missing target image' });
      const current = catalog.findByImage(body.image);
      if (!current) return json(res, 404, { error: 'Product not found' });
      targetFilename = current.image; // ONLY the product's own file — never a client-supplied path
    } else if (mode === 'add') {
      targetFilename = image.safeAddFilename(body.season);
      if (!targetFilename) return json(res, 400, { error: 'Invalid season for target filename' });
    } else {
      return json(res, 400, { error: "mode must be 'replace' or 'add'" });
    }

    return json(res, 200, {
      preview: true,
      persisted: false, // Stage 2C NEVER persists — no asset is written
      note: 'Preview only — no image is saved to the website.',
      mode: mode,
      type: 'image/jpeg',
      bytes: v.bytes,
      width: v.width,
      height: v.height,
      targetFilename: targetFilename
    });
  } catch (e) {
    return json(res, 500, { error: 'Unexpected error validating image' });
  }
};
