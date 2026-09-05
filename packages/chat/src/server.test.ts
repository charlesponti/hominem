import { describe, expect, it, vi } from 'vitest';

import type { GenerationState, ToolResult } from './generation-machine';
import { ChatServerRuntime, createChatHttpHandler, type ChatServerPersistedEvent } from './server';

function createStore() {
  const events: ChatServerPersistedEvent[] = [];
  const effects = new Map<string, ToolResult>();
  return {
    events,
    effects,
    appendEvent: vi.fn(async ({ event, idempotencyKey }) => {
      const record: ChatServerPersistedEvent = {
        generationId: 'generation-1',
        sequence: events.length + 1,
        type: event.type,
        payload: event,
        idempotencyKey,
      };
      events.push(record);
      return record;
    }),
    getEffect: vi.fn(async ({ idempotencyKey }) => effects.get(idempotencyKey) ?? null),
    saveEffect: vi.fn(async ({ idempotencyKey, result }) => {
      effects.set(idempotencyKey, result);
      return result;
    }),
    saveGeneration: vi.fn(async ({ state }) => ({
      id: 'generation-1:assistant',
      chatId: 'chat-1',
      userId: 'user-1',
      role: 'assistant' as const,
      content: state.assistantText,
      files: null,
      toolCalls: null,
      reasoning: null,
      parentMessageId: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })),
    stopGeneration: vi.fn(async (_state: GenerationState) => undefined),
  };
}

const startContext = {
  chatId: 'chat-1',
  kind: 'send' as const,
  userMessageId: 'user-message-1',
  targetAssistantMessageId: null,
  requestContext: {},
};

describe('ChatServerRuntime', () => {
  it('owns persistence and publication around a provider turn', async () => {
    const store = createStore();
    const published: ChatServerPersistedEvent[] = [];
    const recordCompletion = vi.fn();
    const runtime = new ChatServerRuntime({
      provider: ({ onUsage }) => ({
        open: () =>
          (async function* () {
            yield { type: 'provider-chunk', chunk: { content: 'Hello' } };
            onUsage?.({ promptTokens: 1, outputTokens: 1, totalTokens: 2, costUsd: null });
            yield {
              type: 'provider-turn-completed',
              requiredToolCall: false,
              confirmationCallIds: [],
            };
          })(),
        retry: async () => ({
          type: 'provider-turn-completed',
          requiredToolCall: false,
          confirmationCallIds: [],
        }),
      }),
      tools: {
        getDefinition: () => undefined,
        execute: vi.fn(),
      },
      store,
      publisher: {
        accept: async (event) => {
          published.push(event);
        },
      },
      context: { recordCompletion },
    });

    const result = await runtime.run({
      generationId: 'generation-1',
      chatId: 'chat-1',
      userId: 'user-1',
      model: { model: 'test', messages: [], tools: [] },
      startContext,
    });

    expect(result.state.assistantText).toBe('Hello');
    expect(store.appendEvent).toHaveBeenCalled();
    expect(published).toEqual(store.events);
    expect(recordCompletion).toHaveBeenCalledOnce();

    await runtime.run({
      generationId: 'generation-2',
      chatId: 'chat-1',
      userId: 'user-1',
      model: { model: 'test', messages: [], tools: [] },
      startContext,
    });

    expect(recordCompletion).toHaveBeenCalledTimes(2);
  });

  it('routes canonical HTTP commands and replay through Web Responses', async () => {
    const event = {
      version: 1 as const,
      generationId: 'generation-1',
      sequence: 1,
      type: 'generation.committed' as const,
      payload: {
        type: 'generation.committed' as const,
        message: {
          id: 'message-1',
          chatId: 'chat-1',
          userId: 'user-1',
          role: 'assistant' as const,
          content: 'done',
          files: null,
          toolCalls: null,
          reasoning: null,
          parentMessageId: null,
          createdAt: '2026-01-01',
          updatedAt: '2026-01-01',
        },
      },
    };
    const calls: string[] = [];
    const stream = async function* () {
      yield event;
    };
    const handler = createChatHttpHandler({
      authenticate: async () => ({ userId: 'user-1' }),
      startChat: async () => {
        calls.push('start');
        return stream();
      },
      sendMessage: async () => {
        calls.push('send');
        return stream();
      },
      regenerate: async () => stream(),
      respondToToolCall: async () => stream(),
      cancel: async () => ({ status: 'cancelled' }),
      getGeneration: async () => ({ status: 'committed' }),
      replay: async ({ afterSequence }) => {
        calls.push(`replay:${afterSequence}`);
        return stream();
      },
    });

    const start = await handler(
      new Request('https://chat.test/api/chats/start-stream', {
        method: 'POST',
        body: JSON.stringify({ title: 'Chat', message: 'Hello' }),
      }),
    );
    const replay = await handler(
      new Request('https://chat.test/api/chats/chat-1/generations/generation-1/stream', {
        headers: { 'Last-Event-ID': '7' },
      }),
    );

    expect(start.headers.get('content-type')).toContain('text/event-stream');
    expect(await replay.text()).toContain('id: 1');
    expect(calls).toEqual(['start', 'replay:7']);
  });
});
