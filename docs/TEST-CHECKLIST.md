# Yubei Admin — Full Test Checklist

**Gate rule:** `admin-dashboard` must **NOT** be merged to `main` until every item in
sections A–J passes on the **Vercel Preview** deployment. Product editing and photo
upload (Phase 2) must be fully exercised on preview first.

Legend: ☐ = to verify · pass criteria stated per item.

---

## A. Preview environment setup
- ☐ `admin-dashboard` pushed; Vercel Preview built successfully (no build errors).
- ☐ Preview serves the existing public pages unchanged (`/`, `/products`, `/about`, etc.).
- ☐ `products.html` on preview is byte-identical to production (diff check).
- ☐ 5 env vars set on **Preview** scope: `SESSION_SECRET`, `SUPER_ADMIN_USERNAME`,
  `SUPER_ADMIN_PASSWORD_HASH`, `CONTENT_ADMIN_USERNAME`, `CONTENT_ADMIN_PASSWORD_HASH`.
- ☐ `SESSION_SECRET` is 32+ random chars; the two accounts use different usernames + passwords.

## B. Authentication & session (both roles)
- ☐ Super Admin logs in with correct creds → dashboard, role badge = Super Admin.
- ☐ Content Admin logs in with correct creds → dashboard, role badge = Content Admin.
- ☐ Wrong password → generic "Invalid username or password" (no enumeration).
- ☐ Unknown username → same generic error.
- ☐ 8+ rapid failures → 429 rate-limited; correct creds still blocked during window.
- ☐ Session cookie is `HttpOnly`, `Secure`, `SameSite=Strict` (check dev tools).
- ☐ Session cookie value is **not** readable by `document.cookie` in console.
- ☐ Logout clears the cookie; protected pages/API then return 401.
- ☐ Tampered/forged/expired cookie → 401.
- ☐ Session expires after TTL (2h) and forces re-login.

## C. Read-only dashboard (Phase 1)
- ☐ Catalog table shows all 92 products with photo, name, model, size, category, season, colors, status.
- ☐ Products without a confirmed model show "Available upon inquiry" (never `xxxxx`).
- ☐ Hidden (`published:false`) products are visibly flagged.
- ☐ Counts summary matches `products.json` `_meta.counts`.

## D. Permission separation (authorization)
- ☐ Super Admin has: user/role management, audit, rollback, tech-admin, SEO config permissions.
- ☐ Content Admin has **none** of the above (verified in API responses).
- ☐ Content Admin cannot call any Super-Admin-only endpoint (403), tested directly (not just hidden UI).
- ☐ Content Admin cannot delete, downgrade, reset, or change permissions of the Super Admin.
- ☐ Super Admin account cannot be deleted by anyone.

## E. Product editing (Phase 2 — write) — per field
For each: change in admin → Save → verify commit → verify preview reflects it → verify `products.json` correct.
- ☐ Edit product **name**.
- ☐ Edit **model number** (respect rule: only a real/printed code; blank ⇒ "Available upon inquiry", never invented).
- ☐ Edit **size**.
- ☐ Edit **description / notes**.
- ☐ Edit **category / collection** and **season**.
- ☐ Edit **colors**.
- ☐ **Reorder** products; order reflected on `/products`.
- ☐ **Publish / unpublish** (hide) a product; hidden ones drop from public page **and** ItemList schema.
- ☐ **Add** a new product (all fields + image).
- ☐ **Delete** a product (with confirm); removed from page, schema, and data.
- ☐ Invalid input rejected (empty required fields, oversized text, bad characters) with clear errors.
- ☐ Concurrent-edit / stale-data handling behaves sensibly (no silent overwrite/corruption).

## F. Photo upload / replace (Phase 2 — write)
- ☐ Upload new photo → optimized to ~825px JPG (matches existing catalog convention).
- ☐ Output file size is in the lightweight range (tens–low hundreds of KB), not multi-MB.
- ☐ Replace an existing product photo; page shows the new image; old reference not broken.
- ☐ Correct filename/path convention (e.g. `assets/<season>-NN.jpg`) with no collisions/overwrites of unrelated files.
- ☐ Reject non-image / corrupt / oversized uploads with a clear error.
- ☐ EXIF/orientation handled; no upside-down or stretched images.
- ☐ `alt` text / dimensions still emitted correctly in generated `products.html`.

## G. Git-backed write pipeline
- ☐ On Save, the function regenerates `products.html` + ItemList JSON-LD + stamps sitemap `/products` lastmod (same output as `build-products.js`).
- ☐ Guard holds: the literal `xxxxx` never leaks into `products.html`.
- ☐ A single logical edit produces one clean commit (data + html + sitemap + any image) with a descriptive message.
- ☐ Vercel redeploys automatically from that commit; change is live on preview within ~1–2 min.
- ☐ GitHub token is **fine-grained, single-repo, write-scoped**, stored only as a Vercel server-side env var; never returned to the browser or logged.
- ☐ Commit author/identity is acceptable and traceable (audit).

## H. Data integrity & SEO preservation
- ☐ `products.json` remains valid JSON after every operation (no trailing commas / corruption).
- ☐ `_meta.counts` stays accurate after add/delete/publish changes.
- ☐ Existing structured data intact: Organization, WebSite, FAQ, CollectionPage, Breadcrumb, ItemList.
- ☐ Canonicals, meta description, OG/Twitter, `cleanUrls`, `trailingSlash` unchanged.
- ☐ Sitemap valid; only `/products` lastmod updated by catalog changes.
- ☐ No URL changes; no broken image links; EN/AR still functional.
- ☐ Google Rich Results test passes on the regenerated `/products` (Product/ItemList).

## I. Security hardening
- ☐ All `/api/admin/*` write routes require a valid session **and** the right permission (403 otherwise).
- ☐ CSRF protection on state-changing requests (SameSite=Strict + token/custom-header check for writes).
- ☐ No secret (session secret, password hash, GitHub token) appears in any HTTP response, HTML, JS, or logs.
- ☐ Rate limiting active on login (and ideally on write endpoints).
- ☐ Admin pages/API send `noindex`; `/admin` blocked from crawlers at production (robots + `X-Robots-Tag`) before go-live.
- ☐ Uploaded content cannot be used for path traversal or to overwrite source/config files.
- ☐ Payload size limits enforced (JSON body + image).

## J. Regression — public site untouched
- ☐ Every existing public page renders identically to production (visual + HTML diff).
- ☐ Home/about/services/certificates/activity/contact unaffected.
- ☐ Performance: `/products` LCP and page weight not degraded.
- ☐ Full `main` vs preview diff reviewed; only intended admin + generated-catalog files differ.

---

## Acceptance gate (all must be true before merge to `main`)
1. Sections A–J fully checked on the **Vercel Preview**.
2. Editing **and** photo upload verified end-to-end (edit → commit → live-on-preview).
3. Rollback rehearsed at least once (see `ROLLBACK.md`).
4. Explicit owner approval to merge.
