'use strict';

/*
 * validate.js — Stage 2A field validation + STRICT editable whitelist.
 *
 * Safeguard #1: ONLY these fields may be edited. Any other key — including
 * image / id / slug / status / notes or anything unknown — is rejected.
 *
 * Never invents a model number or size: a blank value normalizes to the
 * internal placeholder 'xxxxx' (which the catalog renders as
 * "Available upon inquiry"). It is never auto-generated.
 */

const PLACEHOLDER = 'xxxxx';

// The only fields a write may touch (internal product.json keys).
// UI labels map: "model number"->model, "size"->sizeRange, "publish status"->published.
const EDITABLE = ['name', 'model', 'sizeRange', 'description', 'category', 'season', 'colors', 'published'];

// Explicitly protected keys — named for clear rejection messages.
const PROTECTED = ['image', 'id', 'slug', 'status', 'notes'];

const SEASONS = ['Winter', 'Summer', 'Autumn', 'Mix'];

// Strip ASCII control characters (0x00-0x1F and 0x7F) only. Built via RegExp
// constructor so the source stays pure ASCII (no literal control bytes).
// Hyphens, '#', '/', '+', letters and digits are all preserved.
var CONTROL_CHARS = new RegExp('[\\u0000-\\u001F\\u007F]+', 'g');
var WHITESPACE = new RegExp('\\s+', 'g');
function stripControl(s) {
  return String(s == null ? '' : s)
    .replace(CONTROL_CHARS, ' ')
    .replace(WHITESPACE, ' ')
    .trim();
}

// Allowed characters for model numbers / sizes (e.g. YB0176-1, 120-160, 6Y-14Y, 315628#).
var MODEL_SIZE_CHARS = new RegExp('^[A-Za-z0-9#+\\-/. ]+$');

function validateFields(input) {
  const errors = [];
  if (input == null || typeof input !== 'object' || Array.isArray(input)) {
    return { ok: false, errors: ['`fields` must be an object'], fields: {} };
  }

  // Safeguard #1 — reject anything outside the whitelist BEFORE processing.
  Object.keys(input).forEach(function (k) {
    if (EDITABLE.indexOf(k) === -1) {
      if (PROTECTED.indexOf(k) !== -1) errors.push("Field '" + k + "' cannot be modified");
      else errors.push("Unknown field '" + k + "' rejected");
    }
  });
  if (errors.length) return { ok: false, errors: errors, fields: {} };

  const out = {};

  if ('name' in input) {
    const name = stripControl(input.name);
    if (!name) errors.push('name is required');
    else if (name.length > 160) errors.push('name must be <= 160 characters');
    else out.name = name;
  }

  if ('model' in input) {
    const model = stripControl(input.model);
    if (!model) out.model = PLACEHOLDER; // blank => inquiry; never invented
    else if (model.length > 40) errors.push('model must be <= 40 characters');
    else if (!MODEL_SIZE_CHARS.test(model)) errors.push('model has invalid characters');
    else out.model = model;
  }

  if ('sizeRange' in input) {
    const size = stripControl(input.sizeRange);
    if (!size) out.sizeRange = PLACEHOLDER; // blank => inquiry; never invented
    else if (size.length > 40) errors.push('size must be <= 40 characters');
    else if (!MODEL_SIZE_CHARS.test(size)) errors.push('size has invalid characters');
    else out.sizeRange = size;
  }

  if ('description' in input) {
    const desc = stripControl(input.description);
    if (desc.length > 1000) errors.push('description must be <= 1000 characters');
    else out.description = desc; // may be empty
  }

  if ('category' in input) {
    const cat = stripControl(input.category);
    if (!cat) errors.push('category is required');
    else if (cat.length > 60) errors.push('category must be <= 60 characters');
    else out.category = cat;
  }

  if ('season' in input) {
    const season = stripControl(input.season);
    if (SEASONS.indexOf(season) === -1) errors.push('season must be one of: ' + SEASONS.join(', '));
    else out.season = season;
  }

  if ('colors' in input) {
    let raw = input.colors;
    if (typeof raw === 'string') raw = raw.split(',');
    if (!Array.isArray(raw)) {
      errors.push('colors must be an array or comma-separated string');
    } else {
      const colors = raw.map(stripControl).filter(function (c) { return c.length > 0; });
      if (colors.length > 12) errors.push('colors: at most 12 allowed');
      else if (colors.some(function (c) { return c.length > 30; })) errors.push('each color must be <= 30 characters');
      else out.colors = colors;
    }
  }

  if ('published' in input) {
    if (typeof input.published !== 'boolean') errors.push('published must be true or false');
    else out.published = input.published;
  }

  if (errors.length) return { ok: false, errors: errors, fields: {} };
  return { ok: true, errors: [], fields: out };
}

module.exports = {
  PLACEHOLDER: PLACEHOLDER,
  EDITABLE: EDITABLE,
  PROTECTED: PROTECTED,
  SEASONS: SEASONS,
  stripControl: stripControl,
  validateFields: validateFields
};
