#!/usr/bin/env bash
# Copy real (git-ignored) .env files from the main checkout into the current
# git worktree, so a freshly created worktree doesn't have to hunt down
# secrets by hand before `pnpm dev` works.
#
# Usage (run from inside the worktree that needs the files):
#   scripts/sync-worktree-env.sh              # copy anything missing
#   scripts/sync-worktree-env.sh --force       # also overwrite existing files
#   scripts/sync-worktree-env.sh --dry-run     # print what would happen, change nothing
set -euo pipefail

force=0
dry_run=0
for arg in "$@"; do
  case "$arg" in
    --force) force=1 ;;
    --dry-run) dry_run=1 ;;
    *)
      echo "Unknown argument: $arg" >&2
      echo "Usage: $0 [--force] [--dry-run]" >&2
      exit 1
      ;;
  esac
done

dest_root="$(git rev-parse --show-toplevel)"
main_root="$(dirname "$(git rev-parse --git-common-dir)")"
main_root="$(cd "$main_root" && pwd)"

if [[ "$main_root" == "$dest_root" ]]; then
  echo "Already in the main checkout ($main_root) — nothing to sync." >&2
  exit 0
fi

echo "Source (main checkout): $main_root"
echo "Destination (this worktree): $dest_root"
echo

# Real env files are git-ignored, so ask git itself which .env* files exist
# and are ignored — this picks up every app/package/service without a
# hardcoded list, and skips .env.example / .env.*.example, which are
# tracked and already present via the worktree's own checkout.
mapfile -d '' -t files < <(
  git -C "$main_root" ls-files --others --ignored --exclude-standard -z -- '*.env*' \
    | grep -zv '^node_modules/\|/node_modules/' \
    | grep -zv '^\.claude/' \
    | grep -zv '/$' \
    | grep -zv '\.example$'
)

if [[ ${#files[@]} -eq 0 ]]; then
  echo "No git-ignored .env files found in the main checkout."
  exit 0
fi

copied=0
skipped=0
copied_rel=()
for rel in "${files[@]}"; do
  src="$main_root/$rel"
  dst="$dest_root/$rel"

  if [[ -e "$dst" && $force -eq 0 ]]; then
    echo "skip (exists):  $rel"
    skipped=$((skipped + 1))
    continue
  fi

  if [[ $dry_run -eq 1 ]]; then
    echo "would copy:     $rel"
    continue
  fi

  mkdir -p "$(dirname "$dst")"
  cp "$src" "$dst"
  echo "copied:         $rel"
  copied=$((copied + 1))
  copied_rel+=("$rel")
done

echo
if [[ $dry_run -eq 1 ]]; then
  echo "Dry run — no files were changed."
  exit 0
fi
echo "Done: $copied copied, $skipped skipped (already present; use --force to overwrite)."

# Files copied verbatim from the main checkout carry its plain portless
# hostnames (api.lvh.me, career.lvh.me, ...). Under portless, a linked
# worktree actually gets served at a branch-prefixed hostname instead (see
# the hominem-development skill's "Git worktrees" note) — copying the main
# checkout's URLs as-is means this worktree's apps redirect to origins that
# aren't the ones portless proxies for it. Patch just-copied files to the
# URLs portless actually resolves for this worktree.
was_copied() {
  local needle="$1"
  local rel
  for rel in "${copied_rel[@]}"; do
    if [[ "$rel" == "$needle" ]]; then
      return 0
    fi
  done
  return 1
}

set_env_url() {
  local file="$1" key="$2" value="$3"
  [[ -f "$file" ]] || return 0
  grep -q "^${key}=" "$file" || return 0
  awk -v k="$key" -v v="$value" -F= 'BEGIN{OFS="="} $1==k{$0=k"=\""v"\""} {print}' "$file" > "$file.tmp"
  mv "$file.tmp" "$file"
}

if ! command -v pnpm >/dev/null 2>&1; then
  echo
  echo "pnpm not found — skipping portless URL patching. Review URLs/ports manually" >&2
  echo "(see the hominem-development skill: .agents/skills/hominem-development/SKILL.md)." >&2
  exit 0
fi

declare -A portless_urls=()
for app in api web career finance; do
  url="$(cd "$dest_root" && pnpm exec portless get "$app" 2>/dev/null)" || url=""
  if [[ -n "$url" ]]; then
    portless_urls["$app"]="$url"
  fi
done

if [[ ${#portless_urls[@]} -eq 0 ]]; then
  echo
  echo "Couldn't resolve this worktree's portless URLs (proxy not started yet?) —" >&2
  echo "leaving *_URL values as copied from the main checkout. Start the proxy" >&2
  echo "(see the hominem-development skill) then re-run with --force." >&2
  exit 0
fi

echo
echo "Patching portless URLs for this worktree's branch prefix:"
for app in "${!portless_urls[@]}"; do
  echo "  $app -> ${portless_urls[$app]}"
done

if [[ -n "${portless_urls[api]:-}" ]]; then
  api_url="${portless_urls[api]}"
  if was_copied "services/api/.env"; then
    set_env_url "$dest_root/services/api/.env" API_URL "$api_url"
  fi
  for app_dir in apps/web apps/career apps/finance; do
    was_copied "$app_dir/.env" || continue
    set_env_url "$dest_root/$app_dir/.env" VITE_PUBLIC_API_URL "$api_url"
    set_env_url "$dest_root/$app_dir/.env" HOMINEM_INTERNAL_API_URL "$api_url"
  done
fi
for app in web career finance; do
  [[ -n "${portless_urls[$app]:-}" ]] || continue
  if was_copied "services/api/.env"; then
    set_env_url "$dest_root/services/api/.env" "$(echo "$app" | tr '[:lower:]' '[:upper:]')_URL" "${portless_urls[$app]}"
  fi
  if was_copied "apps/$app/.env"; then
    set_env_url "$dest_root/apps/$app/.env" PUBLIC_APP_URL "${portless_urls[$app]}"
  fi
done
