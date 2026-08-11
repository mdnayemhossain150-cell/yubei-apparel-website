# Stage 2C — Photo upload / replace (PREVIEW ONLY)

Stage 2C adds photo upload/replace to the edit and add flows. Like 2A/2B it is
**preview-only**: nothing is written to `assets/` or `products.json`, no commit,
no persistence. The staged photo lives in the browser and clears on reload.

## How it works
1. **Browser Canvas** decodes the user's chosen file (JPEG/PNG/WebP) and
   re-encodes it to **JPEG at ~825 px wide, quality ≈0.86** (the catalog
   standard). EXIF is dropped by the re-encode.
2. The optimized JPEG (base64) is sent to `POST /api/admin/image-validate`.
3. The **server validates — structural/header checks only, no full decode**:
   - JPEG magic bytes (`FF D8 FF`) + EOI trailer (`FF D9`)
   - byte-size cap (≤ 300 KB) and request cap (≤ 4 MB)
   - dimensions parsed from the JPEG SOF marker (min 400 px, max 4000 px)
   - permission (`image:upload`) + CSRF
4. It returns a **safe target filename**:
   - **replace** → the product's OWN existing filename (server-derived, never a
     client path) — cannot touch unrelated images
   - **add** → a proposed non-colliding `<season>-NN.jpg`

> **No authoritative decode here.** The real pixel decode/re-encode happens in
> the browser. Stage 2D will add authoritative **server-side** decode/re-encode/
> validation with an approved image library **before any file is written** to
> `assets/`.

## Security
- Reject SVG and any non-JPEG server payload (the browser only ever sends JPEG).
- Server-computed filenames only; charset/pattern controlled; Add collision-checked.
- Byte + dimension caps guard against oversized/decompression-bomb inputs.
- CSRF + permission enforced; responses are `no-store` + `nosniff`.

## Files
- `api/admin/image-validate.js` — validation endpoint (persists nothing)
- `api/admin/_lib/image.js` — no-dependency header checks + safe filename + large-body reader
- `admin/index.html`, `admin/admin.js`, `admin/admin.css` — Canvas optimization + preview + staging

## Not in 2C
No persistence, no `assets/` write, no GitHub commit (all Stage 2D). `products.json`,
`assets/`, `products.html`, the sitemap, and all public files are untouched.
