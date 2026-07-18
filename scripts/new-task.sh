#!/usr/bin/env bash
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

DATE=$(date +%Y-%m-%d)
SPEC_REF="${1:?usage: new-task.sh <spec-id> <title>}"
TITLE="${2:?usage: new-task.sh <spec-id> <title>}"
SLUG=$(echo "$TITLE" | tr '[:upper:] ' '[:lower:]-' | sed 's/[^a-z0-9-]//g')
ID="task-${DATE}-${SPEC_REF}"
FILE="tasks/${DATE}-${SPEC_REF}.md"

cp tasks/_template.md "$FILE"
sed -i '' "s/task-YYYY-MM-DD-spec-NNNN/${ID}/g; s/YYYY-MM-DD/${DATE}/g; s|<short title>|\"${TITLE}\"|; s/spec-NNNN/${SPEC_REF}/g" "$FILE"

echo "Created $FILE"