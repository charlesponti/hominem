import { randomUUID } from 'node:crypto';

import {
  parseGenerationWireEvent,
  type GenerationLiveEvent,
  type GenerationWireEvent,
} from '@hominem/chat';
import { authDb, ChatGenerationRepository, ChatRepository, db } from '@hominem/db';
import { Hono } from 'hono';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

const provider = vi.hoisted(() => ({
  route: vi.fn(),
  stream: vi.fn(),
}));

vi.mock('@hominem/ai', async () => {
  const actual = await vi.importActual<typeof import('@hominem/ai')>('@hominem/ai');
  return {
    ...actual,
    createStructuredChatCompletion: provider.route,
    streamChatCompletion: provider.stream,
  };
});

vi.mock('@hominem/queues', async () => {
  const actual = await vi.importActual<typeof import('@hominem/queues')>('@hominem/queues');
  return {
    ...actual,
    embeddingQueue: { add: vi.fn().mockResolvedValue(undefined) },
  };
});

import { registerTool } from '../../mcp/tool-registry';
import type { AppContext, RpcUser } from '../middleware/auth';
import { apiErrorHandler } from '../middleware/error';
import { chatGenerationRoutes, chatStartGenerationRoute } from './chats.generation';

registerTool(
  {
    name: 'e2e_echo',
    title: 'Echo test input',
    description: 'Returns the supplied test value.',
    inputSchema: z.object({ value: z.string() }).strict(),
    outputSchema: z.object({ value: z.string() }).strict(),
    readOnly: true,
    scopes: ['memory:read'],
    resultCap: 1,
  },
  async (_ownerUserId, input) => input,
);

