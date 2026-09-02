#!/usr/bin/env node
'use strict';

var fs = require('fs');
var path = require('path');
var root = path.resolve(__dirname, '..');
var files = fs.readdirSync(root).filter(function (file) { return file.endsWith('.html'); });
var titles = new Map();
var descriptions = new Map();
var errors = [];

function report(message) { errors.push(message); }

files.forEach(function (file) {
  var html = fs.readFileSync(path.join(root, file), 'utf8');
  var titleMatch = html.match(/<title>([\s\S]*?)<\/title>/i);
  var descriptionMatch = html.match(/<meta\s+name="description"\s+content="([^"]+)/i);
  var canonicalMatch = html.match(/<link\s+rel="canonical"\s+href="([^"]+)/i);
  var h1Count = (html.match(/<h1\b/gi) || []).length;
  var title = titleMatch && titleMatch[1].trim();
  var description = descriptionMatch && descriptionMatch[1].trim();

  if (!title) report(file + ': missing title');
  if (!description) report(file + ': missing meta description');
  if (!canonicalMatch) report(file + ': missing canonical');
  if (h1Count !== 1) report(file + ': expected one H1, found ' + h1Count);
  if (title) {
    if (titles.has(title)) report(file + ': duplicate title also used by ' + titles.get(title));
    titles.set(title, file);
  }
  if (description) {
    if (descriptions.has(description)) report(file + ': duplicate description also used by ' + descriptions.get(description));
    descriptions.set(description, file);
  }

  Array.from(html.matchAll(/<script\s+type="application\/ld\+json">([\s\S]*?)<\/script>/gi)).forEach(function (match) {
    try { JSON.parse(match[1]); }
    catch (error) { report(file + ': invalid JSON-LD (' + error.message + ')'); }
  });

  Array.from(html.matchAll(/(?:href|src)="(\/[^"?#]+)(?:[?#][^"]*)?"/g)).forEach(function (match) {
    var urlPath = match[1];
    var localPath;
    if (urlPath.indexOf('/assets/') === 0) localPath = path.join(root, urlPath.slice(1));
    else if (/\.[a-z0-9]+$/i.test(urlPath)) return;
    else localPath = urlPath === '/' ? path.join(root, 'index.html') : path.join(root, urlPath.slice(1) + '.html');
    if (!fs.existsSync(localPath)) report(file + ': broken local reference ' + urlPath);
  });
});

if (errors.length) {
  console.error('SEO/link audit failed with ' + errors.length + ' error(s):');
  errors.forEach(function (error) { console.error('- ' + error); });
  process.exit(1);
}

console.log('SEO/link audit passed for ' + files.length + ' HTML files.');
