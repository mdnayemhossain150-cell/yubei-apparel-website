'use strict';
/*
 * scripts/hash-password.js — local developer utility.
 *
 * Generates the values you paste into Vercel environment variables. It does NOT
 * store anything and contains no secrets. Passwords are supplied by YOU at run
 * time and never written to disk or committed.
 *
 * Usage:
 *   node scripts/hash-password.js "<your-password>"   -> prints a scrypt hash
 *   node scripts/hash-password.js --secret            -> prints a SESSION_SECRET
 *
 * Put the printed hash in SUPER_ADMIN_PASSWORD_HASH / CONTENT_ADMIN_PASSWORD_HASH
 * (Vercel env vars). Tip: run it so the password isn't saved in shell history,
 * e.g. by pasting when prompted in your own terminal, or clear history after.
 */
const crypto = require('crypto');
const auth = require('../api/admin/_lib/auth');

var arg = process.argv[2];

if (arg === '--secret') {
  console.log(crypto.randomBytes(48).toString('hex'));
  process.exit(0);
}
if (!arg) {
  console.log('Usage:');
  console.log('  node scripts/hash-password.js "<your-password>"   # prints a scrypt password hash');
  console.log('  node scripts/hash-password.js --secret            # prints a random SESSION_SECRET');
  process.exit(1);
}
console.log(auth.hashPassword(arg));
