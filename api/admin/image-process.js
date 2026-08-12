'use strict';

/*
 * POST /api/admin/image-process — STAGE 2D-2b DRY-RUN ONLY (persists nothing).
 *
 * AUTHORITATIVE server-side image handling: fully decodes the input
 * (JPEG/PNG/WebP) with sharp and re-encodes it to a canonical catalog JPEG,
 * stripping all metadata. Supersedes the Stage 2C header-only /image-validate
 * for the staging flow (image-validate stays for backward compatibility).
 *
 * Returns the processed JPEG (base64) + descriptor + a safe target filename so
 * the browser can preview and stage it. Writes NOTHING to assets/ or
 * products.json; no GitHub; no token; no persistence.
 *
 * Body: { mode:'replace'|'add', image?:'<existing>', season?:'<season>', dataUrl:'data:image/(jpeg|png|webp);base64,...' }
 */

const auth = require('./_lib/auth');
const perms = require('./_lib/permissions');
const csrf = require('./_lib/csrf');
const catalog = require('./_lib/catalog');
const image = require('./_lib/image');
const imageProcess = require('./_lib/imageProcess');
const { json } = require('./_lib/http');

const MAX_REQ = 12 * 1024 * 1024; // hard request cap (originals may be larger than the optimized output)

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

    const dec = imageProcess.decodeImageDataUrl(body && body.dataUrl);
    if (!dec.ok) return json(res, dec.code || 400, { error: dec.error });

    const result = await imageProcess.process(dec.buf);
    if (!result.ok) return json(res, result.code || 422, { error: result.error });

    // Resolve a safe target filename. For 'add' this is a PROPOSAL — publish-preview
    // re-assigns add filenames batch-aware to avoid collisions between multiple
    // staged adds in the same season.
    const mode = body && body.mode;
    let targetFilename = null;
    if (mode === 'replace') {
      if (!body.image || typeof body.image !== 'string') return json(res, 400, { error: 'Missing target image' });
      const current = catalog.findByImage(body.image);
      if (!current) return json(res, 404, { error: 'Product not found' });
      targetFilename = current.image; // the product's OWN file only — never a client path
    } else if (mode === 'add') {
      targetFilename = image.safeAddFilename(body.season);
      if (!targetFilename) return json(res, 400, { error: 'Invalid season for target filename' });
    } else {
      return json(res, 400, { error: "mode must be 'replace' or 'add'" });
    }

    return json(res, 200, {
      preview: true,
      persisted: false, // Stage 2D-2b NEVER persists — no asset is written
      note: 'Preview only — the image is processed in memory; nothing is saved.',
      mode: mode,
      type: 'image/jpeg',
      bytes: result.bytes,
      width: result.width,
      height: result.height,
      sha256: result.sha256,
      targetFilename: targetFilename,
      processedDataUrl: result.base64 // canonical JPEG for browser preview + staging
    });
  } catch (e) {
    return json(res, 500, { error: 'Unexpected error processing image' });
  }
};
