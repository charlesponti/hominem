#!/usr/bin/env bash
set -euo pipefail

echo "Starting @hominem/data -> @hominem/services/@hominem/db replacement script"

dirs_to_exclude=("*/node_modules/*" "./packages/db/*" "./packages/services/build/*" "./.git/*")
exclude_args=()
for p in "${dirs_to_exclude[@]}"; do
  exclude_args+=( -not -path "$p" )
done

# Build find command to list files
read -r -d '' FIND_CMD <<'F'
find . -type f \( -name '*.ts' -o -name '*.tsx' -o -name '*.js' -o -name '*.jsx' -o -name '*.d.ts' -o -name '*.json' \)
F

# Append exclude args
for p in "${dirs_to_exclude[@]}"; do
  FIND_CMD+=" -not -path '$p'"
done

# Print files count
file_count=$(eval "$FIND_CMD" | wc -l)
echo "Files scanned: $file_count"

# Specific mappings (run in order: db/schema first, service-specific next, generic fallback last)
mappings=(
  "@hominem/data/db|@hominem/db"
  "@hominem/data/schema|@hominem/db/schema"
  "@hominem/data/services|@hominem/services/services"
  "@hominem/data/redis|@hominem/services/redis"
  "@hominem/data/finance|@hominem/services/finance"
  "@hominem/data/places|@hominem/services/places"
  "@hominem/data/events|@hominem/services/events"
  "@hominem/data/jobs|@hominem/services/jobs"
  "@hominem/data/types|@hominem/services/types"
  "@hominem/data/files|@hominem/services/files"
  "@hominem/data/vector|@hominem/services/vector"
  "@hominem/data/user|@hominem/services/user"
  "@hominem/data/health|@hominem/services/health"
  "@hominem/data/emails|@hominem/services/emails"
  "@hominem/data/chat|@hominem/services/chat"
  "@hominem/data/lists|@hominem/services/lists"
  "@hominem/data/queues|@hominem/services/queues"
  "@hominem/data/notes|@hominem/services/notes"
  "@hominem/data/travel|@hominem/services/travel"
  "@hominem/data/places|@hominem/services/places"
)

# Apply each mapping
for map in "${mappings[@]}"; do
  old=${map%%|*}
  new=${map##*|}
  echo "Replacing $old -> $new"
  # Use find piped to xargs to handle file list robustly
  eval "$FIND_CMD" | xargs -0 -I{} echo {} 2>/dev/null | xargs -I{} perl -0777 -pi -e "s|\Q$old\E|$new|g" {}
done

# Generic replacements (after specifics)
echo "Applying generic mapping: @hominem/data/ -> @hominem/services/"
eval "$FIND_CMD" | xargs -0 -I{} echo {} 2>/dev/null | xargs -I{} perl -0777 -pi -e "s|@hominem/data/|@hominem/services/|g" {}

echo "Applying exact package mapping: @hominem/data -> @hominem/services"
eval "$FIND_CMD" | xargs -0 -I{} echo {} 2>/dev/null | xargs -I{} perl -0777 -pi -e "s|\Q@hominem/data\E|@hominem/services|g" {}

# Summary: find remaining occurrences
echo "Summary: remaining occurrences of '@hominem/data' (if any):"
rg "@hominem/data" || echo "No remaining occurrences found (rg exited non-zero)"

echo "Replacement script finished."
