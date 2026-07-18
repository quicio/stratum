#!/usr/bin/env bash
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

NEXT=$(printf "%04d" "$(($(ls specs/ | grep -E '^[0-9]' | grep -v _template | sed 's/-.*//' | sort -n | tail -1 | sed 's/^0*//' || echo 0) + 1))")

SLUG="${1:-untitled}"
TITLE="${2:-Untitled spec}"
DATE=$(date +%Y-%m-%d)
FILE="specs/${NEXT}-${SLUG}.md"

cp specs/_template.md "$FILE"
sed -i '' "s/spec-NNNN/spec-${NEXT}/g; s/YYYY-MM-DD/${DATE}/g; s|<title>|\"${TITLE}\"|; s|<Title>|${TITLE}|; s|<short imperative title>|${TITLE}|" "$FILE"

echo "Created $FILE"
echo "Status: draft — remember to update milestone, related, impl_progress."