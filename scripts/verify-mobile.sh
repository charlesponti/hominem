#!/usr/bin/env bash
set -euo pipefail

bunx tsc -p apps/mobile/tsconfig.json --noEmit
bun run --filter @hominem/mobile verify:expo-config
bash scripts/verify-mobile-design.sh
bun run --filter @hominem/hono-rpc typecheck
