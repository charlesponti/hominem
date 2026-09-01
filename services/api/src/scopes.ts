// All MCP tool scopes live here - import from this module, don't hardcode a
// scope string elsewhere. Turning tools on/off is a code change, not an env var.

export const MCP_SCOPES = [
  'calendar:read',
  'career:read',
  'career:write',
  'collections:read',
  'collections:write',
  'finance:read',
  'health:read',
  'media:read',
  'memory:read',
  'memory:write',
  'people:read',
  'places:read',
  'social:read',
  'tags:read',
  'tags:write',
  'travel:read',
] as const;

export type McpScope = (typeof MCP_SCOPES)[number];

// Scopes that actually get MCP tools registered. Defaults to all of them -
// trim this list if you only want a subset registered.
export const MCP_ENABLED_SCOPES: readonly McpScope[] = MCP_SCOPES;
