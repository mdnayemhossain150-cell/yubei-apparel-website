# Stage 2B — Add / Delete / Reorder (PREVIEW ONLY)

Stage 2B adds three catalog operations to the dashboard. Like 2A, they are all
**preview-only dry-runs**: each calls a server endpoint that validates and
**persists nothing** (no file write, no GitHub, no persistence). Results are
staged in the browser and vanish on reload/logout. Actual saving is Stage 2D.

## Operations
- **Add product** — modal (same validated fields as 2A). The server assigns a
  temporary **preview ID** (`preview-…`, safeguard #1) that cannot collide with
  any existing image filename, slug, or model. No real photo is attached (that
  is Stage 2C); the row shows a "photo pending" placeholder. Staged as
  "new (preview)".
- **Delete product** — a confirmation dialog shows the **exact product name and
  model number** (safeguard #2) before anything is staged. The server also
  requires `confirm: true`. Staged as "pending delete" (row struck-through, with
  Undo).
- **Reorder** — up/down arrows move a product **within its season**. The server
  validates the new order is a **strict permutation** of the existing set.

## Server endpoints (dry-run, persist nothing)
- `POST /api/admin/product-add` — `product:add` + CSRF; validates a new product; returns a preview + preview ID.
- `POST /api/admin/product-delete` — `product:delete` + CSRF; requires `confirm:true`; returns the target's name + model.
- `POST /api/admin/product-reorder` — `product:reorder` + CSRF; validates permutation.

Every endpoint enforces: authenticated session (401), correct permission (403),
CSRF header (403), strict input validation, and `persisted: false`.

## Files
- `api/admin/product-add.js`, `product-delete.js`, `product-reorder.js`
- `api/admin/_lib/catalog.js` — read-only helpers (find, preview-ID, permutation check)
- `api/admin/_lib/validate.js` — added `validateNewProduct`
- `admin/index.html`, `admin/admin.js`, `admin/admin.css` — Add/Delete/Reorder UI + staging

## Not in 2B
No photo upload (2C). No persistence / GitHub commit (2D). `products.json`,
`products.html`, the sitemap, and all public files are untouched.
