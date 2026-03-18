#!/usr/bin/env bash
set -euo pipefail

bunx tsc -p apps/mobile/tsconfig.json --noEmit
bun run --filter @hominem/mobile verify:expo-config
bun run --filter @hominem/hono-rpc typecheck

# Block animation primitives not in the approved design system
if rg -n '(withSpring|springify\()' apps/mobile -g'*.ts' -g'*.tsx'; then
  echo "Forbidden animation primitives detected (withSpring, springify). Use the approved animation system instead."
  exit 1
fi

echo "Mobile design conformance checks passed."
