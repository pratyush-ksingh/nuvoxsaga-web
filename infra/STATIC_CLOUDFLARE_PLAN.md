# nuvoxsaga.com — static site on Cloudflare only ($0/month)

Decided 2026-09-26 by the owner: **Cloudflare only, static site.** Replaces the
Vercel + Payload + Neon + Upstash + Auth.js runtime. Branch: `static-cloudflare`.

## Why
- Vercel Hobby is non-commercial only (AdSense / affiliate-primary sites are banned) →
  $20/mo Pro the day we monetize. Cloudflare Pages has no such restriction.
- Cloudflare Workers free = 10 ms CPU/request: cannot server-render Next + Payload.
  Pre-built static pages need none.
- The blog is written by our pipeline, not by humans in an admin → no CMS/DB/login needed.
  Removing them removes the whole auth attack surface.

## Target architecture
```
Python pipeline (fact-checked post) ──git push──▶ GitHub (content/posts/<brand>/<slug>.json)
                                                        │
                                          Cloudflare Pages build (free, 500/mo)
                                                        ▼
visitor ─▶ nuvoxsaga.com ─▶ Cloudflare Pages: static HTML + /_pagefind search
                             ├─ media.nuvoxsaga.com (R2 images, free)
                             └─ /api/newsletter/* ─▶ Pages Functions (free 100k req/day)
                                                      ├─ Turnstile verify
                                                      ├─ D1: subscribers (email sealed-box encrypted)
                                                      └─ Resend: confirmation email (free 3k/mo)
nuvox-ai.com/* ──301 (Cloudflare redirect rule)──▶ nuvoxsaga.com/<brand>
```

## Phases
1. **Static build** — `output: 'export'`; content layer reads JSON files and sanitizes HTML
   at build (same DOMPurify rules as Posts.ts); remove Payload/Auth/API routes/middleware;
   security headers → `public/_headers`; sitemap/robots static; Pagefind post-build.
2. **Newsletter** — Pages Functions (subscribe / confirm / unsubscribe), Turnstile, D1,
   libsodium sealed box (Worker holds only the public key), HMAC-signed links.
3. **Deploy** — Pages project + custom domain nuvoxsaga.com (DNS already on Cloudflare).
4. **Pipeline** — Python publisher writes the post JSON + commits/pushes; blog writing uses
   the same fail-closed accuracy gate as the videos.
