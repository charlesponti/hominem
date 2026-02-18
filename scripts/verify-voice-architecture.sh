#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "[verify-voice] checking mobile transcription stubs"
if rg -n "stub|TODO.*transcrib|not implemented.*transcrib|mock.*transcrib" apps/mobile/components/media apps/mobile/components/chat apps/mobile/components/notes --glob "*voice*" --glob "*audio*" >/dev/null; then
  echo "[verify-voice] failed: found potential voice transcription stub markers"
  exit 1
fi

echo "[verify-voice] checking recorder state machine duplication"
if rg -n "new Audio\\.Recording\\(" apps/mobile/components apps/mobile/utils | rg -v "apps/mobile/components/media/use-mobile-audio-recorder.ts" >/dev/null; then
  echo "[verify-voice] failed: duplicate audio recorder state machine detected outside use-mobile-audio-recorder.ts"
  exit 1
fi

echo "[verify-voice] checking web transcribe route shared service usage"
if ! rg -n "transcribeVoiceBuffer" apps/notes/app/routes/api.transcribe.ts >/dev/null; then
  echo "[verify-voice] failed: /api/transcribe must delegate to transcribeVoiceBuffer"
  exit 1
fi

echo "[verify-voice] checking for direct OpenAI transcription calls outside shared service"
if rg -n "audio\\.transcriptions\\.create" apps packages services | rg -v "packages/services/src/voice-transcription.service.ts" >/dev/null; then
  echo "[verify-voice] failed: direct OpenAI transcription call found outside shared service"
  exit 1
fi

echo "[verify-voice] passed"
