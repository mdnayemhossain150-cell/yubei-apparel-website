'use strict';

/*
 * permissions.js — role -> permission mapping and the Super-Admin protection
 * invariants.
 *
 * NOTE ON SCOPE: In Phase 0/1 there are NO write endpoints, so none of the
 * mutating permissions below are wired to real actions yet. They define the
 * intended separation between the two roles and the guard functions that future
 * (approved) phases will enforce. The read-only dashboard uses PRODUCT_VIEW only.
 */

const PERMISSIONS = {
  // Content Admin permissions (future writes — website owner)
  PRODUCT_VIEW: 'product:view',
  PRODUCT_ADD: 'product:add',
  PRODUCT_EDIT: 'product:edit',
  PRODUCT_DELETE: 'product:delete',
  PRODUCT_PUBLISH: 'product:publish',
  PRODUCT_REORDER: 'product:reorder',
  IMAGE_UPLOAD: 'image:upload',
  CONTENT_EDIT_APPROVED: 'content:edit_approved',
  // Stage 2D-2a: dry-run compose of the whole would-be publish (in-memory diff
  // of products.json/products.html/sitemap). This is READ-ONLY — it never
  // writes and is distinct from the real (future, approved) publish:commit.
  PUBLISH_PREVIEW: 'publish:preview',

  // Super Admin only (technical / administrative)
  USER_MANAGE: 'user:manage',
  ROLE_MANAGE: 'role:manage',
  AUDIT_VIEW: 'audit:view',
  ROLLBACK: 'system:rollback',
  TECH_ADMIN: 'system:tech_admin',
  SEO_CONFIG: 'seo:config'
};

const CONTENT_PERMS = [
  PERMISSIONS.PRODUCT_VIEW,
  PERMISSIONS.PRODUCT_ADD,
  PERMISSIONS.PRODUCT_EDIT,
  PERMISSIONS.PRODUCT_DELETE,
  PERMISSIONS.PRODUCT_PUBLISH,
  PERMISSIONS.PRODUCT_REORDER,
  PERMISSIONS.IMAGE_UPLOAD,
  PERMISSIONS.CONTENT_EDIT_APPROVED,
  PERMISSIONS.PUBLISH_PREVIEW
];

const SUPER_ONLY_PERMS = [
  PERMISSIONS.USER_MANAGE,
  PERMISSIONS.ROLE_MANAGE,
  PERMISSIONS.AUDIT_VIEW,
  PERMISSIONS.ROLLBACK,
  PERMISSIONS.TECH_ADMIN,
  PERMISSIONS.SEO_CONFIG
];

const ROLE_PERMISSIONS = {
  super_admin: CONTENT_PERMS.concat(SUPER_ONLY_PERMS),
  content_admin: CONTENT_PERMS.slice()
};

function permissionsForRole(role) {
  return (ROLE_PERMISSIONS[role] || []).slice();
}
function roleHasPermission(role, perm) {
  return permissionsForRole(role).indexOf(perm) !== -1;
}

// ---------------------------------------------------------------------------
// Super-Admin protection invariants (enforced when user management is built).
// A Content Admin can never act on the Super Admin account, and the Super Admin
// account can never be deleted or downgraded by anyone.
// ---------------------------------------------------------------------------
function canManageAccount(actorRole, targetAccount) {
  if (!targetAccount) return false;
  if (targetAccount.protected && actorRole !== 'super_admin') return false;
  return actorRole === 'super_admin';
}
function canDeleteAccount(actorRole, targetAccount) {
  if (!targetAccount) return false;
  if (targetAccount.immutable) return false; // Super Admin: never deletable
  return actorRole === 'super_admin';
}
function canChangeAccountPassword(actorRole, actorId, targetAccount) {
  if (!targetAccount) return false;
  if (targetAccount.protected) return actorId === targetAccount.id; // only itself
  return actorRole === 'super_admin' || actorId === targetAccount.id;
}
function canChangeAccountRole(actorRole, targetAccount) {
  if (!targetAccount) return false;
  if (targetAccount.immutable) return false; // Super Admin role is fixed
  return actorRole === 'super_admin';
}

module.exports = {
  PERMISSIONS: PERMISSIONS,
  ROLE_PERMISSIONS: ROLE_PERMISSIONS,
  permissionsForRole: permissionsForRole,
  roleHasPermission: roleHasPermission,
  canManageAccount: canManageAccount,
  canDeleteAccount: canDeleteAccount,
  canChangeAccountPassword: canChangeAccountPassword,
  canChangeAccountRole: canChangeAccountRole
};
