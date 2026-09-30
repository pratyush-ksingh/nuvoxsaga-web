> **Legacy.** This document describes the retired Payload + Vercel + Neon + Auth.js stack. The site is now a static export on Cloudflare Pages: see `README.md` and `infra/STATIC_CLOUDFLARE_PLAN.md`.

# Ghost → Payload Migration Runbook

Run-once import of `nuvoxai.db` → Payload `Posts` collection. Idempotent on
slug; safe to re-run after fixing failures.

**Critical**: with hard-cutover (no dual-publish), this runbook is the only
path for old Ghost-published posts to appear on the new site. If skipped,
the blog launches empty and old `/blog/<slug>` URLs 404.

**Window**: Thursday of launch week. Run after preview deploy is green and
before Sunday DNS cutover.

---

## Prerequisites

- Phase 0 complete (Neon up, Vercel preview deployed)
- `nuvoxai.db` accessible at `../youtube-ai-system/nuvoxai.db` (or set
  `NUVOXAI_DB_PATH`)
- Posts in `nuvoxai.db` already have `payload_id` column (added in Phase 6.1
  migration; the script also adds it defensively if missing)
- Backup of `nuvoxai.db` taken **before** running (`cp nuvoxai.db nuvoxai.db.bak`)
- Backup of Payload Posts table taken (Neon → branches → create branch
  `pre-migration` from current; rollback = restore branch)

---

## 1. Create the migration token (Payload admin)

```
/admin → Users → Create new
  email: migrator@nuvoxsaga.com
  role: admin (full Posts write)
  → save → API Keys tab → Generate → copy token
```

Set the token locally (do NOT commit, do NOT add to Vercel env). To keep
the token out of shell history, prefix with a space (HISTCONTROL=ignorespace
on most shells) or read it interactively:

```bash
# Bash — interactive, no echo, no history
read -rs -p 'MIGRATION_TOKEN: ' MIGRATION_TOKEN; export MIGRATION_TOKEN
read -r  -p 'PAYLOAD_API_URL: ' PAYLOAD_API_URL; export PAYLOAD_API_URL
```

```powershell
# PowerShell — read as SecureString, decode in-memory
$sec = Read-Host 'MIGRATION_TOKEN' -AsSecureString
$env:MIGRATION_TOKEN = [Net.NetworkCredential]::new('', $sec).Password
$env:PAYLOAD_API_URL = Read-Host 'PAYLOAD_API_URL'
```

---

## 2. Dry run (no writes)

```bash
npx tsx scripts/migrate-posts-from-sqlite.ts --dry-run
```

Expected output:
```
Found <N> eligible · <N> after brand filter · processing <N> (DRY RUN)
  · would publish [123] nuvox_ai / how-to-x
  · would publish [124] nuvox_space / why-y
  ...
Done · ok=0 fail=0
```

Verify the brand filter matches `web-brands.config.json` (3 brands today —
nuvox_ai/space/world; nuvox_sports excluded).

---

## 3. Smoke test with a 5-row limit

```bash
npx tsx scripts/migrate-posts-from-sqlite.ts --limit 5
```

Watch for:
- `✓ [123] nuvox_ai / how-to-x → <payload-id>` per row
- `Done · ok=5 fail=0` at the end

Then in Payload `/admin/collections/posts`:
- Confirm 5 new entries
- Click one, verify body renders, schemaLD JSON populated, tags array correct
- Visit `<preview-url>/nuvoxai/blog/how-to-x` — page should render with full body

---

## 4. Full migration

```bash
npx tsx scripts/migrate-posts-from-sqlite.ts
```

If any rows fail (`fail=N` > 0):
- Read the per-row error messages — most common cause is `(brand,slug)` unique
  constraint hits (post already migrated in a previous attempt → safe, skip)
- Re-run; the `payload_id IS NULL` filter makes it idempotent
- For persistent failures, fix the row in `nuvoxai.db` and re-run

Exit code 2 means at least one row failed — check, fix, re-run until exit 0.

---

## 5. Verify migration

```bash
# How many posts in Payload now?
curl "$PAYLOAD_API_URL/posts?limit=0&depth=0" -H "Authorization: users API-Key $MIGRATION_TOKEN" | jq '.totalDocs'

# How many in nuvoxai.db with payload_id set?
sqlite3 ../youtube-ai-system/nuvoxai.db \
  "SELECT COUNT(*) FROM blog_posts WHERE payload_id IS NOT NULL AND payload_id != ''"
```

Both numbers should match (modulo whatever was filtered by the brand
allowlist in the script).

---

## 6. Revoke the migration token

```
/admin → Users → migrator@nuvoxsaga.com → API Keys → Revoke
/admin → Users → migrator@nuvoxsaga.com → Delete user
```

Then unset locally:

```bash
unset MIGRATION_TOKEN PAYLOAD_API_URL
```

---

## Rollback

Two choices, depending on what went wrong:

**Per-row rollback** — single bad row to remove:
- Delete the offending Payload post via admin UI
- `UPDATE blog_posts SET payload_id=NULL, payload_url=NULL WHERE id=<id>` in SQLite
- Re-run script with `--limit 1` after fixing the source row

**Full rollback** — migration corrupted:
- Restore Neon branch: `pre-migration` → promote to main
- Restore SQLite: `cp nuvoxai.db.bak nuvoxai.db`
- Investigate, fix root cause, restart from step 2

---

## Notes

- Single-operator only. The script's idempotency (`payload_id IS NULL`) breaks
  if two processes run concurrently — they'll race and double-publish until
  Payload's `(brand,slug)` unique constraint rejects the second.
- Image paths inside posts (`<img src="...">`) are **not** rewritten by this
  script. Old Ghost-uploaded images remain at their original Ghost URLs until
  Ghost is decommissioned (Sat following launch). At decommission, broken
  images become a known issue — to be handled by the W1b image-upload-to-Payload
  workstream Tuesday.
