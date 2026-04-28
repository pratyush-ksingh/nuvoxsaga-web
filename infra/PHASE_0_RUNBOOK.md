# Phase 0 Provisioning Runbook

Goal: stand up every external service the site depends on, in one ~90-minute
sitting. Order matters — Neon must exist before Payload runs, R2 before media
upload, Resend's DKIM before Auth.js magic-links work.

**Total cost target: $20.80/mo** (most services free-tier; only paid items are
Vercel Pro $20 and any Neon overage).

After every step, fill the value into `.env.local` (copy from `.env.example`).
Do NOT commit `.env.local` — it's already gitignored.

---

## 0. Pre-flight (5 min)

```bash
cp .env.example .env.local
# Generate the four secrets you don't get from a provider:
openssl rand -hex 32  # → PAYLOAD_SECRET
openssl rand -hex 32  # → PAYLOAD_INTERNAL_SECRET
openssl rand -hex 32  # → AUTH_SECRET
openssl rand -hex 32  # → REVALIDATE_HMAC_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
                       # → SUBSCRIBER_ENCRYPTION_KEY
```

Set `AUTH_TRUST_HOST=true` and `ADMIN_EMAIL_ALLOWLIST=<your-email>`.

---

## 1. Neon Postgres (10 min)

`https://console.neon.tech` → New Project → name `nuvoxsaga` → region `us-east-2`
(closest to Vercel default) → Postgres 16.

- Copy the **pooled** connection string (Connection Details → Pooled connection)
  → paste into `.env.local` as `DATABASE_URI=...`.
- Free tier: 0.5 GB storage, 100 hours compute. Enough for blog rows.
- Validate: `npx tsx -e "import('pg').then(({Client})=>new Client({connectionString:process.env.DATABASE_URI}).connect().then(()=>console.log('OK')))"`

---

## 2. Cloudflare R2 (15 min)

`https://dash.cloudflare.com` → R2 → Create bucket `nuvoxsaga-public` (Standard,
Auto region). Set bucket public access ON (we serve images directly from R2).

- R2 → API → Manage tokens → Create API token. Permissions: **Object Read & Write**,
  scoped to bucket `nuvoxsaga-public`. Copy access key + secret + S3 endpoint.
- Fill `.env.local`: `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_ENDPOINT`,
  `R2_BUCKET=nuvoxsaga-public`.
- Free tier: 10 GB storage, 1M Class A ops/mo, 10M Class B/mo, **0 egress**.
- Validate after Payload boots: upload an image via /admin → Media; verify it
  resolves at `<r2-public-url>/<filename>`.

---

## 3. Upstash Redis (10 min)

`https://console.upstash.com` → Redis → Create Database. Name `nuvoxsaga-rl`,
region matching your Vercel deploy region. **Enable TLS.**

- Copy REST URL + REST token (Details tab) → `UPSTASH_REDIS_REST_URL`,
  `UPSTASH_REDIS_REST_TOKEN`.
- Free tier: 10,000 commands/day. Used for rate limiting + WebAuthn challenges.
- Validate: `curl -H "Authorization: Bearer $UPSTASH_REDIS_REST_TOKEN" $UPSTASH_REDIS_REST_URL/ping`
  → `{"result":"PONG"}`

---

## 4. Resend (15 min — DKIM is the slow part)

`https://resend.com` → Domains → Add domain `nuvoxsaga.com`.

- Resend prints DNS records (SPF + DKIM + return-path). Add them at your DNS
  provider (Cloudflare DNS works fine). **Wait 5–10 min for propagation, then
  click Verify in Resend.** This is the bottleneck — start it early.
- API Keys → Create → scope `Sending access` for `nuvoxsaga.com`. Copy the key
  → `RESEND_API_KEY`.
- Free tier: 100 emails/day, 3000/mo. Auth.js magic-links + newsletter
  double-opt-in fit comfortably.
- Validate: `curl -X POST https://api.resend.com/emails -H "Authorization: Bearer $RESEND_API_KEY" -H "Content-Type: application/json" -d '{"from":"hello@nuvoxsaga.com","to":"<your-email>","subject":"test","text":"hello"}'`

---

## 5. Cloudflare Turnstile (5 min)

`https://dash.cloudflare.com` → Turnstile → Add site `nuvoxsaga.com`. Widget
mode: **Managed**.

- Copy site key → `NEXT_PUBLIC_TURNSTILE_SITE_KEY` (public, embedded client-side).
- Copy secret key → `TURNSTILE_SECRET` (server-only).
- Free tier: 1M requests/mo.

---

## 6. Sentry (10 min)

`https://sentry.io` → Create project → Platform: **Next.js** → name `nuvoxsaga`.

- Copy the DSN: it goes into BOTH `SENTRY_DSN` (server) and
  `NEXT_PUBLIC_SENTRY_DSN` (client). Same value, different scopes.
- Settings → Auth Tokens → Create token with `project:releases` + `org:read`
  → `SENTRY_AUTH_TOKEN` (only used during deploy for source-map upload).
- Free tier: 5K errors/mo, 7-day retention. Plenty for solo founder.
- Validate post-deploy: `curl -X POST <preview-url>/api/_test/sentry` (if such
  a route exists) or trigger any 500 and check Sentry dashboard.

---

## 7. Vercel + GitHub (15 min — last, depends on everything above)

Connect repo at `https://vercel.com` → Import → `pratyush-ksingh/nuvoxsaga-web`.
Framework preset: Next.js. Build command auto-detected (`next build`).

**Set every env var from `.env.local` in Vercel → Settings → Environment Variables.**
Use the "Production, Preview, Development" scope for everything except things
that explicitly differ per env.

- Copy `NEXT_PUBLIC_SITE_URL=https://nuvoxsaga.com` (production) and the Vercel
  preview URL (preview).
- Set deployment region to `iad1` or `cle1` (matches Neon `us-east-2`).
- First deploy will run `prebuild` (gen-brands drift check) → `next build` →
  fail if any required env var is missing (boot-time validation in
  `lib/env.ts`).

Plan: **Pro $20/mo** — required for `wasm-unsafe-eval` CSP and >100 GB bandwidth.

---

## 8. GitHub Actions workflow restoration (2 min — see `restore-workflows.sh`)

Token is currently scoped without `workflow`. Run:

```bash
gh auth refresh -h github.com -s workflow
bash infra/restore-workflows.sh
```

Pushes `security.yml` (and `lighthouse.yml` if present) into `.github/workflows/`
so CI gates run on every PR.

After Vercel preview is up (step 7), set the Lighthouse base URL so the
`lighthouse` workflow has something to audit:

```
GitHub repo → Settings → Variables → Actions → New repository variable
  Name:  LIGHTHOUSE_BASE_URL
  Value: https://<your-vercel-preview-url>   (or https://nuvoxsaga.com after launch)
```

Without this variable, the workflow logs a warning and skips — it doesn't
fail the build.

---

## Validation: full system smoke

After all 8 steps:

```bash
npm run build     # boot-time env validation runs; should print no errors
npm run dev
# → open http://localhost:3007
# → /admin → magic-link sign-in → MFA enrollment
# → upload an image to Media collection
# → publish a Posts entry, verify it appears at /<brand>/blog/<slug>
```

If `npm run build` complains "Env validation failed: <var>", that var is
missing or malformed in `.env.local`. The error message names the provider
to fix it.
