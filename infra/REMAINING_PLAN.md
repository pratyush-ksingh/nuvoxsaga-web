# Remaining work — nuvoxsaga.com

Last updated: **2026-04-30** (after the Phase 12 visual polish sprint).

This is the canonical "where we are, what's left" doc. Open it first in any
new session — it points at everything else.

---

## State right now

### Live
- **Vercel preview URL**: `https://nuvoxsaga-web.vercel.app` — Hobby plan, region `iad1`, all routes 200, visual polish shipped.
- **Cloudflare R2**: bucket `nuvoxsaga-public`, custom domain `media.nuvoxsaga.com`, API token in Bitwarden as `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY`.
- **Cloudflare Turnstile**: widget for `nuvoxsaga.com`, keys in Bitwarden.
- **Resend**: domain verified (DKIM auto-detected), API key in Bitwarden as `RESEND_API_KEY`. Sender domain = `nuvoxsaga.com`.
- **Neon Postgres**: project `nuvoxsaga`, region `us-east-2`, **pooled** connection string in Bitwarden as `DATABASE_URI`.
- **Upstash Redis**: db `nuvoxsaga-rl`, region `us-east-1`, REST URL + token in Bitwarden as `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`.

### Bitwarden inventory (18 entries — paste source for Vercel env)
```
PAYLOAD_SECRET                     hex64
PAYLOAD_INTERNAL_SECRET            hex64
AUTH_SECRET                        hex64
REVALIDATE_HMAC_SECRET             hex64
SUBSCRIBER_ENCRYPTION_KEY          base64 32-byte
AUTH_TRUST_HOST                    "true"
ADMIN_EMAIL_ALLOWLIST              <user email>
DATABASE_URI                       postgresql://... ?sslmode=require   (TODO: change to verify-full, see T5)
R2_ACCESS_KEY_ID                   from Cloudflare R2 token
R2_SECRET_ACCESS_KEY               from Cloudflare R2 token
R2_ENDPOINT                        https://<account-id>.r2.cloudflarestorage.com
R2_BUCKET                          nuvoxsaga-public
R2_TOKEN_VALUE                     (optional, debug-only)
TURNSTILE_SECRET                   0x4AAA...
NEXT_PUBLIC_TURNSTILE_SITE_KEY     0x4AAA...
RESEND_API_KEY                     re_...
UPSTASH_REDIS_REST_URL             https://...upstash.io
UPSTASH_REDIS_REST_TOKEN           long random
NEXT_PUBLIC_SITE_URL               https://nuvoxsaga.com (will need temporary swap to Vercel URL during smoke — see S0)
```

### Architectural decisions locked in
- **WebAuthn enrollment deferred to Week 2** — magic-link admin alone is enough Day-1.
- **Pagefind crawl deferred** until preview is mature / migration runs.
- **Sentry / Turnstile activation deferred to Day 3+** per architect — but Turnstile keys are ALREADY pasted into Vercel (used by newsletter form). Sentry is the only one truly off.
- **Migration moves OUT of launch week** — runs Day 10-14 when platform is boring.
- **Ghost decommission gated on rehost completion**, NOT calendar.

### Code state — all committed and pushed
- 17 commits across `D:\nuvoxai\nuvoxsaga-web` and `D:\nuvoxai\youtube-ai-system`.
- Latest polish commits in `nuvoxsaga-web`: `c344978` (typography + color), `843f555` (spacing + scrim), `0143b7a` (motion), `b332208` (per-brand 3D), `12db432` (taglines). Plus deploy fixes `eee9d27`, `2cc9418`, `68c565b`, `f417648`.

---

## 🛠️ T — Tech polish (~50 min, all optional, ranked by leverage)

### T1 — Sentry activation (15 min, RECOMMENDED before smoke)

Without this, runtime errors are invisible. The site is live; errors WILL happen.

```
1. https://sentry.io → create project → Next.js → name `nuvoxsaga`
2. Copy the DSN, paste into Bitwarden as SENTRY_DSN (also as NEXT_PUBLIC_SENTRY_DSN — same value)
3. Settings → Auth Tokens → create token with project:releases + org:read
   → save as SENTRY_AUTH_TOKEN
4. Vercel → Project → Environment Variables → add SENTRY_DSN, NEXT_PUBLIC_SENTRY_DSN, SENTRY_AUTH_TOKEN (Production + Preview scope)
5. Redeploy (Vercel auto-redeploys on env change, or click Redeploy)
```

