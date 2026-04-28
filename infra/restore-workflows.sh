#!/usr/bin/env bash
# Restore CI workflow files from staging once `gh auth refresh -s workflow`
# has been run. Phase 11 punted them to _workflow-staging/ because the
# OAuth token at the time lacked `workflow` scope.
#
# Usage:
#   gh auth refresh -h github.com -s workflow
#   bash infra/restore-workflows.sh
set -euo pipefail

cd "$(dirname "$0")/.."

# Sanity: must land in the nuvoxsaga-web repo. Guards against the script
# being invoked from outside the project (sibling repo, /tmp, etc.) and
# committing into the wrong worktree.
toplevel="$(git rev-parse --show-toplevel 2>/dev/null || true)"
if [ -z "$toplevel" ] || [ ! -f "$toplevel/package.json" ] || ! grep -q '"nuvoxsaga-web"' "$toplevel/package.json"; then
  echo "✗ not in nuvoxsaga-web repo (cwd=$(pwd))" >&2
  exit 1
fi
cd "$toplevel"

if [ ! -d .github/_workflow-staging ]; then
  echo "✓ no staged workflows — already restored or never existed"
  exit 0
fi

mkdir -p .github/workflows
moved=0
for f in .github/_workflow-staging/*.yml; do
  [ -f "$f" ] || continue
  base="$(basename "$f")"
  git mv "$f" ".github/workflows/$base"
  echo "→ moved $base"
  moved=$((moved + 1))
done

# Remove the now-empty staging dir
rmdir .github/_workflow-staging 2>/dev/null || true

if [ "$moved" -eq 0 ]; then
  echo "✓ no .yml files in staging"
  exit 0
fi

git commit -m "ci: restore $moved workflow file(s) from staging

Token now has the 'workflow' OAuth scope per gh auth refresh -s workflow.
Workflows were parked in .github/_workflow-staging/ since Phase 11 to
avoid push rejection.
"

echo
echo "✓ committed. Push with: git push origin master"
