#!/usr/bin/env bash
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

NEXT=$(printf "%04d" "$(($(ls adr/ | grep -E '^[0-9]' | grep -v _template | sed 's/-.*//' | sort -n | tail -1 | sed 's/^0*//' || echo 0) + 1))")

SLUG="${1:-untitled}"
TITLE="${2:-Untitled ADR}"
DATE=$(date +%Y-%m-%d)
FILE="adr/${NEXT}-${SLUG}.md"

cp adr/_template.md "$FILE"
sed -i '' "s/adr-NNNN/adr-${NEXT}/g; s/YYYY-MM-DD/${DATE}/g; s|<title>|\"${TITLE}\"|; s|<decision title>|${TITLE}|" "$FILE"

echo "Created $FILE"
echo "Status: proposed — update to accepted when decision is made."