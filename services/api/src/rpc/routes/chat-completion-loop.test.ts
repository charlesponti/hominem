import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  callTool: vi.fn(),
  getToolDefinition: vi.fn(),
  streamChatCompletion: vi.fn(),
}));

vi.mock('@hominem/ai', () => ({
  getChatCompletionUsage: vi.fn(() => null),
  streamChatCompletion: mocks.streamChatCompletion,
}));

vi.mock('../../mcp/tools', () => ({
  callTool: mocks.callTool,
  getToolDefinition: mocks.getToolDefinition,
}));

import { runCompletionWithTools } from './chat-completion-loop';

async function* streamChunks(chunks: object[]) {
  yield* chunks;
}

function toolCallChunk(toolName: string, id: string, index: number) {
  return {
    choices: [
      {
        delta: {
          toolCalls: [
            {
              index,
              id,
              function: { name: toolName, arguments: '{}' },
            },
          ],
        },
      },
    ],
  };
}

function textChunk(content: string) {
  return { choices: [{ delta: { content } }] };
}

describe('runCompletionWithTools', () => {
  beforeEach(() => {
    mocks.callTool.mockReset();
    mocks.getToolDefinition.mockReset();
    mocks.streamChatCompletion.mockReset();
    mocks.callTool.mockResolvedValue({
      content: [{ type: 'text', text: '{"items":[]}' }],
      structuredContent: { items: [] },
    });
  });

  it('executes an identical read-only call once and reuses its result', async () => {
    mocks.getToolDefinition.mockReturnValue({ readOnly: true });
    mocks.streamChatCompletion
      .mockImplementationOnce(() =>
        streamChunks([
          toolCallChunk('list_invites', 'call-1', 0),
          toolCallChunk('list_invites', 'call-2', 1),
        ]),
      )
      .mockImplementationOnce(() => streamChunks([textChunk('No invites found.')]));

    const result = await runCompletionWithTools({
      userId: 'user-1',
      model: 'test-model',
      messages: [{ role: 'user', content: 'What invites have I sent?' }],
      tools: [],
    });

    expect(mocks.callTool).toHaveBeenCalledOnce();
    expect(result.toolCallRecords).toHaveLength(1);
    expect(result.toolCallRecords[0]?.toolCallId).toBe('call-1');
  });

  it('does not deduplicate identical write calls', async () => {
    mocks.getToolDefinition.mockReturnValue({ readOnly: false });
    mocks.streamChatCompletion
      .mockImplementationOnce(() =>
        streamChunks([
          toolCallChunk('create_item', 'call-1', 0),
          toolCallChunk('create_item', 'call-2', 1),
        ]),
      )
      .mockImplementationOnce(() => streamChunks([textChunk('Created both items.')]));

    const result = await runCompletionWithTools({
      userId: 'user-1',
      model: 'test-model',
      messages: [{ role: 'user', content: 'Create two items.' }],
      tools: [],
    });

    expect(mocks.callTool).toHaveBeenCalledTimes(2);
    expect(result.toolCallRecords).toHaveLength(2);
  });

  it('reuses an identical read-only result across tool-loop iterations', async () => {
    mocks.getToolDefinition.mockReturnValue({ readOnly: true });
    mocks.streamChatCompletion
      .mockImplementationOnce(() => streamChunks([toolCallChunk('list_invites', 'call-1', 0)]))
      .mockImplementationOnce(() => streamChunks([toolCallChunk('list_invites', 'call-2', 0)]))
      .mockImplementationOnce(() => streamChunks([textChunk('No invites found.')]));

    const result = await runCompletionWithTools({
      userId: 'user-1',
      model: 'test-model',
      messages: [{ role: 'user', content: 'What invites have I sent?' }],
      tools: [],
    });

    expect(mocks.callTool).toHaveBeenCalledOnce();
    expect(result.toolCallRecords).toHaveLength(1);
  });
});
