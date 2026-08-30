#!/usr/bin/env bash
# Keeps the two type-inference-boundary packages' declarations fresh for
# development. Composite packages (db, env, chat, ...) do NOT need a watcher
# here: any consumer with a `references` entry to them (which is all of
# them) gets tsserver's live project-reference source redirect for free —
# verified empirically, including from a completely fresh clone with zero
# prior build output anywhere (see scripts/check-live-types.mjs and
# scripts/bench-tsserver.mjs). `pnpm build` still does a real composite
# `tsc -b` for CI/deployment; that's unrelated to this script.
#
# services/api and packages/rpc are deliberately non-composite (see their
# own tsconfig.json comments — Hono's `typeof rpcApp` RPC-type-inference
# pattern breaks under TS2883 once the package doing the inferring is
# itself composite), so neither can ever be a `references` target. Their
# consumers resolve them via a `paths` alias straight to build/*.d.ts, with
# no live-source fallback — so THESE two genuinely need a watcher.
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
tsc_bin="$root/node_modules/.bin/tsc"
[[ -x "$tsc_bin" ]] || { echo "tsc not found at $tsc_bin" >&2; exit 1; }
trap 'kill 0' EXIT INT TERM

echo "[watch-types] services/api declarations: tsconfig.emit.json"
(cd "$root/services/api" && "$tsc_bin" -p tsconfig.emit.json --watch --preserveWatchOutput) &

echo "[watch-types] packages/rpc declarations: tsconfig.emit.json"
(cd "$root/packages/rpc" && "$tsc_bin" -p tsconfig.emit.json --watch --preserveWatchOutput) &

wait
