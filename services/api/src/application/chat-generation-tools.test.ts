import { createGenerationState } from '@hominem/chat';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as z from 'zod';

import { callTool, getToolDefinition } from '../mcp/tool-registry';
import type { CapabilityDefinition } from './capability';
import { createChatGenerationTools } from './chat-generation-tools';

vi.mock('../mcp/tool-registry', () => ({
  callTool: vi.fn(),
  getToolDefinition: vi.fn(),
}));

const mockedCallTool = vi.mocked(callTool);
const mockedGetToolDefinition = vi.mocked(getToolDefinition);
const call = {
  id: 'call-1',
  name: 'write_memory',
  arguments: '{"value":"x"}',
  iteration: 0,
  turnId: 'turn-1',
};
const state = createGenerationState('generation-1');

function previewDefinition(
  preview: NonNullable<CapabilityDefinition['preview']>,
): CapabilityDefinition {
  return {
    name: 'write_memory',
    title: 'Write memory',
    description: 'Writes a memory.',
    inputSchema: z.record(z.string(), z.unknown()),
    outputSchema: z.record(z.string(), z.unknown()),
    readOnly: false,
    scopes: ['memory:write'],
    resultCap: 10,
    preview,
  };
}

describe('chat generation tools', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockedGetToolDefinition.mockReturnValue(undefined);
  });

  it('executes a tool and returns its text result', async () => {
    mockedCallTool.mockResolvedValue({
      content: [{ type: 'text', text: '{"id":"memory-1"}' }],
      structuredContent: { id: 'memory-1' },
    });
    const tools = createChatGenerationTools({ userId: 'user-1', generationId: 'generation-1' });

    await expect(tools.execute({ call, idempotencyKey: 'key-1', state })).resolves.toEqual({
      callId: 'call-1',
      toolName: 'write_memory',
      content: '{"id":"memory-1"}',
      error: false,
    });
    expect(mockedCallTool).toHaveBeenCalledWith(
      'user-1',
      'write_memory',
      { value: 'x' },
      {
        idempotencyKey: 'key-1',
      },
    );
  });

  it('returns an error result for malformed arguments or registry failures', async () => {
    const tools = createChatGenerationTools({ userId: 'user-1', generationId: 'generation-1' });
    const malformed = { ...call, arguments: 'not-json' };
    await expect(
      tools.execute({ call: malformed, idempotencyKey: 'key-1', state }),
    ).resolves.toMatchObject({
      error: true,
      content: expect.stringContaining('not-json'),
    });

    mockedCallTool.mockRejectedValue(new Error('registry rejected call'));
    await expect(tools.execute({ call, idempotencyKey: 'key-2', state })).resolves.toMatchObject({
      error: true,
      content: '{"error":"registry rejected call"}',
    });

    await expect(
      tools.execute({
        call: { ...call, arguments: '[]' },
        idempotencyKey: 'key-3',
        state,
      }),
    ).resolves.toMatchObject({
      error: true,
      content: '{"error":"Invalid tool arguments for write_memory"}',
    });

    mockedCallTool.mockRejectedValue('registry rejected without an Error');
    await expect(tools.execute({ call, idempotencyKey: 'key-4', state })).resolves.toMatchObject({
      error: true,
      content: '{"error":"Tool call failed"}',
    });
  });

  it('returns a durable effect without invoking the tool again', async () => {
    const stored = {
      callId: 'call-1',
      toolName: 'write_memory',
      content: 'original',
      error: false,
    };
    const store = { get: vi.fn().mockResolvedValue(stored), save: vi.fn() };
    const tools = createChatGenerationTools({
      userId: 'user-1',
      generationId: 'generation-1',
      effectStore: store,
    });

    await expect(tools.execute({ call, idempotencyKey: 'key-1', state })).resolves.toEqual(stored);
    expect(mockedCallTool).not.toHaveBeenCalled();
    expect(store.save).not.toHaveBeenCalled();
  });

  it('persists a newly computed effect when a store is provided', async () => {
    mockedCallTool.mockResolvedValue({
      content: [{ type: 'text', text: 'saved' }],
      structuredContent: null,
    });
    const store = {
      get: vi.fn().mockResolvedValue(null),
      save: vi.fn().mockImplementation(async ({ result }) => result),
    };
    const tools = createChatGenerationTools({
      userId: 'user-1',
      generationId: 'generation-1',
      effectStore: store,
    });

    await expect(tools.execute({ call, idempotencyKey: 'key-1', state })).resolves.toMatchObject({
      content: 'saved',
    });
    expect(store.save).toHaveBeenCalledWith(
      expect.objectContaining({ generationId: 'generation-1', idempotencyKey: 'key-1' }),
    );

    mockedCallTool.mockResolvedValue({ content: [], structuredContent: null });
    await expect(
      tools.execute({
        call: { ...call, arguments: '' },
        idempotencyKey: 'key-2',
        state,
      }),
    ).resolves.toMatchObject({ content: 'null', error: false });
  });

  it('previews confirmation tools, supports tools without previews, and normalizes preview errors', async () => {
    mockedGetToolDefinition.mockReturnValue(
      previewDefinition(vi.fn().mockResolvedValue({ warning: 'irreversible' })),
    );
    const tools = createChatGenerationTools({ userId: 'user-1', generationId: 'generation-1' });

    await expect(tools.preview({ call, idempotencyKey: 'key-1', state })).resolves.toMatchObject({
      content: '{"warning":"irreversible"}',
      error: false,
    });

    mockedGetToolDefinition.mockReturnValue(undefined);
    await expect(tools.preview({ call, idempotencyKey: 'key-2', state })).resolves.toMatchObject({
      content: 'null',
      error: false,
    });

    mockedGetToolDefinition.mockReturnValue(
      previewDefinition(vi.fn().mockRejectedValue(new Error('preview unavailable'))),
    );
    await expect(tools.preview({ call, idempotencyKey: 'key-3', state })).resolves.toMatchObject({
      content: '{"error":"preview unavailable"}',
      error: true,
    });

    mockedGetToolDefinition.mockReturnValue(
      previewDefinition(vi.fn().mockRejectedValue('preview unavailable without an Error')),
    );
    await expect(
      tools.preview({
        call,
        idempotencyKey: 'key-4',
        state,
      }),
    ).resolves.toMatchObject({
      content: '{"error":"Preview failed"}',
      error: true,
    });

    await expect(
      tools.preview({
        call: { ...call, arguments: 'null' },
        idempotencyKey: 'key-5',
        state,
      }),
    ).resolves.toMatchObject({
      content: '{"error":"Invalid tool arguments for write_memory"}',
      error: true,
    });
  });
});
