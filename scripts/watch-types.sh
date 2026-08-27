#!/usr/bin/env bash
# Watches the monorepo's declaration graph so editors and terminal checks
# always see fresh types during development:
#   - composite packages rebuild via `tsc -b` (db, env, ... -> build/*.d.ts)
#   - services/api and packages/rpc re-emit their self-contained
#     declarations (tsconfig.emit.json, outDir build)
# Consumers' tsservers read the emitted build/*.d.ts and pick up a change
# within the rebuild time. Runtime (tsx, metro, vite) always runs from
# source and is unaffected by these declaration-only rebuilds.
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
tsc_bin="$root/node_modules/.bin/tsc"
[[ -x "$tsc_bin" ]] || { echo "tsc not found at $tsc_bin" >&2; exit 1; }
trap 'kill 0' EXIT INT TERM

echo "[watch-types] composite packages: tsc -b (db, env, utils, ...)"
(cd "$root" && "$tsc_bin" -b --watch --preserveWatchOutput) &

echo "[watch-types] services/api declarations: tsconfig.emit.json"
(cd "$root/services/api" && "$tsc_bin" -p tsconfig.emit.json --watch --preserveWatchOutput) &

echo "[watch-types] packages/rpc declarations: tsconfig.emit.json"
(cd "$root/packages/rpc" && "$tsc_bin" -p tsconfig.emit.json --watch --preserveWatchOutput) &

wait