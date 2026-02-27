# ADR: Plugin Safety Boundary

## Decision
Plugins are explicit and must declare a manifest (`hominem.plugin.json`).
Execution boundary is process isolation via child-process + JSON-RPC.

## Security Properties
- No implicit plugin scanning
- Explicit trust and allow-listing
- Isolated failure domain per plugin
- Single-request JSON-RPC boundary over stdin/stdout (`src/v2/plugin-rpc.ts`)
- Entry path confinement to plugin root (`resolvePluginEntry(...)`)
