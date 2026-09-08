import type { ChatUsage } from '@hominem/ai';
import { streamChatCompletion } from '@hominem/ai';
import { openRouterCompletionUsage } from '@hominem/utils/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import type { CapabilityDefinition } from '../application/capability';
import type { McpToolResult } from '../mcp/tool-registry';
import { executeGenerationTurn, ToolInputError } from './chat-generation-engine';

vi.mock('@hominem/ai', () => ({
  streamChatCompletion: vi.fn(),
  getChatCompletionUsage: vi.fn((chunk: { usage?: ChatUsage }) => chunk.usage ?? null),
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
    const result = await executeGenerationTurn({
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
      expect.anything(),
    );
  });

  it('fails the turn instead of hanging forever when a tool call never resolves', async () => {
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
              finishReason: 'tool_calls',
              delta: {
                toolCalls: [
                  { index: 0, id: 'call-1', function: { name: 'lookup', arguments: '{}' } },
                ],
              },
            },
          ],
        },
      ]),
    );

    const callTool = vi.fn(() => new Promise<McpToolResult>(() => {}));

    await expect(
      executeGenerationTurn({
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
        effectTimeoutsMs: { 'execute-tool': 5 },
      }),
    ).rejects.toThrow('Effect command "execute-tool" did not complete within 5ms');
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

    const result = await executeGenerationTurn({
      userId: 'user-1',
      generationId: 'generation-1',
      chatId: 'chat-1',
      model: 'model-1',
      messages: [{ role: 'user', content: 'question' }],
      tools: [],
      cancellation: { isRequested: isCancelled },
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

    const result = await executeGenerationTurn({
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
    expect(result.toolCallRecords[0]).toMatchObject({ executionStatus: 'completed' });
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
            ...openRouterCompletionUsage,
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
            ...openRouterCompletionUsage,
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
    const appendEvent = vi.fn(
      async ({
        event,
        idempotencyKey,
      }: {
        event: Parameters<
          NonNullable<Parameters<typeof executeGenerationTurn>[0]['eventStore']>['append']
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

    const result = await executeGenerationTurn({
      userId: 'user-1',
      generationId: 'generation-1',
      chatId: 'chat-1',
      model: 'model-1',
      messages: [{ role: 'user', content: 'question' }],
      tools: [],
      eventStore: { append: appendEvent },
      durableEvents: {
        accept: (event) => {
          durableEvents.push(event.type);
        },
      },
      liveEvents: {
        accept: (event) => {
          liveEvents.push(event.type);
        },
      },
    });

    expect(result.assistantText).toBe('answer');
    expect(result.reasoningText).toBe('thinking');
    expect(result.usage?.totalTokens).toBe(6);
    // A plain text-only turn (no tool calls) never reaches eventStore.append:
    // the only phase transitions the machine would persist for it —
    // phase_changed:running (on start) and phase_changed:saving (on save) —
    // are skipped in the persist handler because chat-generation.service.ts's
    // executeGeneration already durably appends both of those itself.
    expect(appendEvent).not.toHaveBeenCalled();
    expect(durableEvents).toHaveLength(0);
    expect(liveEvents).toEqual(expect.arrayContaining(['text-delta', 'reasoning-delta']));
  });

  it('skips configured start, terminal, and running/saving phase persistence', async () => {
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
    const appendEvent = vi.fn();

    await executeGenerationTurn({
      userId: 'user-1',
      generationId: 'generation-1',
      chatId: 'chat-1',
      model: 'model-1',
      messages: [{ role: 'user', content: 'question' }],
      tools: [],
      eventStore: { append: appendEvent },
    });

    // generation.started/committed, and phase_changed:running/saving, are
    // all durably appended by chat-generation.service.ts's executeGeneration
    // itself — a plain text-only turn has nothing left for the engine's own
    // eventStore to persist.
    expect(appendEvent).not.toHaveBeenCalled();
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
    const save = vi.fn().mockImplementation(({ result }: { result: unknown }) => result);
    const result = await executeGenerationTurn({
      userId: 'user-1',
      generationId: 'generation-1',
      chatId: 'chat-1',
      model: 'model-1',
      messages: [{ role: 'user', content: 'question' }],
      tools: [],
      toolRuntime: { callTool, getToolDefinition: vi.fn(() => undefined) },
      effectStore: { get: vi.fn().mockResolvedValue(null), save },
    });

    expect(result.toolCallRecords).toEqual([
      expect.objectContaining({ executionStatus: 'failed', args: {} }),
    ]);
    expect(save.mock.calls[0]?.[0].result.content).toBe(
      JSON.stringify({ error: 'Tool call failed' }),
    );
  });

  it('classifies malformed JSON arguments and never invokes the tool', async () => {
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
                    { index: 0, id: 'call-1', function: { name: 'lookup', arguments: '{' } },
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
    const save = vi.fn().mockImplementation(({ result }: { result: unknown }) => result);

    await executeGenerationTurn({
      userId: 'user-1',
      generationId: 'generation-1',
      chatId: 'chat-1',
      model: 'model-1',
      messages: [{ role: 'user', content: 'question' }],
      tools: [],
      toolRuntime: { callTool, getToolDefinition: vi.fn(() => undefined) },
      effectStore: { get: vi.fn().mockResolvedValue(null), save },
    });

    expect(callTool).not.toHaveBeenCalled();
    expect(save).toHaveBeenCalledWith(
      expect.objectContaining({
        result: expect.objectContaining({ error: true }),
      }),
    );
    expect(new ToolInputError('lookup')).toMatchObject({
      name: 'ToolInputError',
      category: 'tool_input',
    });
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

    const result = await executeGenerationTurn({
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

    const result = await executeGenerationTurn({
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
