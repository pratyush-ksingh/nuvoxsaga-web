# Launch Checklist — nuvoxsaga.com

Pre-launch (Phase 0 provisioning) → Launch (Phase 12).

## Phase 0 — Provisioning (you, before deploy)

- [ ] Cloudflare Registrar: transfer `nuvoxsaga.com`
- [ ] Cloudflare DNS: A `@`→Vercel (proxied), CNAME `www`→`cname.vercel-dns.com`, CNAME `media`→R2 custom domain
- [ ] Cloudflare WAF: enable Bot Fight + Managed Rules
- [ ] Cloudflare Turnstile: create site, copy site-key + secret
- [ ] Cloudflare R2: create `nuvoxsaga-public` (custom domain `media.nuvoxsaga.com`) + `nuvoxsaga-private`
- [ ] R2 API tokens: scoped per-bucket (Object R/W only, no Admin)
- [ ] Vercel Pro account, link GitHub repo
- [ ] Neon Postgres `nuvoxsaga-prod`, copy pooled connection string
- [ ] Resend account, verify `nuvoxsaga.com` (add SPF / DKIM / DMARC TXT records)
- [ ] Upstash Redis `nuvoxsaga-ratelimit`, copy URL + token
- [ ] Sentry project (Next.js), copy DSN
- [ ] Google Cloud: enable YouTube Data API v3, restrict by referrer (`*.nuvoxsaga.com`)

## Required Vercel env vars (production)

- [ ] `DATABASE_URI` — Neon pooled URL (`-pooler.neon.tech`, `sslmode=require`)
- [ ] `PAYLOAD_SECRET` — 64-byte random hex
- [ ] `PAYLOAD_INTERNAL_SECRET` — 64-byte random hex
- [ ] `AUTH_SECRET` — 64-byte random hex
- [ ] `AUTH_TRUST_HOST=true`
- [ ] `ADMIN_EMAIL_ALLOWLIST` — your owner email (comma-separated for multiple)
- [ ] `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET=nuvoxsaga-public`, `R2_ENDPOINT`
- [ ] `PUBLISHER_API_KEY_NUVOX_AI`, `..._SPACE`, `..._WORLD` — created in Payload `/admin/users` after first deploy
- [ ] `REVALIDATE_HMAC_SECRET` — 64-byte random hex
- [ ] `NEWSLETTER_HMAC_SECRET` — 64-byte random hex (or omit; falls back to PAYLOAD_INTERNAL_SECRET)
- [ ] `RESEND_API_KEY`
- [ ] `YOUTUBE_API_KEY` + `BRAND_NUVOX_AI_YT_CHANNEL_ID` + `..._SPACE_...` + `..._WORLD_...`
- [ ] `SUBSCRIBER_ENCRYPTION_KEY` — base64 of 32 random bytes (`openssl rand -base64 32`)
- [ ] `TURNSTILE_SECRET` (server) + `NEXT_PUBLIC_TURNSTILE_SITE_KEY` (client)
- [ ] `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`
- [ ] `SENTRY_DSN` (server) + `NEXT_PUBLIC_SENTRY_DSN` (client) + `SENTRY_AUTH_TOKEN` (build-time, source-map upload)
- [ ] `NEXT_PUBLIC_SITE_URL=https://nuvoxsaga.com`
- [ ] `ANTHROPIC_API_KEY` — for the GH Action `claude-code-security-review`

## CI gates (block merge to main)

- [ ] `tsc --noEmit` strict — 0 errors
- [ ] `eslint .` — 0 errors (advisory warnings ok)
- [ ] `npm audit --audit-level=high` — 0 high
- [ ] `gitleaks detect` — 0 leaks
- [ ] `vitest run` — currently 41/41 passing
- [ ] `next build` — succeeds with 23 routes
- [ ] `claude-code-security-review` action — comments OK, no blockers
- [ ] CodeQL JS/TS — green

## Phase 12 launch-day checklist

- [ ] Submit `sitemap.xml` to Google Search Console + Bing Webmaster Tools
- [ ] Run Schema.org Validator on `/`, `/nuvoxai`, `/nuvoxspace`, `/nuvoxworld`, 5 sample posts
- [ ] Run Google Rich Results Test on the same 5 posts
- [ ] Switch CSP from `Content-Security-Policy-Report-Only` → `Content-Security-Policy` (middleware.ts) after 48h with zero violations
- [ ] Verify Sentry receiving prod events (deliberate `/api/test-error` once + delete)
- [ ] R2 billing alarm at $20, YouTube quota alarm at 80%
- [ ] Soft-launch (closed audience) for 48h
- [ ] Public launch tweet
- [ ] First scheduled YouTube short referencing the site

## Carry-forward / deferred from prior phases (Phase 11 left these open)

### Phase 9
- [ ] Phase 9.4: real scroll-driven R3F camera on `/about` (currently static text — fine for SEO baseline)
- [ ] Phase 9 follow-up: replace procedural hero blob with curated CC0 gaussian splat from Sketchfab/Luma

### Phase 10
- [x] Move newsletter `confirm`/`unsubscribe` HTML responses to real Next routes so they participate in the per-request CSP nonce pipeline (W2: routes now read `x-nonce` from middleware and emit `<style nonce="...">` — survives a future `'unsafe-inline'` drop without changing CSP today)
- [ ] 90-day TTL cron on `subscribers.sourceIp`/`sourceUa` (GDPR right-to-erasure)
- [ ] Pagefind deploy-time crawl: `npx pagefind --site https://nuvoxsaga.com` post-deploy → upload to `/public/_pagefind/`
- [ ] Dedicated `NEWSLETTER_HMAC_SECRET` (currently falls back to PAYLOAD_INTERNAL_SECRET — single-secret blast radius)

### Phase 11 (just deferred)
- [ ] Phase 12 ticket: hash or hash-then-encrypt `audit-log.ip` (currently plaintext); document retention policy + add scheduled purge after 1 year
- [ ] Bump vitest coverage thresholds 50% → 80% on `lib/*` + `collections/*` once content-helper + adapter tests land

### Cross-cutting
- [ ] HMAC rotation overlap on `REVALIDATE_HMAC_SECRET` and `NEWSLETTER_HMAC_SECRET` — accept both `_PREV` and current for a 24h overlap during rotation

## Operating runbook

| Service | Free → Paid trigger | Action |
|---|---|---|
| Neon | Storage > 0.4 GB OR compute > 150h/mo | Upgrade Launch tier |
| R2 | Storage > 9 GB OR class A ops > 900k/mo | First $0.015/GB-month |
| Resend | Sends > 2.5k/mo | Pro tier |
| Sentry | Errors > 4k/mo | Team tier |
| Vercel | Bandwidth > 80% Pro quota | Add bandwidth pack |

## Skill / tool inventory at launch

- Skills installed (`~/.claude/skills/`): frontend-design, theme-factory, web-artifacts-builder, canvas-design, brand-guidelines, skill-creator, mcp-builder, **nuvox-seo (custom, 8-gate reviewed)**
- MCPs configured: Tavily, Context7, Figma (project-level `.mcp.json.example` template)
- CI tools: `claude-code-security-review` (Anthropic), `gitleaks`, CodeQL, `pnpm audit`
- Banned (do NOT install): see `infra/security/BANNED.md` (12 items)
