import { describe, expect, it } from 'vitest';

import { ensureMcpToolsRegistered } from './register-tools';
import { getToolDefinition } from './tool-registry';

describe('MCP tool registration', () => {
  it('registers create_collection as confirmation-required', async () => {
    await ensureMcpToolsRegistered();

    expect(getToolDefinition('create_collection')).toMatchObject({
      name: 'create_collection',
      requiresConfirmation: true,
    });
  });
});