function user(id: string): RpcUser {
  return {
    id,
    email: `${id}@chat-generation.test`,
    name: 'Chat Generation E2E User',
    emailVerified: true,
    image: null,
    isAdmin: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

function createApp(currentUser: RpcUser) {
  return new Hono<AppContext>()
    .onError(apiErrorHandler)
    .use('*', async (c, next) => {
      c.set('auth', {
        user: currentUser,
        userId: currentUser.id,
        credential: 'session',
        scopes: [],
      });
      await next();
    })
    .route('/api/chats/start-stream', chatStartGenerationRoute)
    .route('/api/chats/:id', chatGenerationRoutes);
}

async function createUser(id: string) {
  await authDb
    .insertInto('user')
    .values({ id, name: 'Chat Generation E2E User', email: `${id}@chat-generation.test` })
    .execute();
}

async function readWireEvents(response: Response): Promise<GenerationWireEvent[]> {
  const body = await response.text();
  return body
    .split('\n')
    .filter((line) => line.startsWith('data: ') && line !== 'data: [DONE]')
    .map((line) => parseGenerationWireEvent(JSON.parse(line.slice('data: '.length))));
}

describe('chat generation route end-to-end', () => {
  const userIds: string[] = [];

  afterEach(async () => {
    for (const id of userIds.splice(0)) {
      await authDb.deleteFrom('user').where('id', '=', id).execute();
    }
    provider.route.mockReset();
    provider.stream.mockReset();
  });

  it('runs start-stream through the real runtime, persists durable events, and emits canonical SSE', async () => {
    const userId = randomUUID();
    const generationId = randomUUID();
    userIds.push(userId);
    await createUser(userId);

    provider.route.mockResolvedValue({
      output: { capabilities: [], requiresLookup: false },
      usage: null,
    });
    provider.stream.mockReturnValue(
      (async function* () {
        yield {
          usage: {
            provider: 'test-provider',
            model: 'test-model',
            promptTokens: 2,
            completionTokens: 4,
            totalTokens: 6,
            reportedTotalTokens: null,
            costUsd: 0,
            cachedPromptTokens: null,
            reasoningTokens: null,
          },
          choices: [{ delta: { content: 'A deterministic reply.' } }],
        };
      })(),
    );

    const response = await createApp(user(userId)).request('/api/chats/start-stream', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ generationId, title: 'E2E chat', message: 'Hello' }),
    });

    expect(response.status).toBe(200);
    const responseBody = response.clone();
    const events = await readWireEvents(response);
    const durableTypes = events.filter((event) => 'sequence' in event).map((event) => event.type);
    expect(durableTypes.slice(0, 3)).toEqual([
      'generation.started',
      'generation.accepted',
      'generation.phase_changed',
    ]);
    expect(durableTypes.at(-1)).toBe('generation.committed');
    const liveTypes = events
      .filter((event): event is GenerationLiveEvent => !('sequence' in event))
      .map((event) => event.event.type);
    expect(liveTypes).toContain('text-delta');
    expect((await responseBody.text()).match(/data: \[DONE\]/g)).toHaveLength(1);

    const run = await ChatRepository.getGenerationRunById(db, generationId, userId);
    expect(run).toMatchObject({ id: generationId, ownerUserId: userId, status: 'committed' });
    const durableEvents = await ChatGenerationRepository.listEvents(db, generationId, userId);
    expect(durableEvents.map((event) => event.sequence)).toEqual(
      Array.from({ length: durableEvents.length }, (_, index) => index + 1),
    );
    expect(durableEvents.at(-1)?.payload).toMatchObject({ type: 'generation.committed' });

    const messages = await ChatRepository.getMessages(db, run!.chatId);
    expect(messages.at(-1)).toMatchObject({ role: 'assistant', content: 'A deterministic reply.' });
  });

  it('rejects an unauthenticated owner from reading another generation', async () => {
    const ownerId = randomUUID();
    const otherId = randomUUID();
    const chatId = randomUUID();
    const generationId = randomUUID();
    userIds.push(ownerId, otherId);
    await createUser(ownerId);
    await createUser(otherId);
    await db
      .insertInto('app.chats')
      .values({ id: chatId, ownerUserid: ownerId, title: 'Private chat' })
      .execute();
    await db
      .insertInto('app.chatGenerationRuns')
      .values({ id: generationId, chatId, ownerUserId: ownerId, kind: 'send', status: 'preparing' })
      .execute();

    const response = await createApp(user(otherId)).request(
      `/api/chats/${chatId}/generations/${generationId}`,
    );

    expect(response.status).toBe(404);
  });

  it('runs fragmented provider tool calls through the real registry and commits the tool record', async () => {
    const userId = randomUUID();
    const generationId = randomUUID();
    userIds.push(userId);
    await createUser(userId);

    provider.route.mockResolvedValue({
      output: { capabilities: ['memory'], requiresLookup: true },
      usage: null,
    });
    let providerTurn = 0;
    provider.stream.mockImplementation(() => {
      providerTurn += 1;
      if (providerTurn === 1) {
        return (async function* () {
          yield {
            choices: [
              {
                delta: {
                  toolCalls: [
                    {
                      index: 0,
                      id: 'call-e2e',
                      function: { name: 'e2e_echo', arguments: '{"value":"hel' },
                    },
                  ],
                },
              },
            ],
          };
          yield {
            choices: [
              {
                delta: {
                  toolCalls: [{ index: 0, function: { arguments: 'lo"}' } }],
                },
              },
            ],
          };
        })();
      }
      return (async function* () {
        yield { choices: [{ delta: { content: 'Tool result received.' } }] };
      })();
    });

    const response = await createApp(user(userId)).request('/api/chats/start-stream', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ generationId, title: 'Tool chat', message: 'Use the tool' }),
    });

    expect(response.status).toBe(200);
    const events = await readWireEvents(response);
    const durableTypes = events.filter((event) => 'sequence' in event).map((event) => event.type);
    expect(durableTypes).toContain('tool.requested');
    expect(durableTypes).toContain('tool.completed');

    const run = await ChatRepository.getGenerationRunById(db, generationId, userId);
    const messages = await ChatRepository.getMessages(db, run!.chatId);
    expect(messages.at(-1)).toMatchObject({
      role: 'assistant',
      content: 'Tool result received.',
      toolCalls: [
        expect.objectContaining({
          toolCallId: 'call-e2e',
          toolName: 'e2e_echo',
          args: { value: 'hello' },
          executionStatus: 'completed',
        }),
      ],
    });
    expect(providerTurn).toBe(2);
  });
});
