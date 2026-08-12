# Stage 2D-2a — Publish preview / compose (DRY RUN, NOTHING WRITTEN)

Stage 2D-2a composes the **entire would-be publish in memory** and returns
compact diffs. It proves the full pipeline end-to-end — staged operations →
`products.json` → the `build-products.js` generators → `products.html` + sitemap
— **without writing anything, without any GitHub call, and without a GitHub
token.** It is the dress rehearsal that Stage 2D-3 will later attach to a real
git commit.

Builds directly on **Stage 2D-1**, which exported the generators
(`renderProductsHtml`, `stampProductsLastmod`, …) as pure, filesystem-free
functions precisely so a server endpoint could compose real output off-disk.

## What it does
- **`POST /api/admin/publish-preview`** takes the staged op-set and returns:
  - compact **unified diffs** for `products.json` and `products.html`,
  - current/proposed **byte counts** + an `identical` flag for each,
  - **sitemap** status (`updated` | `unchanged` | `not_found`) + the new lastmod,
  - **catalog counts** (shown / total / by season / "Available upon inquiry"),
  - a **summary** (`edited`, `deleted`, `added`, `reordered`, `effectiveChange`),
  - `persisted: false` on every path.
- **Dashboard:** a **"Preview publish (dry run)"** button on the staged bar
  (shown only with `publish:preview`) posts the current staging set and renders
  the result in a read-only modal. Banner: *"Dry run only — nothing is written."*

## Neutrality guarantees (constraints #3 / #4)
- A **zero-op** (or net-zero) preview returns `products.json`, `products.html`,
  and `sitemap.xml` **byte-identical** to disk.
- The sitemap `<lastmod>` is stamped **only when there is an actual catalog
  change** — never on a neutral preview.
- `products.json` is **line-preserving**: the file is hand-formatted (one compact
  product per line, non-uniform season-group blank lines, a compact `_meta`), so
  we never re-serialize the whole object. We tokenize the products array, keep
  every **unchanged product's exact bytes**, and rewrite only changed/added/
  removed product lines. Everything outside the array (incl. `_meta`) is copied
  verbatim. The one-line formatter was verified byte-for-byte against all 92
  existing products.

## Security
- Same gate as every 2A–2C write endpoint: session (401) → `publish:preview`
  (403) → CSRF (403), with `no-store` + `nosniff` + `noindex` headers.
- The server **re-validates every op from scratch** (reusing `_lib/validate.js`
  and `_lib/catalog.js`); the client's prior "preview OK" is never trusted.
- Only **compact diffs** are returned — the full `products.html` is generated in
  memory for validation but never sent to the browser.
- The endpoint has **no write path in its code at all** (no `fs.write*`, no
  GitHub). The `xxxxx` placeholder guard inside the generator is surfaced as a
  422, never a silent 500.

## Files
- `api/admin/publish-preview.js` — dry-run compose endpoint (persists nothing).
- `api/admin/_lib/compose.js` — pure, byte-preserving tokenizer / apply-ops /
  compact unified-diff helpers (no filesystem access).
- `api/admin/_lib/permissions.js` — adds `publish:preview` (both roles; distinct
  from the future, approved `publish:commit`).
- `admin/index.html`, `admin/admin.js`, `admin/admin.css` — preview button +
  read-only result modal.

## Not in 2D-2a (deferred)
- **Authoritative server-side image processing → Stage 2D-2b** (`sharp`, dry-run,
  no token, no persistence). Photo-pending adds are excluded here and reported
  under `pendingAdds`.
- **Any write / git commit / GitHub token → Stage 2D-3** (only after 2D-2a and
  2D-2b are both complete and approved).
- `products.json`, `products.html`, `sitemap.xml`, `assets/`, and every public
  file remain untouched. `main` is untouched.

## Verification
`test-2d2.js` (regenerable harness): **34 assertions**, all passing — gates,
re-validation, zero-op neutrality (json/html byte-identical, sitemap not
stamped), edit/delete/reorder/add compose, no placeholder leak, compact-diff-only
payload, and a source-level guard that the endpoint contains no write/GitHub call.
