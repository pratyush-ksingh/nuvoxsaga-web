#!/usr/bin/env bash
# Post-deploy pagefind index build.
#
# Pagefind needs static HTML to index, but Next 16 RSC routes are rendered
# on request — there's no .next/dist/ tree of HTML to point pagefind at
# locally. So we crawl the deployed URL with wget, then run pagefind on
# the dump, and ship the resulting index as a static asset.
#
# Usage:
#   bash infra/pagefind-crawl.sh https://<preview-url>            # crawl preview
#   bash infra/pagefind-crawl.sh https://nuvoxsaga.com            # post-launch
#
# After running, commit public/_pagefind/* and push — Vercel redeploy
# picks them up. The /search page reads /_pagefind/pagefind-ui.js
# at runtime; absent index → graceful "search not available" message.
set -euo pipefail

if [ "$#" -lt 1 ]; then
  echo "usage: $0 <site-url>" >&2
  exit 2
fi

SITE_URL="${1%/}"   # strip trailing slash
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CRAWL_DIR="$(mktemp -d -t pagefind-crawl-XXXXXX)"
OUT_DIR="$ROOT/public/_pagefind"

# Sanity: must run from project root with package.json identifying this repo.
if ! grep -q '"nuvoxsaga-web"' "$ROOT/package.json"; then
  echo "✗ not in nuvoxsaga-web (root=$ROOT)" >&2
  exit 1
fi

# Restrict crawl to the SITE_URL host — wget --domains accepts hostnames.
HOST="$(echo "$SITE_URL" | sed -E 's#^https?://([^/]+).*#\1#')"
if [ -z "$HOST" ]; then
  echo "✗ could not parse host from $SITE_URL" >&2
  exit 1
fi

echo "→ crawling $SITE_URL into $CRAWL_DIR (host=$HOST)"
# Conservative depth — homepage + brand landings + blog index + posts.
# --reject excludes API routes and static assets pagefind can't index.
wget \
  --recursive --level=4 \
  --no-host-directories --convert-links \
  --domains "$HOST" \
  --reject 'api,\.json,\.js,\.css,\.png,\.jpg,\.webp,\.avif,\.svg,\.ico,\.xml,\.txt,\.woff,\.woff2,\.glb,\.gltf' \
  --no-clobber \
  --quiet --show-progress \
  -P "$CRAWL_DIR" \
  "$SITE_URL/" || true   # wget exits 8 on any HTTP error; ignore — partial is fine

# wget drops files with the URL path under CRAWL_DIR. The actual indexable
# directory is whatever's under there.
echo "→ running pagefind on $CRAWL_DIR"
mkdir -p "$OUT_DIR"
npx --yes pagefind --site "$CRAWL_DIR" --output-path "$OUT_DIR"

rm -rf "$CRAWL_DIR"

echo
echo "✓ index built at $OUT_DIR"
echo "  Commit + push:"
echo "    git add public/_pagefind"
echo "    git commit -m 'search: refresh pagefind index'"
echo "    git push"
