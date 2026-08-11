# Stage 2A — Product field editing (PREVIEW ONLY)

Stage 2A adds a permission-gated **edit preview** to the admin dashboard. It
**cannot save anything**: there is no file write, no GitHub commit, no
persistence. It exists to prove the edit → validate → permission → diff pipeline
on the Vercel Preview before any write mechanism is designed (Stage 2D).

## What it does
- **Edit** button per product (shown only if the session has `product:edit`).
- Modal with a mandatory notice: *"Preview only — changes are not saved to the live website."*
- On submit, the client calls `POST /api/admin/product-update`, which validates
  the change server-side and returns a **field-level diff**. Nothing is written.
- The user may **keep the result as an in-browser "staged preview"** (memory
  only) or **Discard** it. Staged edits vanish on reload/logout.

## Editable fields (STRICT whitelist — safeguard #1)
`name, model, sizeRange, description, category, season, colors, published`

Any other key — `image`, `id`, `slug`, `status`, `notes`, or anything unknown —
is **rejected (400)** by the server before processing.

## Rules enforced server-side
- **Auth:** valid session required (401 otherwise).
- **Permission:** `product:edit` required (403 otherwise). Content Admin and
  Super Admin both have it; no Super-Admin-only capability is exposed here.
- **CSRF:** the `X-Admin-CSRF` header (from `GET /api/admin/csrf`) is required on
  writes (403 otherwise).
- **Never invent a model or size:** a blank value normalizes to `xxxxx`, which
  the catalog renders as "Available upon inquiry".
- **Season** must be one of Winter / Summer / Autumn / Mix.
- Length caps and control-character stripping on all text fields.

## Files
- `api/admin/product-update.js` — POST dry-run edit endpoint (persists nothing).
- `api/admin/csrf.js` — GET; returns the session-bound CSRF token.
- `api/admin/_lib/validate.js` — whitelist + field validation/normalization.
- `api/admin/_lib/csrf.js` — HMAC double-submit CSRF helper.
- `admin/index.html`, `admin/admin.js`, `admin/admin.css` — edit modal + staging UI.

## Not in 2A
No add/delete/reorder (2B), no photo upload (2C), no Git-backed persistence (2D).
`products.json`, `products.html`, the sitemap, and all public files are untouched.
