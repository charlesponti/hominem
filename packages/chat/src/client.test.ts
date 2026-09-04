import { describe, expect, it } from 'vitest';

import { ChatClient } from './client';

function streamResponse(event: unknown): Response {
  const body = `data: ${JSON.stringify(event)}\n\ndata: [DONE]\n\n`;
  return new Response(body, { headers: { 'content-type': 'text/event-stream' } });
}

describe('ChatClient', () => {
  it('streams events, checkpoints each state, and removes terminal checkpoints', async () => {
    const checkpoints: string[] = [];
    const client = new ChatClient({
      baseUrl: 'https://chat.test',
      transport: {
        request: async () =>
          streamResponse({
            version: 1,
            generationId: 'generation-1',
            sequence: 1,
            type: 'generation.committed',
            payload: {
              type: 'generation.committed',
              message: {
                id: 'message-1',
                chatId: 'chat-1',
                userId: 'user-1',
                role: 'assistant',
                content: 'done',
                files: null,
                toolCalls: null,
                reasoning: null,
                parentMessageId: null,
                createdAt: '2026-01-01',
                updatedAt: '2026-01-01',
              },
            },
          }),
      },
      checkpointStore: {
        get: () => null,
        set: (state) => {
          checkpoints.push(`${state.generationId}:${state.lastDurableSequence}`);
        },
        remove: (generationId) => {
          checkpoints.push(`removed:${generationId}`);
        },
      },
      createId: () => 'generation-1',
    });

    const generation = client.createGeneration();
    await generation.start({
      path: '/api/chats/chat-1/stream',
      body: { chatId: 'chat-1', message: 'hello' },
      generationId: 'generation-1',
    });

    expect(generation.state).toMatchObject({ phase: 'committed', text: 'done' });
    expect(checkpoints).toEqual(['generation-1:1', 'removed:generation-1']);
  });

  it('replays from the durable checkpoint after a stream disconnects', async () => {
    let requests = 0;
    const phase = {
      version: 1,
      generationId: 'generation-2',
      sequence: 1,
      type: 'generation.phase_changed',
      payload: { type: 'generation.phase_changed', phase: 'running' },
    };
    const committed = {
      version: 1,
      generationId: 'generation-2',
      sequence: 2,
      type: 'generation.committed',
      payload: {
        type: 'generation.committed',
        message: {
          id: 'message-2',
          chatId: 'chat-1',
          userId: 'user-1',
          role: 'assistant',
          content: 'replayed',
          files: null,
          toolCalls: null,
          reasoning: null,
          parentMessageId: null,
          createdAt: '2026-01-01',
          updatedAt: '2026-01-01',
        },
      },
    };
    const client = new ChatClient({
      baseUrl: 'https://chat.test',
      transport: {
        request: async () => {
          requests += 1;
          if (requests === 1) {
            const encoder = new TextEncoder();
            return new Response(
              new ReadableStream({
                start(controller) {
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify(phase)}\n\n`));
                  controller.error(new Error('disconnect'));
                },
              }),
            );
          }
          return streamResponse(committed);
        },
      },
      createId: () => 'generation-2',
    });

    const generation = client.createGeneration();
    await generation.start({
      path: '/api/chats/chat-1/stream',
      body: { chatId: 'chat-1', message: 'hello' },
      generationId: 'generation-2',
      replayPath: (generationId, afterSequence) =>
        `/api/chats/chat-1/generations/${generationId}/stream?afterSequence=${afterSequence}`,
    });

    expect(requests).toBe(2);
    expect(generation.state).toMatchObject({ phase: 'committed', text: 'replayed' });
  });
});
