#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MOBILE_DIR="$ROOT_DIR/apps/mobile"

FORBIDDEN_PATTERN='(LinearGradient|expo-blur|withSpring|springify\()'

if rg -n "$FORBIDDEN_PATTERN" "$MOBILE_DIR" -g"*.ts" -g"*.tsx" >/tmp/mobile_design_forbidden.log; then
  echo "Forbidden mobile design primitives detected:"
  cat /tmp/mobile_design_forbidden.log
  exit 1
fi

echo "Mobile design conformance checks passed."
