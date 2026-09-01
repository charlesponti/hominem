import { MCP_ENABLED_SCOPES } from '../scopes';

// Only imports tools whose scope is in MCP_ENABLED_SCOPES. Shared by the MCP
// HTTP server (mcp/routes.ts) and the in-process chat tool adapter
// (mcp/chat-tool-adapter.ts) so neither one has to run first.
let registrationPromise: Promise<void> | null = null;

async function registerAll(): Promise<void> {
  const enabledScopes = new Set<string>(MCP_ENABLED_SCOPES);
  const isEnabled = (...scopes: string[]) =>
    enabledScopes.size === 0 || scopes.some((scope) => enabledScopes.has(scope));

  const imports: Array<Promise<unknown>> = [];
  if (isEnabled('calendar:read', 'travel:read')) imports.push(import('./tools/calendar'));
  if (isEnabled('career:read', 'career:write')) imports.push(import('./tools/career'));
  if (isEnabled('collections:read', 'collections:write')) {
    imports.push(import('./tools/collections'));
  }
  if (isEnabled('finance:read')) imports.push(import('./tools/finance'));
  if (isEnabled('health:read')) imports.push(import('./tools/health'));
  if (isEnabled('media:read')) imports.push(import('./tools/media'));
  if (isEnabled('memory:read', 'memory:write')) imports.push(import('./tools/memory'));
  if (isEnabled('people:read')) imports.push(import('./tools/people'));
  if (isEnabled('places:read')) imports.push(import('./tools/places'));
  if (isEnabled('tags:read', 'tags:write')) imports.push(import('./tools/tags'));
  if (isEnabled('social:read')) imports.push(import('./tools/social'));

  await Promise.all(imports);
}

export function ensureMcpToolsRegistered(): Promise<void> {
  if (!registrationPromise) {
    registrationPromise = registerAll().catch((error: unknown) => {
      registrationPromise = null;
      throw error;
    });
  }
  return registrationPromise;
}
