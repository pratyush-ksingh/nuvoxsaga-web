# nuvoxsaga-web

The website at **nuvoxsaga.com**: a news site with three desks (AI, Space, World).

It is a static site. `next build` writes plain files to `out/`, Cloudflare Pages serves
them, and no server code runs for a page view. The only runtime code is three small
Pages Functions for the newsletter signup.

Stack: Next.js 16 (static export), React 19, Tailwind v4, Pagefind (search),
Cloudflare Pages + Pages Functions + D1. Cost: $0 a month.

## Where the stories come from

Stories are not written here. The pipeline in `../youtube-ai-system`
(`newsdesk/briefs.py` for news briefs, `blog/static_blog.py` for features) writes one
JSON file per story, after its fact-check, to:

    content/posts/<brand_id>/<slug>.json

`lib/content.ts` validates every file at build time, sanitizes the HTML, and leaves out
drafts, future-dated stories and any story without a fact-check record.

`content/posts/` is gitignored on code branches. After every deploy the pipeline mirrors
the published stories to the **`content-live`** branch of this repo. To restore them,
copy `content/` (and `public/media/`) from that branch into a checkout and rebuild.

## Commands

```bash
npm ci
npm run dev          # local dev server
npm run typecheck    # tsc for the site and for the Pages Functions
npm run lint
npx vitest run       # unit tests
npm run build:prod   # static export to out/ + Pagefind index, with the production URL
```

End-to-end smoke tests run against a served build:

```bash
npx wrangler pages dev out --port 3007   # serves out/ with _headers, _redirects, Functions
npx playwright test                      # PLAYWRIGHT_BASE_URL overrides the target
```

## Deploy

Production is deployed by the pipeline after it publishes a story
(`build_and_deploy()` in `../youtube-ai-system/blog/static_blog.py`), from this
working tree:

```bash
npm run build:prod
npx wrangler pages deploy out --project-name nuvoxsaga --branch main
```

Because the pipeline builds whatever is in the working tree, do code work on a branch in
a separate git worktree and merge it in one step. A half-edited tree would go live.

Newsletter secrets are set with `wrangler pages secret put` (names in `.env.example`).

## Layout

- `app/` routes: home, desk fronts (`/ai`, `/space`, `/world`), sections, stories
  (`/<desk>/news/<slug>`), topics, archive, trust pages, feeds, sitemaps, share cards.
- `components/` UI. `lib/` content layer, sanitizer, JSON-LD, Open Graph defaults.
- `functions/` newsletter Pages Functions. `functions-lib/` their shared helpers.
- `public/_headers` security headers and CSP. `public/_redirects` old URLs.
- `content/archive/` the old nuvox-ai.com posts, served under `/archive` as noindex.
- `DESIGN.md` the design system. New pages must follow it.
- `lib/brands.ts` is generated from `../youtube-ai-system/core/brand_config.py`
  (`npm run gen-brands`). Never edit it by hand; the prebuild step fails on drift.

## CI

`.github/workflows/security.yml` runs on every push and PR to `master`: Gitleaks,
`npm audit`, codegen-drift check, `tsc`, lint and CodeQL. `lighthouse.yml` audits the
live site.

## More

- `infra/STATIC_CLOUDFLARE_PLAN.md` why the site is static and how it was launched.
- `infra/security/BANNED.md` packages and tools that must not be installed.
- `infra/legacy/` documents from the retired Payload and Vercel stack, kept for history.
