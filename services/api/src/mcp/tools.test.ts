import { describe, expect, it } from 'vitest';
import * as z from 'zod';

import { callTool, listTools, registerTool } from './tools';

const userId = '11111111-1111-4111-8111-111111111111';

describe('MCP tool registry', () => {
  it('starts with no registered tools', () => {
    const tools = listTools();
    expect(tools).toHaveLength(0);
  });

  it('rejects unknown tool names with a stable validation error', async () => {
    await expect(callTool(userId, 'raw_sql', {})).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
      statusCode: 400,
    });
  });

  it('preserves null structured content for no-data responses', async () => {
    registerTool(
      'nullable_test_tool',
      {
        name: 'nullable_test_tool',
        title: 'Nullable test tool',
        description: 'Returns null for no-data cases.',
        inputSchema: z.object({}),
        outputSchema: z.object({ value: z.string() }).nullable(),
        readOnly: true,
        scopes: ['career:read'],
        sensitivity: 'standard',
        resultCap: 1,
      },
      async () => null,
    );

    await expect(callTool(userId, 'nullable_test_tool', {})).resolves.toMatchObject({
      structuredContent: null,
      content: [{ type: 'text', text: 'null' }],
    });
  });

  it('validates tool output against its declared schema', async () => {
    registerTool(
      'invalid_output_tool',
      {
        name: 'invalid_output_tool',
        title: 'Invalid output tool',
        description: 'Returns output that violates its schema.',
        inputSchema: z.object({}),
        outputSchema: z.object({ value: z.string() }),
        readOnly: true,
        scopes: ['career:read'],
        sensitivity: 'standard',
        resultCap: 1,
      },
      async () => ({ value: 123 }),
    );

    await expect(callTool(userId, 'invalid_output_tool', {})).rejects.toThrow();
  });

  it('enforces the declared result cap', async () => {
    registerTool(
      'oversized_output_tool',
      {
        name: 'oversized_output_tool',
        title: 'Oversized output tool',
        description: 'Returns more records than allowed.',
        inputSchema: z.object({}),
        outputSchema: z.object({ items: z.array(z.number()) }),
        readOnly: true,
        scopes: ['career:read'],
        sensitivity: 'standard',
        resultCap: 1,
      },
      async () => ({ items: [1, 2] }),
    );

    await expect(callTool(userId, 'oversized_output_tool', {})).rejects.toThrow(/cap/);
  });
});