5. **Old domain** — 301 nuvox-ai.com/* → brand hubs; then cancel the Ghost VPS.
6. **Cleanup** — drop Payload/Neon/Upstash/Auth deps + Vercel project; update docs.

## Trade-offs accepted
- No web admin: edit a post = edit its JSON in GitHub (or re-run the pipeline).
- CSP can't use per-request nonces on static HTML; Next's inline bootstrap scripts need
  `'unsafe-inline'` for scripts. Mitigated: no user content is rendered unsanitized, no
  cookies/sessions exist, all post HTML is sanitized at build.
- Dynamic OG images (`/api/og/[slug]`) → per-brand static OG images for now.

## Status — 2026-09-26 (branch `static-cloudflare`, uncommitted)
- [x] Phase 1 static build: `npm run build:prod` → out/ (19 pages, Pagefind, per-post + per-brand
      OG PNGs, sitemap/robots). Server code removed (auth, payload, api, middleware, collections,
      instrumentation). Content = content/posts/<brand_id>/<slug>.json, sanitized at build
      (lib/sanitize.ts — same DOMPurify policy). Enforced CSP + HSTS etc. in public/_headers.
      Fixed on the way: Next 16 prefetch 404s (scripts/flatten-segment-files.mjs), sitemap listed a
      nonexistent /shorts, "Watch on YouTube" linked to a nonexistent /<brand>/videos.
- [x] Phase 2 newsletter: functions/api/newsletter/{subscribe,confirm,unsubscribe}.ts +
      functions-lib/newsletter.ts; D1 schema infra/d1/0001_subscribers.sql. Verified locally with
      `wrangler pages dev`: constant-time identical responses, validation, Turnstile, public-key
      encryption (Python decrypt round-trip OK), tamper/cross-purpose token rejection, GET-safe
      unsubscribe (POST mutates).
- [x] Phase 3a deploy (2026-09-27): wrangler logged in (account 6c7c4191…); D1 `nuvoxsaga`
      (25616a02-…, APAC) + schema; Pages project `nuvoxsaga` (production branch main); secrets
      NEWSLETTER_HMAC_SECRET + SUBSCRIBER_PUBLIC_KEY; live at https://nuvoxsaga.pages.dev
      (X-Robots-Tag noindex on *.pages.dev). Subscriber PRIVATE key: Windows Credential Manager
      (service nuvoxsaga / subscriber_private_key) — owner must back it up to Bitwarden.
- [ ] Phase 3b — owner: TURNSTILE_SECRET + RESEND_API_KEY via `wrangler pages secret put`,
      Turnstile SITE key (public) for the build, review preview, approve attaching nuvoxsaga.com.
- [ ] (old text) Phase 3 deploy — BLOCKED on owner: `npx wrangler login`. Then: `wrangler d1 create nuvoxsaga`
      (+ put id in wrangler.toml), apply schema, `wrangler pages project create`, secrets
      (NEWSLETTER_HMAC_SECRET, SUBSCRIBER_PUBLIC_KEY, TURNSTILE_SECRET, RESEND_API_KEY),
      deploy to *.pages.dev → owner review → attach nuvoxsaga.com.
      Real subscriber key pair: private key must be generated on the owner's machine and kept
      offline (keyring), never in the repo or Cloudflare.
- [ ] Phase 4 Python publisher + blog accuracy gate (reuse cinematic_verify; ≤3 grounded calls/post)
- [x] Phase 5a (2026-09-27): owner added Redirect Rule on nuvox-ai.com: all requests -> 301
      https://nuvoxsaga.com/nuvoxai (query not preserved). Verified: root, article paths, http, /ghost/.
      89 old posts stay archived in nuvoxai.db (not migrated: unverified, duplicates, wrong brands).
- [ ] Phase 5b: owner cancels Ghost VPS (optional: export Ghost JSON/images first via the VPS IP,
      since /ghost/ now redirects). Keep nuvox-ai.com registered ~1 year for the redirect.
- [ ] Phase 5c: rewrite 4 old topics through the gate (Claude Code vs Cursor, Claude beginner guide,
      real cost of AI video, backpropagation explained) ~1/day
- [ ] Phase 6 remove Payload/Neon/Upstash/Auth/Sentry-server deps, delete Vercel project, docs;
      run /security-review before the first commit (repo rule)
- [x] Redesign (2026-09-27): DESIGN.md (awesome-design-md format; refs The Verge + SpaceX),
      taste-skill + redesign-skill rules, image-to-code mockups design/ref/ (Workers AI FLUX.2
      klein, $0), 5 AI illustrations public/images/ (labelled as AI), web-design-guidelines audit
      (fixes applied), playwright-cli before/after in design/before + design/after. Geist replaces
      Fraunces; dead 3D hero/Lenis/old server libs removed; vitest 48/48; deployed to pages.dev.
- [x] LAUNCH (2026-09-27 01:28 IST): nuvoxsaga.com + www attached to Pages, both active; owner
      added CNAME @/www -> nuvoxsaga.pages.dev (proxied). All 4 secrets set (NEWSLETTER_HMAC_SECRET,
      SUBSCRIBER_PUBLIC_KEY, TURNSTILE_SECRET, RESEND_API_KEY). Site key in .env.production (public).
      Verified: 200s, 404, http->https 301, HSTS/CSP/X-Frame, canonical apex, fake Turnstile rejected.
- [ ] Old Turnstile secret was pasted in chat; owner rotated but old one still validated at launch
      (grace period?) -> re-check; if alive, rotate with "invalidate immediately"
- [x] Real signup test PASSED 2026-09-27 01:45 IST (owner's email confirmed=1). Fixed on the way:
      Turnstile render race (widget never created -> empty token -> 400), invalid size 'invisible'
      (now appearance interaction-only), Resend domain had DNS records but verification was never
      run ("Not Started") -> owner clicked Verify. sendEmail now logs Resend's error reason.
- [ ] Optional: Cloudflare redirect rule www -> apex (canonical already points to apex)
- [ ] Google Search Console: add nuvoxsaga.com, submit /sitemap.xml

## 2026-09-27: nuvox-ai.com archive live
- 82 old Ghost posts at /archive/<original-slug> (noindex, warning banner, not in search/sitemap). Export: `python youtube-ai-system/scripts/export_archive.py` then `npm run build:prod` + deploy.
- 7 near-duplicates 301 to the kept copy; /archive/v/<name>/ 301s to /archive/v-<name>. Static rules need explicit trailing-slash variants (exporter emits both).
- DONE 2026-09-27 (verified): nuvox-ai.com dynamic redirect `concat("https://nuvoxsaga.com/archive", http.request.uri.path)`, 301, preserve query off.
