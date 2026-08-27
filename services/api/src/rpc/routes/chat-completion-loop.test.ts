import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  callTool: vi.fn(),
  getToolDefinition: vi.fn(),
  streamChatCompletion: vi.fn(),
}));

vi.mock('@hominem/ai', () => ({
  getChatCompletionUsage: vi.fn(() => null),
  OpenRouterRequestError: class OpenRouterRequestError extends Error {
    status?: number;

    constructor(message: string, options: { status?: number } = {}) {
      super(message);
      this.status = options.status;
    }
  },
  streamChatCompletion: mocks.streamChatCompletion,
}));

vi.mock('../../mcp/tool-registry', () => ({
  callTool: mocks.callTool,
  getToolDefinition: mocks.getToolDefinition,
}));

import { runCompletionWithTools } from './chat-completion-loop';

async function* streamChunks(chunks: object[]) {
  yield* chunks;
}

function toolCallChunk(toolName: string, id: string, index: number, argumentsJson = '{}') {
  return {
    choices: [
      {
        delta: {
          toolCalls: [
            {
              index,
              id,
              function: { name: toolName, arguments: argumentsJson },
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

  it('returns a pending confirmation without invoking the tool', async () => {
    mocks.getToolDefinition.mockReturnValue({
      requiresConfirmation: true,
      preview: vi.fn().mockResolvedValue({ title: 'Saved preference' }),
    });
    mocks.streamChatCompletion.mockImplementationOnce(() =>
      streamChunks([toolCallChunk('forget_memory', 'call-1', 0)]),
    );

    const result = await runCompletionWithTools({
      userId: 'user-1',
      model: 'test-model',
      messages: [{ role: 'user', content: 'Forget that preference.' }],
      tools: [],
      toolRuntime: { callTool: mocks.callTool, getToolDefinition: mocks.getToolDefinition },
    });

    expect(mocks.callTool).not.toHaveBeenCalled();
    expect(result.pendingToolCall).toMatchObject({ toolName: 'forget_memory' });
    expect(result.toolCallRecords[0]).toMatchObject({ status: 'pending' });
  });

  it('returns a final text answer after the interaction budget is exhausted', async () => {
    mocks.getToolDefinition.mockReturnValue({ readOnly: false });
    mocks.streamChatCompletion
      .mockImplementationOnce(() => streamChunks([toolCallChunk('search_memories', 'call-1', 0)]))
      .mockImplementationOnce(() => streamChunks([textChunk('Final answer.')]))
      .mockImplementationOnce(() => streamChunks([textChunk('Final answer.')]));

    const result = await runCompletionWithTools({
      userId: 'user-1',
      model: 'test-model',
      messages: [{ role: 'user', content: 'Use memory.' }],
      tools: [],
      maxIterations: 1,
      toolRuntime: { callTool: mocks.callTool, getToolDefinition: mocks.getToolDefinition },
    });

    expect(result.assistantText).toBe('Final answer.');
  });

  it('returns an error result to the model for malformed tool arguments', async () => {
    mocks.streamChatCompletion
      .mockImplementationOnce(() =>
        streamChunks([toolCallChunk('search_memories', 'call-1', 0, '{not json')]),
      )
      .mockImplementationOnce(() => streamChunks([textChunk('I need valid search details.')]));

    const result = await runCompletionWithTools({
      userId: 'user-1',
      model: 'test-model',
      messages: [{ role: 'user', content: 'Search my memories.' }],
      tools: [],
    });

    expect(mocks.callTool).not.toHaveBeenCalled();
    expect(result.assistantText).toBe('I need valid search details.');
  });

  it('retries transient provider rate limits before returning the response', async () => {
    mocks.streamChatCompletion
      .mockImplementationOnce(async function* () {
        yield { error: { code: 429, message: 'Provider rate limit exceeded' } };
      })
      .mockImplementationOnce(() => streamChunks([textChunk('Recovered response.')]));

    const result = await runCompletionWithTools({
      userId: 'user-1',
      model: 'test-model',
      messages: [{ role: 'user', content: 'Try again.' }],
      tools: [],
    });

    expect(result.assistantText).toBe('Recovered response.');
    expect(mocks.streamChatCompletion).toHaveBeenCalledTimes(2);
  });

  it('continues after a tool failure and records no successful call', async () => {
    mocks.getToolDefinition.mockReturnValue({ readOnly: true });
    mocks.callTool.mockRejectedValueOnce(new Error('Fixture unavailable'));
    mocks.streamChatCompletion
      .mockImplementationOnce(() => streamChunks([toolCallChunk('search_memories', 'call-1', 0)]))
      .mockImplementationOnce(() => streamChunks([textChunk('I could not retrieve that memory.')]));

    const result = await runCompletionWithTools({
      userId: 'user-1',
      model: 'test-model',
      messages: [{ role: 'user', content: 'Search my memories.' }],
      tools: [],
    });

    expect(result.toolCallRecords).toEqual([]);
    expect(result.assistantText).toBe('I could not retrieve that memory.');
  });
});