Verify: trigger any error (visit `/api/og/foo` with bad params) → check Sentry dashboard for the captured event.

### T2 — Restore CI workflows (5 min)

```bash
gh auth refresh -h github.com -s workflow
cd D:\nuvoxai\nuvoxsaga-web
git mv .github/_workflow-staging/security.yml .github/workflows/security.yml
git mv .github/_workflow-staging/lighthouse.yml .github/workflows/lighthouse.yml
Remove-Item .github/_workflow-staging
git commit -m "ci: restore workflows from staging"
git push origin master
```

After this: every PR runs gitleaks + npm audit + tsc + lint + CodeQL + Claude security review + Lighthouse.

Set `LIGHTHOUSE_BASE_URL` repo variable: GitHub repo → Settings → Variables → Actions → New repository variable → name `LIGHTHOUSE_BASE_URL`, value `https://nuvoxsaga-web.vercel.app`.

### T3 — Install audit MCPs (5 min, your terminal)

```bash
claude mcp add chrome-devtools npx chrome-devtools-mcp@latest
claude mcp add playwright npx @playwright/mcp@latest
```

Restart Claude Code session after. Future agents can take screenshots + run Lighthouse against the live URL without you manually reporting back.

### T4 — Security review on the visual polish sprint (10 min, subagent)

Path-2 workflow per `CLAUDE.md` rule. The 7 polish commits since last review:
`c344978` `843f555` `0143b7a` `b332208` `12db432` plus deploy fixes.

Dispatch a general-purpose agent with:
> Review staged-or-pushed commits c344978..12db432 in nuvoxsaga-web. Look for: CSP issues from Framer Motion inline styles, ::selection color leaking into form inputs, brand-glow z-index conflicts, R3F geometry switch breaking on mobile (low-end GPUs). Under 300 words.

### T5 — Fix the pg-connection-string warning (1 min, no redeploy needed)

Vercel → Env Variables → `DATABASE_URI` → change trailing `?sslmode=require` to `?sslmode=verify-full`. Save → redeploy.

