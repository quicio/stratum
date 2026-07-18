#!/usr/bin/env bash
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

NEXT="${1:?usage: new-milestone.sh <slug> <title>}"
SLUG="${2:?usage: new-milestone.sh <slug> <title>}"
TITLE="${3:-Untitled milestone}"
DATE=$(date +%Y-%m-%d)
FILE="milestones/${NEXT}-${SLUG}.md"

cp milestones/_template.md "$FILE"
sed -i '' "s/MX/${NEXT}/g; s/YYYY-MM-DD/${DATE}/g; s|<milestone name>|\"${TITLE}\"|; s|<name>|${TITLE}|" "$FILE"

echo "Created $FILE"
echo "Status: planned."