# Yubei Admin — Phase 0/1 (read-only)

Isolated admin dashboard on branch **`admin-dashboard`**. It does **not** change the
public website. The public catalog pipeline (`products.json` → `build-products.js`
→ `products.html`, sitemap, schema) is untouched. There is **no write capability**
in this phase and **no GitHub write token**.

## What exists now
- `/admin` — login screen + read-only dashboard shell (`admin/`).
- `/api/admin/*` — serverless functions: `login`, `logout`, `session`, `products`.
- Auth uses **only Node's built-in `crypto`** (scrypt password hashing + HMAC
  session tokens). **No third-party runtime dependencies.**

## Two separate accounts
| Account | Role | Env: username | Env: password hash |
|---|---|---|---|
| Super Admin / Developer | `super_admin` | `SUPER_ADMIN_USERNAME` | `SUPER_ADMIN_PASSWORD_HASH` |
| Content Admin (owner)   | `content_admin` | `CONTENT_ADMIN_USERNAME` | `CONTENT_ADMIN_PASSWORD_HASH` |

They authenticate independently and have different credentials. The Content Admin
can never delete, downgrade, or change the Super Admin (enforced by invariants in
`api/admin/_lib/permissions.js`, applied when user-management is built later).

## Required environment variables (Vercel → Preview scope)
Set these on the **Preview** environment only for now (never commit them):

```
SESSION_SECRET               # 32+ random chars — `node scripts/hash-password.js --secret`
SUPER_ADMIN_USERNAME         # e.g. an email you choose
SUPER_ADMIN_PASSWORD_HASH    # `node scripts/hash-password.js "your-password"`
CONTENT_ADMIN_USERNAME       # a DIFFERENT username/email for the owner
CONTENT_ADMIN_PASSWORD_HASH  # `node scripts/hash-password.js "owner-password"`
```

Generate values locally (your password is never stored or committed):

```bash
node scripts/hash-password.js --secret
node scripts/hash-password.js "choose-a-strong-password"
```

## Deploying the preview (safe — not production)
1. Push the `admin-dashboard` branch (main is not touched).
2. Vercel auto-creates a **Preview deployment** for the branch (Vercel marks all
   previews `noindex` automatically; the admin pages also send `noindex`).
3. Add the 5 env vars above to the Preview environment, then open `/admin` on the
   preview URL.

## Not enabled in Phase 0/1 (by design)
Add/edit/delete/reorder/publish, image upload, any write to `products.json` /
`products.html` / sitemap, automatic GitHub commits, and any production write
token. Those come only after your explicit approval of Phase 2.
