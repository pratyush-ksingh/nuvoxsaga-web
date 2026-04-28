# Pagefind Index Runbook

When and how to build the static search index for `/search`.

## When

Run after **every deploy that materially changes the post set**. In
practice this is:

- First deploy after Phase 0 (`bash infra/pagefind-crawl.sh <preview-url>`)
- Day after migration script ships old Ghost posts into Payload (a lot of
  new pages to index)
- After DNS cutover (re-run against `https://nuvoxsaga.com`)
- Weekly cadence post-launch (`yt_analytics_pull.py` weekend run is a
  good anchor)

**Do not** rebuild after every routine blog post — daily incremental
churn isn't worth the round-trip. Pagefind misses a few new posts; users
fall back to brand/tag navigation.

## Why this is awkward

Next 16 RSC pages are rendered on request, not built to disk as static
HTML. Pagefind's primary mode (`--site <dir>`) wants a directory of
HTML files. So the flow is:

1. Crawl the deployed URL with `wget` → temp directory of HTML
2. Run `pagefind --site <tempdir> --output-path public/_pagefind`
3. Commit `public/_pagefind` and push → Vercel redeploys with the index
4. `/search` page picks up `/_pagefind/pagefind-ui.js`

A single bash script wraps all four:

```bash
bash infra/pagefind-crawl.sh https://nuvoxsaga.com
git add public/_pagefind
git commit -m "search: refresh pagefind index"
git push
```

Or, npm-flavoured:

```bash
npm run search-index -- https://nuvoxsaga.com
```

## Failure modes

- **wget exits 8** — at least one URL returned 4xx/5xx. The script
  ignores this; partial crawls still index everything that came back 200.
- **Crawl is empty** — wrong URL or DNS not pointed yet. Verify
  `curl -I <url>/` returns 200 first.
- **`/search` still says "Search isn't wired"** — `public/_pagefind/`
  must be committed AND deployed. Check the latest deploy log.
- **Crawl picks up admin/auth pages** — they're behind middleware-
  enforced redirects, so wget gets the redirect HTML; pagefind indexes
  the login page once. Acceptable noise; can be filtered later by
  adjusting wget `--reject`.

## When to skip

If you're shipping a code-only change (no new posts, no schema change,
no new pages), skip. The existing index keeps working.

## Future improvement

A GitHub Action could run pagefind nightly against the preview URL
(needs `LIGHTHOUSE_BASE_URL` repo variable). Skipping for now —
manual cadence is fine for a solo-author blog.
