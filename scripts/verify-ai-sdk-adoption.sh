#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "[verify-ai-sdk] checking direct provider chat calls outside adapters"
if rg -n "openai\\.chat\\.completions\\.create|openai\\.responses\\.create" apps packages services | rg -v "packages/services/src/file-processor.service.ts|services/api/src/routes/ai/" >/dev/null; then
  echo "[verify-ai-sdk] failed: direct provider chat calls found outside approved adapter modules"
  exit 1
fi

echo "[verify-ai-sdk] checking legacy web polling hook usage"
if rg -n "setInterval\\(|pollForUpdates\\(" apps/notes/app/lib/hooks/use-send-message.ts >/dev/null; then
  echo "[verify-ai-sdk] failed: legacy polling logic still present in web send hook"
  exit 1
fi

echo "[verify-ai-sdk] checking useChat usage on web and mobile"
if ! rg -n "useChat\\(" apps/notes/app apps/mobile >/dev/null; then
  echo "[verify-ai-sdk] failed: useChat not found in runtime chat paths"
  exit 1
fi

echo "[verify-ai-sdk] passed"
