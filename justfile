set shell := ["/usr/bin/env", "bash", "-lc"]

default:
    @just --list

test:
    bun run test

lint:
    bun run lint
    bun run typecheck

watch-test:
    watchexec -e ts,tsx,js,jsx,json --debounce 250ms --restart --clear -- just test

watch-lint:
    watchexec -e ts,tsx,js,jsx,json --debounce 250ms --restart --clear -- just lint
