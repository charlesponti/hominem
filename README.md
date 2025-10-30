## Hominem monorepo

This repo uses Bun as the package manager and script runner.

### Prerequisites

- Bun 1.3+

### Common tasks

- Install deps:

	bun install

- Build all packages:

	bun run build

- Develop (example):

	bun run -C apps/api dev

### MCP server auth (single source of truth)

The MCP server reads its auth token from a config file only.

- Path: ~/.hominem/config.json (override with HOMINEM_CONFIG_PATH or HOMINEM_CONFIG_DIR)
- Format:

	{ "token": "YOUR_TOKEN_HERE" }

Optional API endpoint overrides for MCP HTTP tools:

- HOMINEM_API_HOST (default: localhost)
- HOMINEM_API_PORT (default: 4040)
