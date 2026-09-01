#!/usr/bin/env bash
# Keeps the monorepo's declaration graph fresh for development.
#
# Consumers WITH a `references` entry to a composite package (packages/db,
# packages/rpc, apps/web, apps/omiro, ...) get tsserver's live
# project-reference source redirect for free, with zero dependency on that
# package's build/*.d.ts being fresh — verified empirically, including from
# a completely fresh clone with no prior build output anywhere (see
# scripts/check-live-types.mjs and scripts/bench-tsserver.mjs).
#
# services/api is the one consumer that can't do that: it's the Hono
# `typeof rpcApp` RPC type-inference boundary, and AGENTS.md documents that
# such a package must resolve ALL its dependencies via plain paths straight
# to build/*.d.ts, never a `references` entry — even to packages/chat alone,
# which an earlier version of this PR argued was safe (empirically true
# today: full `tsc --noEmit` clean). AGENTS.md's invariant is meant to hold
# as the AppType contract evolves, not just for today's shape, so
# services/api keeps zero `references` entries and depends entirely on this
# watcher for every composite package it consumes, packages/chat included.
#
# `pnpm build` still does a real composite `tsc -b` for CI/deployment;
# that's unrelated to this script.
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
