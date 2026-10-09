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

## Display ads (off by default)

Google AdSense is wired but switched off. Two public values in `.env.production` decide it:

- `NEXT_PUBLIC_ADSENSE_CLIENT=ca-pub-…` the publisher id. On its own it adds the
  `google-adsense-account` meta tag and writes `/ads.txt` at build
  (`scripts/gen-ads-txt.ts`, run by `npm run build`; with the id empty no file ships).
  Both verify the site to AdSense without serving ads.
- `NEXT_PUBLIC_ADS=1` renders the consent tool (Google Privacy & messaging) and the
  AdSense loader in the `<head>` of every page, deliberately including pages that carry no
  unit: Google documents the loader site-wide and its review crawler reads the raw HTML, so
  a tag injected later would read as "code not found". Ad units render on eligible pages
  only: a feature or a story of 300+ words, a desk or section with 5+ stories, home and
  `/latest`. Never on search, policy pages, the archive, 404 or a short brief (`lib/ads.ts`,
  `adsEligible`). A build with `NEXT_PUBLIC_ADS=1` and no valid id fails.

Ad unit ids are placeholders in `lib/ads.ts` (`SLOTS`); paste each unit's `data-ad-slot`
from AdSense there.

The CSP already allows Google's origins, as a `Content-Security-Policy-Report-Only` header
beside the unchanged enforced one (`public/_headers`). After a week with ads on and a
clean console, flip it in one line: give `Content-Security-Policy` the Report-Only value
and delete the Report-Only line (`tests/headers.test.ts` must then be updated to the new
enforced value).

Testing both states (Chromium projects; the WebKit project times out against wrangler dev):

```bash
# ads off: the default build, no ad markup anywhere
npm run build:prod && npx wrangler pages dev out --port 3008
npx playwright test --project=chromium-desktop --project=chromium-reduced-motion

# ads on: needs a feature or a 300-word story, so build from the fixtures
python scripts/make-fixtures.py
NUVOXSAGA_CONTENT_DIR=content-fixtures NEXT_PUBLIC_SITE_URL=http://localhost:3008 \
  NEXT_PUBLIC_ADS=1 NEXT_PUBLIC_ADSENSE_CLIENT=ca-pub-0000000000000000 npm run build --ignore-scripts
npx wrangler pages dev out --port 3008
E2E_ADS=1 npx playwright test e2e/ads.spec.ts --project=chromium-desktop --project=chromium-reduced-motion
```

Lighthouse with ads on: `.lighthouserc.ads.json` (same thresholds; needs the real id).

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
