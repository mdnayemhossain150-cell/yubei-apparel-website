'use strict';

/*
 * http.js — tiny response helpers shared by the admin API handlers.
 * Every admin response is marked no-store and noindex.
 */

function json(res, status, obj, extraHeaders) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  if (extraHeaders) {
    for (const k in extraHeaders) {
      if (Object.prototype.hasOwnProperty.call(extraHeaders, k)) res.setHeader(k, extraHeaders[k]);
    }
  }
  res.end(JSON.stringify(obj));
}

async function readJsonBody(req) {
  if (req.body != null) {
    if (typeof req.body === 'string') {
      try { return JSON.parse(req.body); } catch (e) { return {}; }
    }
    if (typeof req.body === 'object') return req.body;
  }
  return await new Promise(function (resolve) {
    let data = '';
    req.on('data', function (c) {
      data += c;
      if (data.length > 1e5) { try { req.destroy(); } catch (e) {} }
    });
    req.on('end', function () { try { resolve(JSON.parse(data || '{}')); } catch (e) { resolve({}); } });
    req.on('error', function () { resolve({}); });
  });
}

module.exports = { json: json, readJsonBody: readJsonBody };
