'use strict';

/*
 * imageProcess.js — Stage 2D-2b AUTHORITATIVE server-side image processing.
 *
 * Unlike Stage 2C (browser Canvas + header-only checks), this FULLY DECODES the
 * input with `sharp` and RE-ENCODES it from raw pixels to a canonical catalog
 * JPEG. That is the security value: a full decode rejects corrupt/hostile
 * payloads that pass header checks, and re-encoding from pixels guarantees clean,
 * metadata-free output.
 *
 * DRY RUN: this returns processed BYTES in memory only. It performs NO
 * filesystem write, NO persistence, and NO network/GitHub call.
 *
 * Output standard (matches the existing 2C catalog images): portrait JPEG,
 * width 825 (no enlargement), quality 86 (mozjpeg), 4:2:0, progressive, sRGB,
 * alpha flattened to white, ALL metadata (EXIF/GPS/XMP/ICC) stripped.
 */

const crypto = require('crypto');
const sharp = require('sharp');
const imageChecks = require('./image'); // reuse 2C caps: MAX_BYTES, MIN_DIM, MAX_DIM

const TARGET_WIDTH = 825;
const QUALITY_STEPS = [86, 80, 74];           // retry down if > MAX_BYTES
const LIMIT_INPUT_PIXELS = 40 * 1000 * 1000;  // ~40 MP decompression-bomb guard
const ALLOWED_FORMATS = { jpeg: true, png: true, webp: true };
const MAX_B64 = 8 * 1024 * 1024;              // base64 string cap before decode

// Parse an accepted image data URL (jpeg/png/webp) to a Buffer.
function decodeImageDataUrl(dataUrl) {
  if (typeof dataUrl !== 'string') return { ok: false, code: 400, error: 'missing image data' };
  const m = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  if (!m) return { ok: false, code: 400, error: 'image must be a base64 JPEG/PNG/WebP data URL' };
  if (m[2].length > MAX_B64) return { ok: false, code: 413, error: 'image too large (before decode)' };
  let buf;
  try { buf = Buffer.from(m[2], 'base64'); } catch (e) { return { ok: false, code: 400, error: 'invalid base64' }; }
  if (!buf || buf.length === 0) return { ok: false, code: 400, error: 'empty image' };
  return { ok: true, buf: buf };
}

// Authoritatively decode + re-encode. Returns
// { ok, buf, base64, bytes, width, height, sha256 } or { ok:false, code, error }.
async function process(inputBuf) {
  let meta;
  try {
    meta = await sharp(inputBuf, { limitInputPixels: LIMIT_INPUT_PIXELS, failOn: 'error' }).metadata();
  } catch (e) {
    return { ok: false, code: 422, error: 'corrupt or unreadable image' };
  }
  if (!meta || !ALLOWED_FORMATS[meta.format]) {
    return { ok: false, code: 415, error: 'unsupported image type: ' + (meta && meta.format || 'unknown') };
  }
  if (meta.pages && meta.pages > 1) {
    return { ok: false, code: 415, error: 'animated images are not allowed' };
  }

  let out = null;
  for (let i = 0; i < QUALITY_STEPS.length; i++) {
    try {
      out = await sharp(inputBuf, { limitInputPixels: LIMIT_INPUT_PIXELS, failOn: 'error' })
        .rotate()                               // auto-orient from EXIF, then tag is dropped
        .flatten({ background: '#ffffff' })     // composite any alpha onto white
        .resize({ width: TARGET_WIDTH, withoutEnlargement: true })
        .toColourspace('srgb')
        .jpeg({ quality: QUALITY_STEPS[i], mozjpeg: true, chromaSubsampling: '4:2:0', progressive: true })
        .toBuffer();
    } catch (e) {
      return { ok: false, code: 422, error: 'could not process image' };
    }
    if (out.length <= imageChecks.MAX_BYTES) break;
  }
  if (!out || out.length > imageChecks.MAX_BYTES) {
    return { ok: false, code: 422, error: 'processed image exceeds ' + Math.round(imageChecks.MAX_BYTES / 1024) + 'KB even at lowest quality' };
  }

  // Confirm output dimensions from the re-encoded bytes.
  let outMeta;
  try { outMeta = await sharp(out).metadata(); } catch (e) { return { ok: false, code: 422, error: 'could not verify processed image' }; }
  const w = outMeta.width, h = outMeta.height;
  if (!w || !h) return { ok: false, code: 422, error: 'could not read processed dimensions' };
  if (w < imageChecks.MIN_DIM || h < imageChecks.MIN_DIM) return { ok: false, code: 400, error: 'image too small (min ' + imageChecks.MIN_DIM + 'px)' };
  if (w > imageChecks.MAX_DIM || h > imageChecks.MAX_DIM) return { ok: false, code: 400, error: 'image too large (max ' + imageChecks.MAX_DIM + 'px)' };

  const sha256 = crypto.createHash('sha256').update(out).digest('hex');
  return {
    ok: true,
    buf: out,
    base64: 'data:image/jpeg;base64,' + out.toString('base64'),
    bytes: out.length,
    width: w,
    height: h,
    sha256: sha256
  };
}

// Structural re-validation of ALREADY-PROCESSED JPEG bytes (e.g. bytes staged in
// the browser and re-sent to publish-preview). Does NOT re-encode — that would
// change the bytes/sha the user already previewed. Reuses the 2C header checks
// and computes the authoritative sha256 from the received bytes.
function revalidateProcessed(dataUrl) {
  const dec = imageChecks.decodeDataUrl(dataUrl); // strict JPEG-only
  if (!dec.ok) return { ok: false, code: 400, error: dec.error };
  const v = imageChecks.validateJpeg(dec.buf);
  if (!v.ok) return { ok: false, code: 400, error: v.error };
  return {
    ok: true,
    buf: dec.buf,
    bytes: dec.buf.length,
    width: v.width,
    height: v.height,
    sha256: crypto.createHash('sha256').update(dec.buf).digest('hex')
  };
}

module.exports = {
  TARGET_WIDTH: TARGET_WIDTH,
  QUALITY_STEPS: QUALITY_STEPS,
  LIMIT_INPUT_PIXELS: LIMIT_INPUT_PIXELS,
  ALLOWED_FORMATS: ALLOWED_FORMATS,
  decodeImageDataUrl: decodeImageDataUrl,
  process: process,
  revalidateProcessed: revalidateProcessed
};
