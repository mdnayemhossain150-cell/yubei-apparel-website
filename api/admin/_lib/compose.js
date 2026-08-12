'use strict';

/*
 * compose.js — Stage 2D-2a PURE, IN-MEMORY compose helpers (persists nothing).
 *
 * Given the current products.json TEXT and a set of staged operations
 * (edits / deletes / reorder / adds), produce the EXACT bytes that WOULD be
 * written to products.json — without ever touching the filesystem or GitHub.
 *
 * Neutrality guarantees (Stage 2D-2a, constraints #3/#4):
 *   - A ZERO-op compose returns the products.json text BYTE-IDENTICAL to input.
 *   - Any UNCHANGED product keeps its exact original bytes (line-preserving).
 *   - products.json custom formatting (one product per line, season-group blank
 *     lines, compact `_meta`) is preserved: we never re-serialize the whole
 *     object; we splice only changed/added/removed product lines.
 *
 * WHY line-preserving: products.json is hand-formatted (compact one-line
 * products, non-uniform blank-line separators between season groups, a compact
 * `_meta`). A whole-object JSON.stringify would reformat it and break
 * byte-identity. We tokenize the products array into per-product raw slices +
 * the exact "glue" between them, and only rewrite the products that actually
 * change. Everything outside the products array (incl. `_meta`) is copied
 * verbatim.
 */

// ---------------------------------------------------------------------------
// One-line product formatter — reproduces the file's house style EXACTLY.
// Verified byte-for-byte against all existing products:
//   { "key": value, "key2": value2 }
// with a leading "{ ", a trailing " }", ": " after each key, ", " between
// pairs, and JSON.stringify for every value (arrays render with no inner
// spaces, e.g. ["Tan","Navy"]).
// ---------------------------------------------------------------------------
function formatProduct(p) {
  var keys = Object.keys(p);
  var parts = keys.map(function (k) {
    return JSON.stringify(k) + ': ' + JSON.stringify(p[k]);
  });
  return '{ ' + parts.join(', ') + ' }';
}

// Tokenize the products array region of the raw products.json TEXT.
// Returns { ok, arrOpen, arrClose, prefix, suffix, entries } where entries is
// an ordered array of { image, text, glueBefore }:
//   - text       = the exact raw "{ ... }" slice for that product
//   - glueBefore = the exact text between the previous product's "}" and this
//                  product's "{" (for entries[0] this is `prefix`, the text
//                  between "[" and the first "{").
//   - suffix     = the exact text between the last product's "}" and "]".
// Rebuilding prefix-aware:
//   raw.slice(0, arrOpen+1) + join(entries) + suffix + raw.slice(arrClose)
// where join = entries.map(e => e.glueBefore + e.text).join('')  (glueBefore of
// entries[0] === prefix). This reproduces the input byte-for-byte for zero ops.
function tokenizeProductsJson(raw) {
  var key = raw.indexOf('"products"');
  if (key === -1) return { ok: false, error: 'products key not found' };
  var arrOpen = raw.indexOf('[', key);
  if (arrOpen === -1) return { ok: false, error: 'products array open not found' };
  // The products array is the LAST top-level array; its "]" is the last "]".
  var arrClose = raw.lastIndexOf(']');
  if (arrClose === -1 || arrClose < arrOpen) return { ok: false, error: 'products array close not found' };

  var region = raw.slice(arrOpen + 1, arrClose);
  var base = arrOpen + 1;

  // Each product is a single-line "{ ... }". Because product values never
  // contain a literal newline, every product object begins at a "{" that starts
  // a line and ends at the "}" that ends that same line. We walk brace depth to
  // find each top-level object span precisely (robust to "{" inside strings via
  // a light string-scan).
  var entries = [];
  var i = 0;
  var n = region.length;
  var prevEnd = -1; // index in region just after previous product's "}"
  var firstStart = -1;
  var lastEnd = -1;

  while (i < n) {
    var ch = region[i];
    if (ch === '{') {
      var start = i;
      var depth = 0;
      var inStr = false;
      var esc = false;
      var j = i;
      for (; j < n; j++) {
        var c = region[j];
        if (inStr) {
          if (esc) { esc = false; }
          else if (c === '\\') { esc = true; }
          else if (c === '"') { inStr = false; }
        } else if (c === '"') {
          inStr = true;
        } else if (c === '{') {
          depth++;
        } else if (c === '}') {
          depth--;
          if (depth === 0) { break; }
        }
      }
      var end = j; // index of matching "}"
      var text = region.slice(start, end + 1);
      var glueBefore = region.slice(prevEnd === -1 ? 0 : prevEnd, start);
      var image = null;
      try { image = JSON.parse(text).image; } catch (e) { image = null; }
      entries.push({ image: image, text: text, glueBefore: glueBefore });
      if (firstStart === -1) firstStart = start;
      lastEnd = end;
      prevEnd = end + 1;
      i = end + 1;
    } else {
      i++;
    }
  }

  var prefix = firstStart === -1 ? region : region.slice(0, firstStart);
  var suffix = lastEnd === -1 ? '' : region.slice(lastEnd + 1);

  return {
    ok: true,
    base: base,
    arrOpen: arrOpen,
    arrClose: arrClose,
    prefix: prefix,
    suffix: suffix,
    entries: entries
  };
}

