import { streamChatCompletion } from '@hominem/ai';
import { createGenerationState } from '@hominem/chat';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createOpenRouterGenerationProvider } from './chat-generation-provider';

vi.mock('@hominem/ai', () => ({
  streamChatCompletion: vi.fn(),
}));

const mockedStream = vi.mocked(streamChatCompletion);
type StreamChunk =
  Awaited<ReturnType<typeof streamChatCompletion>> extends AsyncIterable<infer T> ? T : never;

async function* chunks(values: readonly unknown[]): AsyncGenerator<StreamChunk> {
  yield* values as readonly StreamChunk[];
}

async function collect<T>(values: AsyncIterable<T>): Promise<T[]> {
  const collected: T[] = [];
  for await (const value of values) collected.push(value);
  return collected;
}

describe('OpenRouter generation provider', () => {
  beforeEach(() => {
    mockedStream.mockReset();
  });

  it('translates text, reasoning, and fragmented tool calls into machine inputs', async () => {
    mockedStream.mockReturnValueOnce(
      chunks([
        {
          choices: [
            { index: 0, finishReason: null, delta: { content: 'Hello', reasoning: 'plan ' } },
          ],
        },
        {
          choices: [
            {
              index: 0,
              finishReason: null,
              delta: {
                toolCalls: [
                  { index: 1, id: 'second', function: { name: 'second', arguments: '{}' } },
                  { index: 0, id: 'first', function: { name: 'first', arguments: '{"q' } },
                ],
              },
            },
          ],
        },
        {
          choices: [
            {
              index: 0,
              finishReason: null,
              delta: {
                content: ' world',
                reasoning: 'execute',
                toolCalls: [{ index: 0, function: { arguments: '":"x"}' } }],
              },
            },
          ],
        },
      ]),
    );
    const provider = createOpenRouterGenerationProvider({
      model: 'test-model',
      messages: [],
      tools: [
        { type: 'function', function: { name: 'first', description: 'first', parameters: {} } },
      ],
      requiresToolCall: true,
      requiresConfirmation: (name) => name === 'second',
    });

    const inputs = await collect(
      provider.open({
        turnId: 'turn-1',
        iteration: 0,
        state: createGenerationState('generation-1'),
      }),
    );

    expect(inputs).toEqual([
      {
        type: 'provider-chunk',
        chunk: { content: 'Hello', reasoning: 'plan ', toolCalls: undefined },
      },
      {
        type: 'provider-chunk',
        chunk: {
          content: undefined,
          reasoning: undefined,
          toolCalls: [
            { index: 1, id: 'second', function: { name: 'second', arguments: '{}' } },
            { index: 0, id: 'first', function: { name: 'first', arguments: '{"q' } },
          ],
        },
      },
      {
        type: 'provider-chunk',
        chunk: {
          content: ' world',
          reasoning: 'execute',
          toolCalls: [{ index: 0, function: { arguments: '":"x"}' } }],
        },
      },
      {
        type: 'provider-turn-completed',
        requiredToolCall: true,
        confirmationCallIds: ['second'],
      },
    ]);

    expect(mockedStream).toHaveBeenCalledWith(
      expect.objectContaining({ toolChoice: 'required', parallelToolCalls: false }),
    );
  });

  it('only requires a tool on the first turn and preserves tool-result transcript order', async () => {
    mockedStream
      .mockReturnValueOnce(
        chunks([{ choices: [{ index: 0, finishReason: null, delta: { content: 'first' } }] }]),
      )
      .mockReturnValueOnce(
        chunks([{ choices: [{ index: 0, finishReason: null, delta: { content: 'second' } }] }]),
      );
    const provider = createOpenRouterGenerationProvider({
      model: 'test-model',
      messages: [],
      tools: [
        { type: 'function', function: { name: 'lookup', description: 'lookup', parameters: {} } },
      ],
      requiresToolCall: true,
    });
    const state = createGenerationState('generation-1');

    await collect(provider.open({ turnId: 'turn-1', iteration: 0, state }));
    provider.appendToolResult('call-1', 'result');
    await collect(
      provider.open({ turnId: 'turn-2', iteration: 1, state: { ...state, iteration: 1 } }),
    );

    expect(mockedStream).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ toolChoice: 'required' }),
    );
    expect(mockedStream).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ toolChoice: 'auto' }),
    );
    expect(mockedStream.mock.calls[1]?.[0].messages).toEqual([
      { role: 'tool', toolCallId: 'call-1', content: 'result' },
    ]);
  });

  it('classifies transient provider failures for machine retries', async () => {
    const error = Object.assign(new Error('rate limited'), { status: 429 });
    mockedStream.mockImplementationOnce(() => {
      throw error;
    });
    const provider = createOpenRouterGenerationProvider({
      model: 'test-model',
      messages: [],
      tools: [],
    });

    await expect(
      collect(
        provider.open({
          turnId: 'turn-1',
          iteration: 0,
          state: createGenerationState('generation-1'),
        }),
      ),
    ).resolves.toEqual([
      {
        type: 'provider-turn-failed',
        message: 'rate limited',
        transient: true,
        attempt: 0,
        maxAttempts: 2,
      },
    ]);

    mockedStream.mockReturnValueOnce(chunks([]));
    await expect(
      collect(
        provider.retry({
          attempt: 1,
          state: { ...createGenerationState('generation-1'), iteration: 1 },
        }),
      ),
    ).resolves.toContainEqual({
      type: 'provider-turn-completed',
      requiredToolCall: false,
      confirmationCallIds: [],
    });
  });

  it('normalizes sparse chunks and provider errors without assuming Error instances', async () => {
    mockedStream.mockReturnValueOnce(
      chunks([
        { choices: undefined },
        { choices: [{ delta: { content: null, reasoning: null, toolCalls: [] } }] },
        {
          choices: [
            {
              delta: {
                toolCalls: [{ index: 0, id: null, function: { name: null, arguments: null } }],
              },
            },
          ],
        },
        { error: { message: 'provider returned an error' } },
      ]),
    );
    const provider = createOpenRouterGenerationProvider({
      model: 'test-model',
      messages: [],
      tools: [],
      maxAttempts: 4,
    });

    await expect(
      collect(
        provider.open({
          turnId: 'turn-1',
          iteration: 2,
          state: { ...createGenerationState('generation-1'), iteration: 2 },
        }),
      ),
    ).resolves.toEqual([
      { type: 'provider-chunk', chunk: {} },
      {
        type: 'provider-chunk',
        chunk: { content: null, reasoning: null, toolCalls: [] },
      },
      {
        type: 'provider-chunk',
        chunk: {
          content: undefined,
          reasoning: undefined,
          toolCalls: [{ index: 0, id: null, function: { name: null, arguments: null } }],
        },
      },
      {
        type: 'provider-turn-failed',
        message: 'provider returned an error',
        transient: false,
        attempt: 2,
        maxAttempts: 4,
      },
    ]);

    mockedStream.mockImplementationOnce(() => {
      throw 'provider failed without an Error';
    });
    await expect(
      collect(
        provider.open({
          turnId: 'turn-2',
          iteration: 0,
          state: createGenerationState('generation-1'),
        }),
      ),
    ).resolves.toContainEqual({
      type: 'provider-turn-failed',
      message: 'Provider request failed',
      transient: false,
      attempt: 0,
      maxAttempts: 4,
    });

    mockedStream.mockReturnValueOnce(
      chunks([
        {
          choices: [
            {
              delta: {
                toolCalls: [{ index: 0, id: undefined, function: undefined }],
              },
            },
          ],
        },
      ]),
    );
    await expect(
      collect(
        provider.open({
          turnId: 'turn-3',
          iteration: 0,
          state: createGenerationState('generation-1'),
        }),
      ),
    ).resolves.toContainEqual({
      type: 'provider-turn-completed',
      requiredToolCall: false,
      confirmationCallIds: [],
    });

    mockedStream.mockImplementationOnce(() => {
      throw Object.assign(new Error('provider failed with an unsupported status'), { status: 500 });
    });
    await expect(
      collect(
        provider.open({
          turnId: 'turn-4',
          iteration: 0,
          state: createGenerationState('generation-1'),
        }),
      ),
    ).resolves.toContainEqual({
      type: 'provider-turn-failed',
      message: 'provider failed with an unsupported status',
      transient: false,
      attempt: 0,
      maxAttempts: 4,
    });
  });
});
