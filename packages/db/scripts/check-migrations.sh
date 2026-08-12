#!/usr/bin/env bash
# Validates the filename and Goose section structure of every SQL migration.
set -euo pipefail

migrations_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/../migrations" && pwd)"
status=0

while IFS= read -r -d '' file; do
    name="$(basename "$file")"
    if [[ ! "$name" =~ ^[0-9]{14}_[a-z0-9]+(_[a-z0-9]+)*\.sql$ ]]; then
        echo "Invalid migration filename: $name" >&2
        status=1
        continue
    fi

    up_line="$(grep -nFx -- '-- +goose Up' "$file" | head -n 1 | cut -d: -f1 || true)"
    down_line="$(grep -nFx -- '-- +goose Down' "$file" | head -n 1 | cut -d: -f1 || true)"
    if [[ -z "$up_line" || -z "$down_line" || "$up_line" -ge "$down_line" ]]; then
        echo "Migration must contain ordered Goose Up and Down sections: $name" >&2
        status=1
    fi
done < <(find "$migrations_dir" -maxdepth 1 -type f -name '*.sql' -print0)

if [[ "$status" -ne 0 ]]; then
    exit "$status"
fi

echo "All migration filenames and Goose sections are valid."