This suppresses the SECURITY WARNING in logs and keeps strict cert + hostname validation (Neon supports this via Let's Encrypt certs).

**DO NOT** add `&uselibpqcompat=true` — that opts into the weaker future default.

---

## 🧪 S — Functional smoke (you do, ~30 min)

This validates the whole stack works for a real user. Do this BEFORE migration / DNS cut.

### S0 — Update NEXT_PUBLIC_SITE_URL for testing (1 min)

Magic-link emails will contain `${NEXT_PUBLIC_SITE_URL}/api/auth/...` — currently set to `https://nuvoxsaga.com` which doesn't resolve yet.

Vercel → Env Variables → `NEXT_PUBLIC_SITE_URL` → change to `https://nuvoxsaga-web.vercel.app` (Production scope only). Save → redeploy.

**Reminder**: change back to `https://nuvoxsaga.com` BEFORE DNS cutover (step L4).

### S1 — Magic-link login

1. Visit `https://nuvoxsaga-web.vercel.app/login` in incognito
2. Enter your email (the one in `ADMIN_EMAIL_ALLOWLIST`)
3. Submit → page should swap to "Check your inbox"
4. Open inbox → click magic link → should land in `/admin/setup-mfa` or `/admin`

If email doesn't arrive in 60s: check spam, check Resend dashboard for the send event.

### S2 — WebAuthn enrollment (OPTIONAL)

Skip on Day 1 — magic link is enough. Enroll later (next weekend, with a YubiKey or rested decision on phone passkey).

If enrolling: at `/admin/setup-mfa`, follow Windows Hello / passkey prompt.

### S3 — R2 upload

1. `/admin/collections/media` → click "+ Create"
2. Upload a JPEG (any photo, < 10 MB, valid magic bytes)
3. Should save with auto-generated filename, brand defaults to `shared`
4. Click into the new media doc → confirm `url` field starts with `https://media.nuvoxsaga.com/`
5. Open that URL in incognito → image loads

If "magic byte mismatch": you tried to upload a fake image (extension lies). Try a real photo.

### S4 — Create test post

1. `/admin/collections/posts` → "+ Create"
2. Title: "Test post", slug: `test`, brand: `nuvox_ai`, body: paragraph of "hello world"
3. Save → status defaults to draft
4. Set status = published → save
5. afterChange hook fires `/api/revalidate/internal` → check Vercel function log
6. Visit `https://nuvoxsaga-web.vercel.app/nuvoxai/blog/test` in incognito → page renders with the post body

If 404: revalidate webhook didn't fire. Check `PAYLOAD_INTERNAL_SECRET` matches between Vercel env and what the hook sends.

### S5 — Newsletter signup

1. Visit homepage `/` → scroll to footer
2. Newsletter form should show Turnstile widget (Cloudflare badge)
3. Enter your email → solve Turnstile → submit
4. Should see "Check your email" confirmation
5. Inbox → confirmation email → click link → `/api/newsletter/confirm` → success page

If Turnstile widget invisible: site key wrong (compare Vercel env to Bitwarden).

---

## 📦 M — Migration (Day 10-14, deferred per architect)

**Don't migrate during launch week** — adds risk on top of DNS / cert / pipeline cutover. Run when platform is boring (preview has been stable 3+ days, no errors in Sentry).

### Pre-flight
- Backup `D:\nuvoxai\youtube-ai-system\nuvoxai.db` → `nuvoxai.db.bak.pre-migration`
- Neon dashboard → Branches → create branch `pre-migration` from main (instant rollback if disaster)

### M1 — Backfill legacy video_embed brand_id

```bash
cd D:\nuvoxai\youtube-ai-system
python scripts/backfill_video_brand_ids.py            # dry run first
python scripts/backfill_video_brand_ids.py --apply    # write
```

### M2 — Create migration token

In Vercel preview admin (`/admin/users`):
- email: `migrator@nuvoxsaga.com`, role: `admin`
- Create → API Keys tab → Generate
- Save in Bitwarden (transient — delete after M4)

### M3 — Run migration

```powershell
# PowerShell — token won't land in shell history:
$sec = Read-Host 'MIGRATION_TOKEN' -AsSecureString
$env:MIGRATION_TOKEN = [Net.NetworkCredential]::new('', $sec).Password
$env:PAYLOAD_API_URL = 'https://nuvoxsaga-web.vercel.app/api'

cd D:\nuvoxai\nuvoxsaga-web
npx tsx scripts/migrate-posts-from-sqlite.ts --dry-run
npx tsx scripts/migrate-posts-from-sqlite.ts --limit 5     # verify in admin
npx tsx scripts/migrate-posts-from-sqlite.ts               # full
```

Verify counts match:
```bash
sqlite3 ../youtube-ai-system/nuvoxai.db "SELECT COUNT(*) FROM blog_posts WHERE status='published' AND payload_id IS NOT NULL"
curl "$env:PAYLOAD_API_URL/posts?limit=0&depth=0" -H "Authorization: users API-Key $env:MIGRATION_TOKEN" | jq '.totalDocs'
```

### M4 — Revoke + clean

`/admin/users/migrator@nuvoxsaga.com` → API Keys → Revoke → Delete user.
```powershell
Remove-Item env:MIGRATION_TOKEN
Remove-Item env:PAYLOAD_API_URL
```

### M5 — Pagefind index

```bash
cd D:\nuvoxai\nuvoxsaga-web
bash infra/pagefind-crawl.sh https://nuvoxsaga-web.vercel.app
git add public/_pagefind
git commit -m "search: initial pagefind index"
git push
```

`/search` should now work end-to-end.

---

## 🚀 L — Launch (Day 15+)

### L1 — Add custom domain to Vercel

Vercel → Project → Settings → Domains → Add → `nuvoxsaga.com` and `www.nuvoxsaga.com` (separately, mark www as redirect to apex). Vercel shows DNS records to set.

### L2 — Update DNS at Cloudflare

Cloudflare → DNS → Records:
- Add `A` record: name `@` (apex), value = the IP Vercel showed (e.g. `76.76.21.21`), TTL **5 min** (300s)
- Add `CNAME` record: name `www`, value `cname.vercel-dns.com`, TTL **5 min**
- Both records: Proxy status **DNS only** (gray cloud) — Vercel handles its own edge proxy

### L3 — Wait for cert

Vercel auto-provisions Let's Encrypt within 5-30 minutes once DNS resolves. Watch Settings → Domains for green checkmarks. Test `curl -I https://nuvoxsaga.com` — wait until HTTP/2 200.

### L4 — Update env back

Vercel → Env Variables:
- `NEXT_PUBLIC_SITE_URL` → change back to `https://nuvoxsaga.com`
- Save → redeploy

### L5 — Update Python pipeline

On the machine running scheduler.py:
```powershell
setx PAYLOAD_API_URL "https://nuvoxsaga.com/api"
# Restart scheduler
```

### L6 — Submit sitemap

Either:
- `curl "https://www.google.com/ping?sitemap=https%3A%2F%2Fnuvoxsaga.com%2Fsitemap.xml"`
- OR Google Search Console → submit sitemap URL manually

### L7 — Pagefind on production

```bash
bash infra/pagefind-crawl.sh https://nuvoxsaga.com
git add public/_pagefind
git commit -m "search: refresh pagefind index against prod"
git push
```

---

## 🧹 P — Post-launch (Day 16-23)

### P1 — Image rehost (one brand per day)

```bash
cd D:\nuvoxai\youtube-ai-system
python scripts/rehost_ghost_images_to_payload.py --dry-run --brand nuvox_ai
python scripts/rehost_ghost_images_to_payload.py --apply --brand nuvox_ai

# Day +1
python scripts/rehost_ghost_images_to_payload.py --apply --brand nuvox_space

# Day +2
python scripts/rehost_ghost_images_to_payload.py --apply --brand nuvox_world
```

After each: spot-check 3 random posts in admin → body renders → no broken images.

### P2 — Verify drift log clean

```powershell
Select-String -Path scheduler.log -Pattern "REHOST_DRIFT"
```

If matches: paste them, ping me to triage.

### P3 — Cancel Ghost (gated)

Only after:
- All 3 brands' image rehost reports `0 fail`
- `sqlite3 nuvoxai.db "SELECT COUNT(*) FROM blog_posts WHERE content_html LIKE '%<ghost-host>%' AND payload_id IS NOT NULL"` returns 0

Then: Ghost dashboard → Billing → Cancel.

### P4 — Code cleanup

Ping me when ready and I'll write the patch:
- Delete `blog/_legacy_ghost_publisher.py.bak`
- Drop `GHOST_API_URL`, `GHOST_ADMIN_API_KEY`, `GHOST_CONTENT_API_KEY` from `core/config.py`
- Delete deprecated `sync_video_to_ghost` / `remove_video_from_ghost` shims from `blog/video_sync.py`
- Delete `upload_images_to_ghost` from `blog/blog_image_brain.py`
- Migration: drop `ghost_url`, `ghost_id` columns from `blog_posts` (keep for now — historical context, no cost)

---

## 📋 Phase 11 carry-forward (deferred — post-launch v7.1)

Not blocking launch but on the radar:
- HMAC rotation overlap on `REVALIDATE_HMAC_SECRET` and `NEWSLETTER_HMAC_SECRET` (24h dual-accept window)
- Vitest coverage threshold 50% → 80% on `lib/*` + `collections/*`
- Audit log IP hashing (`audit-log.ip` is currently plaintext)
- GDPR 90-day TTL on `subscribers.sourceIp` / `sourceUa`
- Replace `isomorphic-dompurify` with `sanitize-html` (drops jsdom dep entirely — no more ESM whack-a-mole)
- Per-brand niche taglines: migrate from `lib/brand-content.ts` to Python `brand_config.py` codegen for single-source-of-truth

## 🎯 Quick-resume cheat sheet

If you have **5 minutes**: do T5 (pg warning fix). One env var update.

If you have **15 minutes**: do T1 (Sentry). The site is in production-mode without observability today.

If you have **30 minutes**: do S1-S5 (functional smoke). Verify the whole stack works before launch.

If you have **2 hours**: T1 + T2 + T5 + S0-S5. Full pre-launch hardening.

If you have **a Sunday**: launch (L1-L7).

---

## What an agent should do FIRST in a new session

1. Read this file (you're reading it).
2. `git log --oneline -10` in `nuvoxsaga-web` to see what's been pushed since this doc was written (date stamp top of file).
3. `git log --oneline -5` in `youtube-ai-system` for the same reason.
4. Check `https://nuvoxsaga-web.vercel.app/` — is it still 200 on hero, brand pages, blog?
5. Check Vercel logs last hour for errors (any new fire to put out).
6. Resume from whichever section above was incomplete.

The runbooks under `infra/` cover specific procedures: `PHASE_0_RUNBOOK.md` (provisioning, mostly done), `MIGRATION_RUNBOOK.md` (M1-M5), `PAGEFIND_RUNBOOK.md` (search index), and this file as the index.
