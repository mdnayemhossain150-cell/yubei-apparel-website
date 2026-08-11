# Yubei Admin — Rollback & Recovery Strategy

The design makes rollback safe because **the public site is static and every content
change is an ordinary git commit.** There is always a known-good state to return to,
at three independent levels: Vercel deployment, git history, and the data file itself.

## Known-good anchors
- **Restore tag:** `yubei-stable-pre-admin-2026-08-11` → `main` `d2cc55b` (stable site before any admin work).
- **`main` is protected during development:** all admin work lives on `admin-dashboard`; production only ever deploys from `main`.
- **Preview isolation:** the branch deploys to a Preview URL that never affects production.

---

## Level 1 — Vercel instant rollback (fastest, seconds)
Production deploys are immutable and retained. To undo a bad production release:
1. Vercel → Project → **Deployments**.
2. Pick the last known-good production deployment.
3. **Promote to Production** (a.k.a. Instant Rollback).
Live traffic serves the previous build in seconds. No git action required.

## Level 2 — Git revert (undo a specific change)
Because Phase 2 writes commit to the repo, any bad edit is one commit:
- Revert a single change: `git revert <commit>` → push → Vercel redeploys the corrected state.
- Restore just the catalog data to an earlier point:
  `git checkout <good-commit> -- products.json products.html sitemap.xml` → commit → push.
- Images are versioned too: `git checkout <good-commit> -- assets/<file>`.

## Level 3 — Full reset to the restore point (worst case)
If production must return entirely to the pre-admin baseline:
- `git checkout main && git reset --hard yubei-stable-pre-admin-2026-08-11` (force-push only with explicit approval), **or** safer: Level 1 instant rollback to the matching deployment.
- Prefer Level 1/2; a hard reset is the last resort and requires owner sign-off.

---

## Abandoning the admin feature entirely
Since nothing on `main` changed, "removing" the admin is trivial:
- Simply **do not merge** `admin-dashboard`. Production is unaffected.
- Optionally delete the branch. The restore tag remains as a bookmark.

## Safeguards that make rollback reliable
- **One edit = one clean commit** (data + regenerated HTML + sitemap + image together) → easy, atomic revert.
- **`xxxxx` leak guard** in the generator refuses to write bad output.
- **JSON validation** before commit prevents a corrupt `products.json` from shipping.
- **Audit trail:** git history records who/what/when for every content change.
- **Env-var secrets:** rotating a leaked secret (session/GitHub token) is a Vercel env change + redeploy — no code change, no data loss.

## Rollback rehearsal (required before go-live)
Before merging to `main`, rehearse at least once on preview:
1. Make a test edit via admin → confirm commit + preview update.
2. `git revert` that commit → confirm preview returns to prior state.
3. In Vercel, practice **Promote to Production** on a prior deployment (using a preview/staging target).
Record the result in the acceptance gate of `TEST-CHECKLIST.md`.

---

### Merge policy (reaffirmed)
Do **not** merge `admin-dashboard` → `main` until admin **editing and photo upload** are
fully tested on the Vercel Preview and the `TEST-CHECKLIST.md` acceptance gate is met with
explicit owner approval.
