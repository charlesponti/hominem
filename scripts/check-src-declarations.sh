#!/usr/bin/env bash
# Fails if any *.d.ts appears under a source tree that git does not track.
# Hand-written declaration files (env.d.ts, hono.d.ts, ...) are tracked and
# pass; an UNTRACKED declaration under src/ means a declaration emit wrote
# into source — the failure class documented in docs/type-system.md (Guards).
set -euo pipefail

failures=0
while IFS= read -r f; do
  if ! git ls-files --error-unmatch "$f" >/dev/null 2>&1; then
    echo "::error file=${f}::Untracked declaration file under source (emit wrote into src/)" >&2
    failures=1
  fi
done < <(
  find . -name "*.d.ts" \
    -not -path "*/node_modules/*" \
    -not -path "*/.git/*" \
    -not -path "*/build/*" \
    -not -path "*/dist/*" \
    -not -path "*/out/*" \
    -not -path "*/.next/*" \
    -not -path "*/.react-router/*" \
    -not -path "*/.cache/*" \
    -not -path "*/.turbo/*" \
    2>/dev/null
)

if [ "$failures" -ne 0 ]; then
  echo "Found untracked .d.ts files under source trees. A declaration emit wrote into src/; fix the emit config (hardcoded outDir)." >&2
  exit 1
fi
echo "no stray declaration files under source trees"