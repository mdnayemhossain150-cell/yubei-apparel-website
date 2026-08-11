'use strict';

/*
 * accounts.js — the two-account registry.
 *
 * IMPORTANT: no passwords or hashes live in this file. It only records the
 * NAMES of the environment variables that hold each account's username and
 * hashed password. The real values are set as server-side Vercel environment
 * variables and are never present in the repository or the browser.
 */

const crypto = require('crypto');

const ACCOUNTS = [
  {
    id: 'super_admin',
    role: 'super_admin',
    label: 'Super Admin / Developer',
    usernameEnv: 'SUPER_ADMIN_USERNAME',
    passwordHashEnv: 'SUPER_ADMIN_PASSWORD_HASH',
    immutable: true, // can never be deleted or downgraded by anyone
    protected: true  // only the super_admin itself may ever modify this account
  },
  {
    id: 'content_admin',
    role: 'content_admin',
    label: 'Content Admin (Website Owner)',
    usernameEnv: 'CONTENT_ADMIN_USERNAME',
    passwordHashEnv: 'CONTENT_ADMIN_PASSWORD_HASH',
    immutable: false,
    protected: false
  }
];

// Constant-time string compare to reduce username-enumeration timing signal.
function timingSafeStrEqual(a, b) {
  const ab = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

function getAccountByUsername(username) {
  if (!username) return null;
  for (let i = 0; i < ACCOUNTS.length; i++) {
    const acc = ACCOUNTS[i];
    const envUser = process.env[acc.usernameEnv];
    if (envUser && timingSafeStrEqual(envUser, username)) return acc;
  }
  return null;
}

function getAccountById(id) {
  for (let i = 0; i < ACCOUNTS.length; i++) {
    if (ACCOUNTS[i].id === id) return ACCOUNTS[i];
  }
  return null;
}

function getStoredHash(account) {
  if (!account) return '';
  return process.env[account.passwordHashEnv] || '';
}

module.exports = {
  ACCOUNTS: ACCOUNTS,
  getAccountByUsername: getAccountByUsername,
  getAccountById: getAccountById,
  getStoredHash: getStoredHash
};
