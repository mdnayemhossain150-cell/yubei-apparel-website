#!/usr/bin/env node
'use strict';

/*
 * Phase B approved-inventory migration.
 *
 * This script is intentionally conservative: it copies only legacy records
 * already marked "ok" or "corrected", reuses the ten reviewed multi-image
 * canonical records, and explicitly blocks every unresolved identity. The
 * legacy products[] array is byte-for-byte equivalent after JSON parsing.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DATA_PATH = path.join(ROOT, 'products.json');
const BLOCKED_MODELS = new Set([
  'xxxxx',
  'YB003',
  'YB005',
  'YB0286',
  'Q0051+Q0050',
  'YB21007140',
  '00435'
]);
const REVIEWED_MULTI_IMAGE_MODELS = new Set([
  'YB0185',
  'YB253274-63',
  'YB002',
  'YB0224',
  'YB0264',
  'YB0292',
  'YB0277',
  'YB0214',
  'YB008',
  'YB007'
]);

function unique(values) {
  return Array.from(new Set(values));
}

function relatedModels(product, products) {
  const sameCategory = products.filter(candidate =>
    candidate.model !== product.model &&
    candidate.categoryTags.some(category => product.categoryTags.includes(category))
  );
  const sameSeason = products.filter(candidate =>
    candidate.model !== product.model &&
    candidate.seasonTags.some(season => product.seasonTags.includes(season))
  );
  return unique([].concat(
    product.relatedModels || [],
    sameCategory.map(candidate => candidate.model),
    sameSeason.map(candidate => candidate.model)
  )).filter(model => products.some(candidate => candidate.model === model)).slice(0, 3);
}

function main() {
  const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
  const legacyBefore = JSON.stringify(data.products);
  const existing = new Map((data.canonicalProducts || []).map(product => [product.model, product]));
  const groups = new Map();

  data.products.forEach(product => {
    if (BLOCKED_MODELS.has(product.model)) return;
    if (product.published === false) return;
    if (product.status !== 'ok' && product.status !== 'corrected') return;
    if (!groups.has(product.model)) groups.set(product.model, []);
    groups.get(product.model).push(product);
  });

  const approved = [];
  groups.forEach((records, model) => {
    if (records.length > 1 && !REVIEWED_MULTI_IMAGE_MODELS.has(model)) {
      throw new Error('Unreviewed duplicate model refused: ' + model);
    }

    const prepared = existing.get(model);
    if (records.length > 1 && !prepared) {
      throw new Error('Reviewed duplicate is missing its prepared canonical record: ' + model);
    }

    let canonical;
    if (prepared) {
      canonical = Object.assign({}, prepared, {
        verificationStatus: 'verified',
        pageStatus: 'approved'
      });
      if (records.length !== canonical.sourceRecords.length) {
        throw new Error(model + ': sourceRecords does not match the reviewed legacy group');
      }
    } else {
      const source = records[0];
      canonical = {
        model: source.model,
        slug: source.slug,
        name: source.name,
        sizeRange: source.sizeRange,
        seasonTags: [source.season],
        categoryTags: [source.category],
        colors: source.colors.slice(),
        primaryImage: source.image,
        images: [{
          src: source.image,
          alt: source.name + ', model ' + source.model
        }],
        sourceRecords: [source.image],
        verificationStatus: 'verified',
        pageStatus: 'approved'
      };
    }
    approved.push(canonical);
  });

  if (approved.length !== 87) {
    throw new Error('Expected exactly 87 approved canonical products, found ' + approved.length);
  }

  approved.forEach(product => {
    product.relatedModels = relatedModels(product, approved);
  });

  const models = new Set();
  const slugs = new Set();
  approved.forEach(product => {
    if (models.has(product.model)) throw new Error('Duplicate approved model: ' + product.model);
    if (slugs.has(product.slug)) throw new Error('Duplicate approved slug: ' + product.slug);
    if (product.model === 'xxxxx' || product.slug.includes('xxxxx')) throw new Error('Placeholder approved: ' + product.model);
    models.add(product.model);
    slugs.add(product.slug);
  });

  data._canonical_product_architecture.version = '2.1-approved-87';
  data._canonical_product_architecture.purpose = 'One approved canonical record per verified real product. Legacy products[] records remain unchanged for catalog, filter, seasonal-page and inquiry compatibility during Phase B.';
  data._canonical_product_architecture.generator_rules[0] = "Only records with pageStatus 'approved' may generate an individual product page.";
  data.canonicalProducts = approved;

  if (JSON.stringify(data.products) !== legacyBefore) {
    throw new Error('Legacy products[] changed during canonical migration');
  }

  if (process.argv.includes('--patch')) {
    const original = fs.readFileSync(DATA_PATH, 'utf8');
    const updated = JSON.stringify(data, null, 2) + '\n';
    const marker = '  "unresolvedProductGroups": [';
    const originalStart = original.indexOf('  "_canonical_product_architecture": {');
    const originalEnd = original.indexOf(marker);
    const updatedStart = updated.indexOf('  "_canonical_product_architecture": {');
    const updatedEnd = updated.indexOf(marker);
    if ([originalStart, originalEnd, updatedStart, updatedEnd].some(index => index < 0)) {
      throw new Error('Unable to locate canonical architecture patch markers');
    }
    const removed = original.slice(originalStart, originalEnd).replace(/\r\n/g, '\n').split('\n');
    const added = updated.slice(updatedStart, updatedEnd).replace(/\r\n/g, '\n').split('\n');
    const patch = ['*** Begin Patch', '*** Update File: products.json', '@@']
      .concat(removed.filter((line, index) => index < removed.length - 1 || line).map(line => '-' + line))
      .concat(added.filter((line, index) => index < added.length - 1 || line).map(line => '+' + line))
      .concat([' ' + marker, '*** End Patch'])
      .join('\n');
    process.stdout.write(patch);
    return;
  }

  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2) + '\n');
  console.log('Materialized ' + approved.length + ' approved canonical product records.');
  console.log('Legacy products[] preserved: ' + data.products.length + ' records.');
}

main();
