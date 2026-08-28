import { streamChatCompletion } from '@hominem/ai';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { runChatGeneration } from './chat-generation-service';

vi.mock('@hominem/ai', () => ({
  streamChatCompletion: vi.fn(),
  getChatCompletionUsage: vi.fn((chunk: { usage?: unknown }) => chunk.usage ?? null),
}));

const mockedStream = vi.mocked(streamChatCompletion);

type StreamChunk =
  Awaited<ReturnType<typeof streamChatCompletion>> extends AsyncIterable<infer T> ? T : never;

async function* chunks(values: readonly StreamChunk[]) {
  yield* values;
}

describe('chat generation service', () => {
  beforeEach(() => mockedStream.mockReset());

  it('executes a tool, appends its result, and continues the next model turn', async () => {
    mockedStream
      .mockReturnValueOnce(
        chunks([
          {
            created: 0,
            id: 'chunk-1',
            model: 'model-1',
            object: 'chat.completion.chunk',
            choices: [
              {
                index: 0,
                finishReason: null,
                delta: {
                  toolCalls: [
                    {
                      index: 0,
                      id: 'call-1',
                      function: { name: 'lookup', arguments: '{"q":"x"}' },
                    },
                  ],
                },
              },
            ],
          },
        ]),
      )
      .mockReturnValueOnce(
        chunks([
          {
            created: 0,
            id: 'chunk-2',
            model: 'model-1',
            object: 'chat.completion.chunk',
            choices: [{ index: 0, finishReason: null, delta: { content: 'answer' } }],
          },
        ]),
      );

    const callTool = vi.fn().mockResolvedValue({ content: [{ type: 'text', text: 'result' }] });
    const result = await runChatGeneration({
      userId: 'user-1',
      generationId: 'generation-1',
      chatId: 'chat-1',
      model: 'model-1',
      messages: [{ role: 'user', content: 'question' }],
      tools: [
        { type: 'function', function: { name: 'lookup', description: 'lookup', parameters: {} } },
      ],
      toolRuntime: {
        callTool,
        getToolDefinition: vi.fn(() => undefined),
      },
    });

    expect(result.assistantText).toBe('answer');
    expect(callTool).toHaveBeenCalledWith(
      'user-1',
      'lookup',
      { q: 'x' },
      {
        idempotencyKey: 'generation-1:generation-1:0:call-1',
      },
    );
    expect(mockedStream).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        messages: expect.arrayContaining([
          { role: 'tool', toolCallId: 'call-1', content: 'result' },
        ]),
      }),
    );
  });

  it('reuses a persisted tool effect without invoking the tool again', async () => {
    mockedStream
      .mockReturnValueOnce(
        chunks([
          {
            created: 0,
            id: 'chunk-1',
            model: 'model-1',
            object: 'chat.completion.chunk',
            choices: [
              {
                index: 0,
                finishReason: null,
                delta: {
                  toolCalls: [
                    { index: 0, id: 'call-1', function: { name: 'write', arguments: '{}' } },
                  ],
                },
              },
            ],
          },
        ]),
      )
      .mockReturnValueOnce(
        chunks([
          {
            created: 0,
            id: 'chunk-2',
            model: 'model-1',
            object: 'chat.completion.chunk',
            choices: [{ index: 0, finishReason: null, delta: { content: 'done' } }],
          },
        ]),
      );
    const callTool = vi.fn();
    const get = vi.fn().mockResolvedValue({
      callId: 'call-1',
      toolName: 'write',
      content: 'already done',
      error: false,
    });

    const result = await runChatGeneration({
      userId: 'user-1',
      generationId: 'generation-1',
      chatId: 'chat-1',
      model: 'model-1',
      messages: [{ role: 'user', content: 'write' }],
      tools: [
        { type: 'function', function: { name: 'write', description: 'write', parameters: {} } },
      ],
      toolRuntime: {
        callTool,
        getToolDefinition: vi.fn(() => undefined),
      },
      effectStore: {
        get,
        save: vi.fn(),
      },
    });

    expect(callTool).not.toHaveBeenCalled();
    expect(get).toHaveBeenCalledWith({
      generationId: 'generation-1',
      idempotencyKey: 'generation-1:generation-1:0:call-1',
      toolName: 'write',
    });
    expect(result.toolCallRecords[0]).toMatchObject({ status: 'completed' });
  });
});