// Rebuild the full products.json TEXT from tokens + a (possibly reordered /
// edited / trimmed / extended) list of entries. Each entry is { text, glueBefore }.
// The FIRST entry's glueBefore is forced to the original `prefix` so the array
// opening is always exact.
function rebuildProductsJson(raw, tok, entries) {
  var body = '';
  for (var k = 0; k < entries.length; k++) {
    var glue = k === 0 ? tok.prefix : entries[k].glueBefore;
    body += glue + entries[k].text;
  }
  // If every product was deleted, collapse to an empty-but-valid array body.
  if (entries.length === 0) body = tok.prefix.replace(/[^\r\n]+$/, '');
  return raw.slice(0, tok.arrOpen + 1) + body + tok.suffix + raw.slice(tok.arrClose);
}

// Standard intra-group separator used when APPENDING a new product line.
var ADD_GLUE = ',\r\n    ';

// Apply already-VALIDATED, NORMALIZED operations to the products.json text.
// The endpoint is responsible for auth / permission / CSRF and for validating
// every field via _lib/validate before calling this. compose only performs the
// mechanical, byte-preserving splice.
//
//   ops = {
//     order:   [image, ...] | null   // strict permutation of CURRENT images
//     edits:   { image: normalizedFields, ... }
//     deletes: [image, ...]
//     adds:    [ productObject, ... ] // each MUST include a real `image`
//   }
//
// Returns { ok, proposedText, proposedData, summary } or { ok:false, error }.
// summary = { edited, deleted, added, reordered, effectiveChange }.
function applyOps(raw, ops) {
  var tok = tokenizeProductsJson(raw);
  if (!tok.ok) return { ok: false, error: tok.error };

  ops = ops || {};
  var edits = ops.edits || {};
  var deletes = ops.deletes || [];
  var adds = ops.adds || [];
  var order = ops.order || null;

  var deleteSet = {};
  deletes.forEach(function (img) { deleteSet[img] = true; });

  // 1) Establish working order (positional glue preserved for season groups).
  var working;
  if (order && order.length) {
    var byImage = {};
    tok.entries.forEach(function (e) { byImage[e.image] = e; });
    working = order.map(function (img, k) {
      var src = byImage[img];
      return { image: img, text: src ? src.text : null, glueBefore: tok.entries[k].glueBefore };
    });
  } else {
    working = tok.entries.map(function (e) { return { image: e.image, text: e.text, glueBefore: e.glueBefore }; });
  }

  // 2) Apply edits (merge normalized fields onto the existing object; reformat).
  var edited = 0;
  working.forEach(function (e) {
    if (e.image != null && Object.prototype.hasOwnProperty.call(edits, e.image)) {
      var cur;
      try { cur = JSON.parse(e.text); } catch (err) { cur = {}; }
      var merged = Object.assign({}, cur, edits[e.image]);
      var next = formatProduct(merged);
      if (next !== e.text) { e.text = next; edited++; }
    }
  });

  // 3) Apply deletes.
  var before = working.length;
  working = working.filter(function (e) { return !deleteSet[e.image]; });
  var deleted = before - working.length;

  // 4) Apply adds (appended at array end with the standard separator).
  var added = 0;
  adds.forEach(function (p) {
    working.push({ image: p.image, text: formatProduct(p), glueBefore: ADD_GLUE });
    added++;
  });

  var proposedText = rebuildProductsJson(raw, tok, working);
  var proposedData;
  try { proposedData = JSON.parse(proposedText); } catch (err) {
    return { ok: false, error: 'compose produced invalid JSON: ' + err.message };
  }

  return {
    ok: true,
    proposedText: proposedText,
    proposedData: proposedData,
    summary: {
      edited: edited,
      deleted: deleted,
      added: added,
      reordered: !!(order && order.length),
      effectiveChange: proposedText !== raw
    }
  };
}

