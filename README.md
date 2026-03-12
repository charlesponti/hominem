## Hominem monorepo

This repo uses Bun as the package manager and script runner.

### Prerequisites

- Bun 1.3.0
- Node.js 22.14.0

Toolchain versions are pinned in `.tool-versions` and `.node-version`.

Run a local environment check:

- `bun run dev:doctor`

### Common tasks

- Install deps:

	bun install

- Build all packages:

	bun run build

- Develop (example):

	bun run dev

### Canonical Docs

- Local setup: `.github/skills/setup-workflow/SKILL.md`
- Deployment: `.github/skills/deployment-workflow/SKILL.md`
- Docker: `.github/skills/docker-workflow/SKILL.md`

### Sharing skills between projects

Skills are defined under `.github/skills` and are repo‑scoped.  To move them
elsewhere you can use the CLI helpers:

```bash
# from the source repository
hominem skills export /tmp/skills-export

# in the new repository
hominem skills import /tmp/skills-export
```

The commands simply copy the directory tree, creating the destination as
needed.  Once imported you can commit the files in the new project as usual.

### MCP server auth (single source of truth)

The MCP server reads its auth token from a config file only.

- Path: ~/.hominem/config.json (override with HOMINEM_CONFIG_PATH or HOMINEM_CONFIG_DIR)
- Format:

	{ "token": "YOUR_TOKEN_HERE" }

Optional API endpoint overrides for MCP HTTP tools:

- HOMINEM_API_HOST (default: localhost)
- HOMINEM_API_PORT (default: 4040)
