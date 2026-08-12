# Stage 2D-2b — Authoritative server-side image processing (DRY RUN)

Stage 2D-2b makes image handling **authoritative on the server** with `sharp`
(full decode → clean re-encode), so photo-bearing staged adds become **fully
composable** and the in-memory would-be commit can carry real asset bytes. Like
every stage before go-live it is **dry-run**: no `assets/` write, no persistence,
no GitHub, no token.

Closes the 2C/2D-2a deferral where a new product's photo could not be processed
server-side and photo-bearing adds fell to `pendingAdds`.

## Dependency
- **`sharp` pinned exactly to `0.33.5`** (no caret). Chosen after verifying npm:
  latest is `0.35.3` but it requires Node `>=20.9.0`; `0.33.5` requires
  `^18.17 || ^20.3 || >=21`, so it satisfies **local Node 24 and Vercel's Node
  20/22 runtime** while keeping our declared `engines.node ">=18"` valid — no
  collateral engine/dependency change. `package-lock.json` is committed for a
  reproducible install (it records the platform-specific `@img/sharp-*` binaries
  for all platforms, so Vercel's Linux build fetches `@img/sharp-linux-x64`).
- Native binary adds ~30 MB to the function bundle (well under Vercel's 250 MB
  unzipped limit).

## Flow
1. `POST /api/admin/image-process` (supersedes the 2C header-only
   `/image-validate` for the staging flow; `image-validate` stays for
   backward-compat). Gate `session → image:upload → CSRF`, large-body reader.
2. `api/admin/_lib/imageProcess.js` fully decodes the input and re-encodes:
   `.rotate()` (auto-orient from EXIF, then drop the tag) → `.flatten(#ffffff)`
   → `.resize({ width: 825, withoutEnlargement: true })` → sRGB →
   `.jpeg({ quality: 86→80→74, mozjpeg, chromaSubsampling: '4:2:0', progressive })`.
   All metadata (EXIF/GPS/XMP/ICC) is dropped (sharp default). Returns the
   processed JPEG (base64) + `{ bytes, width, height, sha256 }`.
3. The browser stages the processed bytes + safe filename.
4. `POST /api/admin/publish-preview` receives the staged photos, re-validates the
   JPEG bytes, assembles the **in-memory would-be commit** (text files + asset
   Buffers), and returns compact diffs + an **asset manifest** (path / action /
   bytes / sha256). The asset Buffers live only for the request, then are
   discarded. **Nothing is written.**

## Rules
- **Allowed inputs:** JPEG / PNG / WebP only (by decoded format, not client MIME).
  SVG / GIF / AVIF / TIFF / animated are rejected.
- **Limits:** request ≤ 12 MB (image-process) / ≤ 10 MB + ≤ 12 photos
  (publish-preview); `limitInputPixels` ~40 MP (decompression-bomb guard);
  output ≤ 300 KB (retry q86→q80→q74) and 400–4000 px (reuses 2C caps).
- **Output:** canonical portrait JPEG, width 825, q86 mozjpeg, 4:2:0, progressive,
  metadata-free.
- **Safe filenames:** replace → the product's OWN filename (server-derived, never
  a client path); add → batch-aware non-colliding `<season>-NN.jpg` (avoids both
  the committed catalog and other adds in the same preview).
- **Replace-existing:** filename unchanged → `products.json`/`products.html`
  byte-identical; the change is an **asset-only** manifest entry. **Approved
  decision:** an image-only replacement counts as an effective catalog change, so
  the sitemap `/products` lastmod **is** stamped.
- **New product:** gets a fresh `<season>-NN.jpg`; composes into
  `products.json` + `products.html`; asset manifest carries its bytes.
- **Failure:** corrupt/unreadable → 422; pixel bomb → 422; unsupported/animated →
  415; output still > 300 KB → 422; too-large request → 413. Every failure
  persists nothing and stages nothing.

## Neutrality preserved (2D-2a)
A zero-op / net-zero preview (no ops, no photos) still returns `products.json`,
`products.html`, `sitemap.xml` **byte-identical** and does **not** stamp the
sitemap. `publish-preview` with **no photos** behaves identically to 2D-2a.

## Files
- New: `api/admin/_lib/imageProcess.js`, `api/admin/image-process.js`,
  `docs/PHASE2D2b.md`, `package-lock.json`.
- Edit: `package.json` (+`sharp@0.33.5`), `api/admin/publish-preview.js`
  (photos → in-memory commit + asset manifest, composable adds, asset-aware
  effectiveChange/sitemap), `admin/index.html` · `admin/admin.js` ·
  `admin/admin.css` (route to image-process, show the asset manifest),
  `docs/TEST-CHECKLIST.md` (§G2), `docs/ROLLBACK.md`.
- Untouched: `products.json`, `products.html`, `sitemap.xml`, `assets/`, all
  public pages, `build-products.js`, `main`.

## Verification
`test-2d2b.js` (regenerable harness) proves gates, authoritative processing
(PNG/WebP→JPEG, metadata stripped, corrupt/oversized/animated/SVG rejected),
composable photo-bearing adds, batch filename collision avoidance, the asset
manifest + in-memory commit, and — critically — that **`assets/` file count and
total bytes are unchanged** by the whole flow. Regressions for 2A/2B/2C/2D-2a are
re-run and pass.