// ---------------------------------------------------------------------------
// Compact unified diff (line-based, LCS). Emits only changed hunks with a few
// lines of context — never the whole file. Used to show the products.html
// preview WITHOUT returning the full 180 KB file to the browser.
// ---------------------------------------------------------------------------
function lcsMatrix(a, b) {
  var m = a.length, n = b.length;
  // Rolling two-row LCS length, then backtrack via full table only if small.
  var dp = [];
  for (var i = 0; i <= m; i++) { dp.push(new Uint32Array(n + 1)); }
  for (var x = m - 1; x >= 0; x--) {
    for (var y = n - 1; y >= 0; y--) {
      dp[x][y] = a[x] === b[y] ? dp[x + 1][y + 1] + 1 : Math.max(dp[x + 1][y], dp[x][y + 1]);
    }
  }
  return dp;
}

function diffOps(a, b) {
  var dp = lcsMatrix(a, b);
  var ops = [];
  var i = 0, j = 0, m = a.length, n = b.length;
  while (i < m && j < n) {
    if (a[i] === b[j]) { ops.push(['=', a[i]]); i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) { ops.push(['-', a[i]]); i++; }
    else { ops.push(['+', b[j]]); j++; }
  }
  while (i < m) { ops.push(['-', a[i]]); i++; }
  while (j < n) { ops.push(['+', b[j]]); j++; }
  return ops;
}

function unifiedDiff(oldText, newText, opts) {
  opts = opts || {};
  var context = opts.context == null ? 3 : opts.context;
  var fromFile = opts.fromFile || 'a';
  var toFile = opts.toFile || 'b';
  if (oldText === newText) return '';

  var a = oldText.split('\n');
  var b = newText.split('\n');
  var ops = diffOps(a, b);

  // Group into hunks separated by >2*context unchanged lines.
  var lines = [];
  var hunks = [];
  var cur = null;
  var ai = 0, bi = 0;
  var pending = 0; // consecutive '=' since last change

  function flush() { if (cur) { hunks.push(cur); cur = null; } }

  for (var k = 0; k < ops.length; k++) {
    var tag = ops[k][0], text = ops[k][1];
    if (tag === '=') {
      if (cur) {
        cur.rows.push(['=', text, ai, bi]);
        cur.trailingEq = (cur.trailingEq || 0) + 1;
      }
      ai++; bi++;
    } else {
      if (!cur) { cur = { startA: ai, startB: bi, rows: [], trailingEq: 0 }; }
      cur.trailingEq = 0;
      cur.rows.push([tag, text, tag === '+' ? -1 : ai, tag === '+' ? bi : -1]);
      if (tag === '-') ai++; else bi++;
    }
    // Close a hunk if we've accumulated a long run of equals after a change.
    if (cur && cur.trailingEq > context * 2 + 1) {
      // trim trailing context to `context`
      trimHunk(cur, context);
      flush();
    }
  }
  if (cur) { trimHunk(cur, context); flush(); }

  if (!hunks.length) return '';

  var out = '--- ' + fromFile + '\n+++ ' + toFile + '\n';
  hunks.forEach(function (h) {
    // Compute leading context trim + counts.
    var rows = trimLeading(h, context);
    var aCount = 0, bCount = 0, aStart = null, bStart = null;
    rows.forEach(function (r) {
      if (r[0] === '=' || r[0] === '-') { if (aStart === null) aStart = r[2]; aCount++; }
      if (r[0] === '=' || r[0] === '+') { if (bStart === null) bStart = r[3]; bCount++; }
    });
    out += '@@ -' + ((aStart == null ? 0 : aStart + 1)) + ',' + aCount +
           ' +' + ((bStart == null ? 0 : bStart + 1)) + ',' + bCount + ' @@\n';
    rows.forEach(function (r) {
      var sign = r[0] === '=' ? ' ' : r[0];
      out += sign + r[1] + '\n';
    });
  });
  return out;
}

function trimHunk(h, context) {
  // Keep at most `context` trailing equals rows.
  var eq = 0, cut = h.rows.length;
  for (var k = h.rows.length - 1; k >= 0; k--) {
    if (h.rows[k][0] === '=') { eq++; if (eq > context) { cut = k; } }
    else break;
  }
  if (eq > context) h.rows = h.rows.slice(0, cut);
}

function trimLeading(h, context) {
  // Keep at most `context` leading equals rows.
  var eq = 0, start = 0;
  for (var k = 0; k < h.rows.length; k++) {
    if (h.rows[k][0] === '=') eq++;
    else break;
  }
  if (eq > context) start = eq - context;
  return h.rows.slice(start);
}

module.exports = {
  formatProduct: formatProduct,
  tokenizeProductsJson: tokenizeProductsJson,
  rebuildProductsJson: rebuildProductsJson,
  applyOps: applyOps,
  unifiedDiff: unifiedDiff,
  ADD_GLUE: ADD_GLUE
};
