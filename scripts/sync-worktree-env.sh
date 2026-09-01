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
    | grep -zv '/node_modules/' \
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
done

echo
if [[ $dry_run -eq 1 ]]; then
  echo "Dry run — no files were changed."
else
  echo "Done: $copied copied, $skipped skipped (already present; use --force to overwrite)."
  echo "Review URLs/ports in the copied files — a worktree running its own portless-proxied"
  echo "instance may need different values than the main checkout (see docs/development.md)."
fi
