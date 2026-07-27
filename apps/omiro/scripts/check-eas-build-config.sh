#!/usr/bin/env bash
set -euo pipefail

# Resolves the Omiro EAS build config exactly the way `eas build` does before
# it uploads anything, so a broken env var (missing EXPO_PUBLIC_API_BASE_URL,
# an incompatible eas.json setting, etc.) fails in seconds here instead of
# after minutes of remote archiving in build-and-submit-production.

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
app_dir="$repo_root/apps/omiro"

: "${EXPO_TOKEN:?EXPO_TOKEN must be set to resolve EAS build config}"

profiles=("production")

cd "$app_dir"
for profile in "${profiles[@]}"; do
  echo "Resolving EAS build config for profile '$profile'..."
  if ! pnpm dlx eas-cli@21.2.0 config --profile "$profile" --platform ios --non-interactive; then
    echo "error: EAS build config for profile '$profile' failed to resolve." >&2
    echo "This usually means a required env var (e.g. EXPO_PUBLIC_API_BASE_URL) is missing" >&2
    echo "from the workflow step, or eas.json has a setting incompatible with app.config.ts" >&2
    echo "(e.g. autoIncrement with appVersionSource: local + a dynamic config file)." >&2
    exit 1
  fi
done
