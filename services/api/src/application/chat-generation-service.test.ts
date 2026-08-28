import { streamChatCompletion } from '@hominem/ai';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import type { CapabilityDefinition } from './capability';
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

  it('stops before consuming provider output when cancellation is already requested', async () => {
    mockedStream.mockReturnValueOnce(
      chunks([
        {
          created: 0,
          id: 'chunk-1',
          model: 'model-1',
          object: 'chat.completion.chunk',
          choices: [{ index: 0, finishReason: null, delta: { content: 'ignored' } }],
        },
      ]),
    );
    const isCancelled = vi.fn(() => true);

    const result = await runChatGeneration({
      userId: 'user-1',
      generationId: 'generation-1',
      chatId: 'chat-1',
      model: 'model-1',
      messages: [{ role: 'user', content: 'question' }],
      tools: [],
      isCancelled,
    });

    expect(result.assistantText).toBe('');
    expect(isCancelled).toHaveBeenCalled();
    expect(mockedStream).toHaveBeenCalledOnce();
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

  it('maps live events, aggregates usage, and forwards durable records', async () => {
    mockedStream.mockReturnValueOnce(
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
              delta: { content: 'answer', reasoning: 'thinking' },
            },
          ],
          usage: {
            promptTokens: 1,
            completionTokens: 2,
            totalTokens: 3,
            cost: null,
          },
        },
        {
          created: 0,
          id: 'chunk-2',
          model: 'model-1',
          object: 'chat.completion.chunk',
          choices: [{ index: 0, finishReason: null, delta: {} }],
          usage: {
            promptTokens: 1,
            completionTokens: 2,
            totalTokens: 3,
            cost: null,
          },
        },
      ]),
    );
    const liveEvents: string[] = [];
    const durableEvents: string[] = [];
    const persistEvent = vi.fn(
      async ({
        event,
        idempotencyKey,
      }: {
        event: Parameters<
          NonNullable<Parameters<typeof runChatGeneration>[0]['persistEvent']>
        >[0]['event'];
        idempotencyKey: string;
      }) => ({
        id: `event-${durableEvents.length + 1}`,
        generationId: 'generation-1',
        sequence: durableEvents.length + 1,
        type: event.type,
        payload: event,
        idempotencyKey,
        createdAt: '2026-01-01T00:00:00.000Z',
      }),
    );

    const result = await runChatGeneration({
      userId: 'user-1',
      generationId: 'generation-1',
      chatId: 'chat-1',
      model: 'model-1',
      messages: [{ role: 'user', content: 'question' }],
      tools: [],
      persistEvent,
      onDurableEvent: (event) => {
        durableEvents.push(event.type);
      },
      onEvent: (event) => {
        liveEvents.push(event.type);
      },
    });

    expect(result.assistantText).toBe('answer');
    expect(result.reasoningText).toBe('thinking');
    expect(result.usage?.totalTokens).toBe(6);
    expect(persistEvent).toHaveBeenCalled();
    expect(durableEvents.length).toBeGreaterThan(0);
    expect(liveEvents).toEqual(expect.arrayContaining(['text-delta', 'reasoning-delta', 'phase']));
  });

  it('skips configured start and terminal persistence', async () => {
    mockedStream.mockReturnValueOnce(
      chunks([
        {
          created: 0,
          id: 'chunk-1',
          model: 'model-1',
          object: 'chat.completion.chunk',
          choices: [{ index: 0, finishReason: null, delta: { content: 'answer' } }],
        },
      ]),
    );
    const persistEvent = vi.fn();

    await runChatGeneration({
      userId: 'user-1',
      generationId: 'generation-1',
      chatId: 'chat-1',
      model: 'model-1',
      messages: [{ role: 'user', content: 'question' }],
      tools: [],
      persistEvent,
      persistStarted: false,
      persistTerminal: false,
    });

    expect(persistEvent).toHaveBeenCalledTimes(2);
    expect(persistEvent.mock.calls.map(([call]) => call.event.type)).toEqual([
      'generation.phase_changed',
      'generation.phase_changed',
    ]);
  });

  it('returns failed tool results for malformed arguments and non-Error failures', async () => {
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
                    { index: 0, id: 'call-1', function: { name: 'lookup', arguments: '[]' } },
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

    const callTool = vi.fn().mockRejectedValue('boom');
    const result = await runChatGeneration({
      userId: 'user-1',
      generationId: 'generation-1',
      chatId: 'chat-1',
      model: 'model-1',
      messages: [{ role: 'user', content: 'question' }],
      tools: [],
      toolRuntime: { callTool, getToolDefinition: vi.fn(() => undefined) },
    });

    expect(result.toolCallRecords).toEqual([
      expect.objectContaining({ status: 'failed', args: {} }),
    ]);
  });

  it('previews a confirmation-required tool and returns its pending call', async () => {
    mockedStream.mockReturnValueOnce(
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
                  { index: 0, id: 'call-1', function: { name: 'forget', arguments: '{}' } },
                ],
              },
            },
          ],
        },
      ]),
    );
    const preview = vi.fn().mockResolvedValue({ recordId: 'record-1' });
    const definition: CapabilityDefinition = {
      name: 'forget',
      title: 'Forget',
      description: 'Forget a record',
      inputSchema: z.object({}),
      outputSchema: z.object({}),
      readOnly: false,
      scopes: [],
      resultCap: 1,
      requiresConfirmation: true,
      preview,
    };

    const result = await runChatGeneration({
      userId: 'user-1',
      generationId: 'generation-1',
      chatId: 'chat-1',
      model: 'model-1',
      messages: [{ role: 'user', content: 'forget it' }],
      tools: [],
      toolRuntime: {
        callTool: vi.fn(),
        getToolDefinition: vi.fn(() => definition),
      },
    });

    expect(preview).toHaveBeenCalledWith('user-1', {});
    expect(result.pendingToolCall).toMatchObject({
      toolCallId: 'call-1',
      preview: { recordId: 'record-1' },
    });
  });

  it('converts a non-Error preview failure into an error result', async () => {
    mockedStream.mockReturnValueOnce(
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
                  { index: 0, id: 'call-1', function: { name: 'forget', arguments: '{}' } },
                ],
              },
            },
          ],
        },
      ]),
    );
    const definition: CapabilityDefinition = {
      name: 'forget',
      title: 'Forget',
      description: 'Forget a record',
      inputSchema: z.object({}),
      outputSchema: z.object({}),
      readOnly: false,
      scopes: [],
      resultCap: 1,
      requiresConfirmation: true,
      preview: vi.fn().mockRejectedValue('preview failed'),
    };

    const result = await runChatGeneration({
      userId: 'user-1',
      generationId: 'generation-1',
      chatId: 'chat-1',
      model: 'model-1',
      messages: [{ role: 'user', content: 'forget it' }],
      tools: [],
      toolRuntime: { callTool: vi.fn(), getToolDefinition: vi.fn(() => definition) },
    });

    expect(result.pendingToolCall).toMatchObject({
      toolCallId: 'call-1',
      preview: null,
    });
  });
});
