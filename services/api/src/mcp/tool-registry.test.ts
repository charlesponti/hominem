import { describe, expect, it } from 'vitest';
import * as z from 'zod';

import {
  callTool,
  getToolCapabilities,
  getToolDefinition,
  listTools,
  listToolsForScopes,
  registerTool,
} from './tool-registry';

const userId = '11111111-1111-4111-8111-111111111111';

describe('MCP tool registry', () => {
  it('starts with no registered tools', () => {
    const tools = listTools();
    expect(tools).toHaveLength(0);
  });

  it('keeps an immutable tool snapshot until registration changes', () => {
    const initialTools = listTools();
    expect(listTools()).toBe(initialTools);
    expect(Object.isFrozen(initialTools)).toBe(true);

    registerTool(
      {
        name: 'snapshot_test_tool',
        title: 'Snapshot test tool',
        description: 'Used to verify registry snapshots.',
        inputSchema: z.object({}),
        outputSchema: z.object({ value: z.string() }),
        readOnly: true,
        scopes: ['career:read'],
        resultCap: 1,
      },
      async () => ({ value: 'snapshot' }),
    );

    expect(listTools()).not.toBe(initialTools);
    expect(listTools()).toHaveLength(1);
  });

  it('derives unique chat capabilities and filters tools by every granted scope', () => {
    const definition = {
      name: 'scope_test_tool',
      title: 'Scope test tool',
      description: 'Used to verify scope projection.',
      inputSchema: z.object({}),
      outputSchema: z.object({ value: z.string() }),
      readOnly: true,
      scopes: ['career:read', 'career:write', 'unknown:read', 'career:read'],
      resultCap: 1,
    } as const;
    registerTool(definition, async () => ({ value: 'scope' }));

    expect(getToolCapabilities(definition)).toEqual(['career']);
    expect(getToolDefinition(definition.name)).toBe(definition);
    expect(listToolsForScopes(['career:read'])).not.toContain(definition);
    expect(listToolsForScopes(['career:read', 'career:write', 'unknown:read'])).toContain(
      definition,
    );
  });

  it('rejects unknown tool names with a stable validation error', async () => {
    await expect(callTool(userId, 'raw_sql', {})).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
      statusCode: 400,
    });
  });

  it('preserves null structured content for no-data responses', async () => {
    registerTool(
      {
        name: 'nullable_test_tool',
        title: 'Nullable test tool',
        description: 'Returns null for no-data cases.',
        inputSchema: z.object({}),
        outputSchema: z.object({ value: z.string() }).nullable(),
        readOnly: true,
        scopes: ['career:read'],
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
      {
        name: 'invalid_output_tool',
        title: 'Invalid output tool',
        description: 'Returns output that violates its schema.',
        inputSchema: z.object({}),
        outputSchema: z.object({ value: z.string().refine(() => false) }),
        readOnly: true,
        scopes: ['career:read'],
        resultCap: 1,
      },
      async () => ({ value: 'valid before output validation' }),
    );

    await expect(callTool(userId, 'invalid_output_tool', {})).rejects.toThrow();
  });

  it('enforces the declared result cap', async () => {
    registerTool(
      {
        name: 'oversized_output_tool',
        title: 'Oversized output tool',
        description: 'Returns more records than allowed.',
        inputSchema: z.object({}),
        outputSchema: z.object({ items: z.array(z.number()) }),
        readOnly: true,
        scopes: ['career:read'],
        resultCap: 1,
      },
      async () => ({ items: [1, 2] }),
    );

    await expect(callTool(userId, 'oversized_output_tool', {})).rejects.toThrow(/cap/);
  });

  it('rejects non-object structured output', async () => {
    registerTool(
      {
        name: 'array_output_tool',
        title: 'Array output tool',
        description: 'Returns an array despite its output declaration.',
        inputSchema: z.object({}),
        outputSchema: z.array(z.string()),
        readOnly: true,
        scopes: ['career:read'],
        resultCap: 1,
      },
      async () => ['invalid'] as never,
    );

    await expect(callTool(userId, 'array_output_tool', {})).rejects.toThrow(
      'MCP tool returned invalid structured content: array_output_tool',
    );
  });

  it('passes internal idempotency context to tool implementations', async () => {
    let receivedKey: string | undefined;
    registerTool(
      {
        name: 'idempotency_context_tool',
        title: 'Idempotency context tool',
        description: 'Receives an internal replay key.',
        inputSchema: z.object({}),
        outputSchema: z.object({ value: z.string() }),
        readOnly: false,
        scopes: ['career:write'],
        resultCap: 1,
      },
      async (_ownerUserId, _input, context) => {
        receivedKey = context?.idempotencyKey;
        return { value: 'ok' };
      },
    );

    await callTool(userId, 'idempotency_context_tool', {}, { idempotencyKey: 'generation:key' });
    expect(receivedKey).toBe('generation:key');
  });

  it('rejects duplicate tool names', () => {
    const definition = {
      name: 'duplicate_tool',
      title: 'Duplicate tool',
      description: 'Used to verify registry uniqueness.',
      inputSchema: z.object({}),
      outputSchema: z.object({ value: z.string() }),
      readOnly: true,
      scopes: ['career:read'],
      resultCap: 1,
    } as const;

    registerTool(definition, async () => ({ value: 'first' }));
    expect(() => registerTool(definition, async () => ({ value: 'second' }))).toThrow(
      'MCP tool is already registered: duplicate_tool',
    );
  });
});
