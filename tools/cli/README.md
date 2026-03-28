# @hominem/cli

Automation-first CLI for hominem, replatformed to a typed command graph runtime.

## Runtime Properties
- Single framework execution host (`src`)
- Lazy command loading via static registry
- Structured output envelopes for `text`, `json`, and `ndjson`
- Deterministic exit code taxonomy

## Command Taxonomy
- `hominem auth ...`
- `hominem ai ...`
- `hominem data ...`
- `hominem files ...`
- `hominem agent ...`
- `hominem system ...`
- `hominem config ...`
- `hominem skills ...` (export/import `.github/skills`)

## Build and Distribution
- Primary artifact: compiled binary (`dist/hominem`)
- Build: `bun run --filter @hominem/cli build`
- Run built binary: `./tools/cli/dist/hominem --help`

## Config v2
- Canonical path: `~/.hominem/config.json`
