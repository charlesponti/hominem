#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MOBILE_DIR="$ROOT_DIR/apps/mobile"
OUTPUT_FILE="$(mktemp)"
trap 'rm -f "$OUTPUT_FILE"' EXIT

FORBIDDEN_PATTERN='(LinearGradient|expo-blur|withSpring|springify\()'

if rg -n "$FORBIDDEN_PATTERN" "$MOBILE_DIR" -g"*.ts" -g"*.tsx" >"$OUTPUT_FILE"; then
  echo "Forbidden mobile design primitives detected:"
  cat "$OUTPUT_FILE"
  exit 1
fi

echo "Mobile design conformance checks passed."
