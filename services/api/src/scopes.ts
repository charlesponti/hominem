/**
 * Single source of truth for MCP scope constants.
 *
 * All MCP tool scopes live here. Never hardcode a scope string elsewhere —
 * import from this module. Scopes are intentionally NOT environment config:
 * enabling/disabling tools is a code decision, not a deploy-time switch.
 */

export const MCP_SCOPES = [
  'calendar:read',
  'career:read',
  'collections:read',
  'collections:write',
  'finance:read',
  'health:read',
  'media:read',
  'people:read',
  'places:read',
  'services:read',
  'social:read',
  'tags:read',
  'tags:write',
  'travel:read',
] as const;

export type McpScope = (typeof MCP_SCOPES)[number];

/**
 * Scopes for which MCP tools are registered. Defaults to every supported
 * scope; narrow this list to register only a subset of tools.
 */
export const MCP_ENABLED_SCOPES: readonly McpScope[] = MCP_SCOPES;
