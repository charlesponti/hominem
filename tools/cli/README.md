# @hominem/cli (v2 runtime)

Automation-first CLI for hominem, replatformed to a typed command graph runtime.

## Runtime Properties
- Single framework execution host (`src/v2`)
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

## Build and Distribution
- Primary artifact: compiled binary (`dist/hominem`)
- Build: `bun run --filter @hominem/cli build`
- Run built binary: `./tools/cli/dist/hominem --help`

## Config v2
- Canonical path: `~/.hominem/config.json`

## Architecture Docs
- `tools/cli/docs/architecture/command-runtime.md`
- `tools/cli/docs/architecture/output-contract.md`
- `tools/cli/docs/architecture/plugin-safety.md`
