import { createChatHttpHandler } from '@hominem/chat/server';
import { zValidator } from '@hono/zod-validator';
import { Hono, type Context } from 'hono';

import {
  ChatGenerationInputError,
  chatGenerationService,
} from '../../application/chat-generation.service';
import type { ChatGenerationService } from '../../application/chat-generation.service';
import {
  ChatsRegenerateMessageSchema,
  ChatsRetryGenerationSchema,
  ChatsSendSchema,
  ChatsStartStreamSchema,
  ChatsToolCallRespondSchema,
} from '../../schemas/chats.schema';
import type { AppContext } from '../middleware/auth';

function parseBody<T>(schema: { parse: (input: unknown) => T }, body: unknown): T {
  return schema.parse(body);
}

function requestWithJsonBody(c: Context<AppContext>, body: unknown): Request {
  const headers = new Headers(c.req.raw.headers);
  headers.delete('content-length');
  headers.set('content-type', 'application/json');
  return new Request(c.req.url, {
    method: c.req.method,
    headers,
    body: JSON.stringify(body),
  });
}

function createHandler(service: ChatGenerationService, userId: string) {
  return createChatHttpHandler({
    authenticate: () => ({ userId }),
    startChat: async ({ userId: ownerUserId, body }) => {
      const input = parseBody(ChatsStartStreamSchema, body);
      return service.startMessage({ userId: ownerUserId, ...input, fileIds: input.fileIds ?? [] });
    },
    sendMessage: async ({ userId: ownerUserId, chatId, body }) => {
      const input = parseBody(ChatsSendSchema, body);
      return service.sendMessage({
        userId: ownerUserId,
        chatId,
        ...input,
        fileIds: input.fileIds ?? [],
      });
    },
    regenerate: async ({ userId: ownerUserId, chatId, target, body }) => {
      if ('messageId' in target) {
        const input = parseBody(ChatsRegenerateMessageSchema, body);
        return service.regenerate({
          userId: ownerUserId,
          chatId,
          messageId: target.messageId,
          ...input,
        });
      }
      const input = parseBody(ChatsRetryGenerationSchema, body);
      return service.regenerate({
        userId: ownerUserId,
        chatId,
        failedGenerationId: target.generationId,
        ...input,
      });
    },
    respondToToolCall: async ({ userId: ownerUserId, chatId, messageId, toolCallId, body }) => {
      const input = parseBody(ChatsToolCallRespondSchema, body);
      return service.respondToConfirmation({
        userId: ownerUserId,
        chatId,
        messageId,
        toolCallId,
        ...input,
      });
    },
    cancel: ({ userId: ownerUserId, chatId, generationId }) =>
      service.cancel({ ownerUserId, chatId, generationId }),
    getGeneration: async ({ userId: ownerUserId, chatId, generationId }) => {
      const run = await service.getGeneration({
        chatId,
        generationId,
        ownerUserId: ownerUserId,
      });
      if (!run) throw new Response('Generation run not found', { status: 404 });
      return run;
    },
    replay: async ({ userId: ownerUserId, chatId, generationId, afterSequence }) => {
      const run = await service.getGeneration({
        chatId,
        generationId,
        ownerUserId: ownerUserId,
      });
      if (!run) throw new Response('Generation run not found', { status: 404 });
      return service.replay({
        generationId,
        ownerUserId: ownerUserId,
        afterSequence,
        terminal: ['committed', 'cancelled', 'failed'].includes(run.status),
      });
    },
  });
}

function createRouteHandler(service: ChatGenerationService) {
  const delegate = async (c: Context<AppContext>, request: Request = c.req.raw) => {
    const userId = c.get('auth')!.userId;
    return createHandler(
      service,
      userId,
    )(request).catch((error: unknown) => {
      if (error instanceof ChatGenerationInputError) {
        return Response.json({ error: error.message }, { status: 400 });
      }
      throw error;
    });
  };
  return new Hono<AppContext>()
    .get('/generations/:generationId', (c) => delegate(c))
    .get('/generations/:generationId/stream', (c) => delegate(c))
    .post('/generations/:generationId/cancel', (c) => delegate(c))
    .post(
      '/generations/:generationId/regenerate',
      zValidator('json', ChatsRetryGenerationSchema),
      (c) => delegate(c, requestWithJsonBody(c, c.req.valid('json'))),
    )
    .post(
      '/messages/:messageId/regenerate',
      zValidator('json', ChatsRegenerateMessageSchema),
      (c) => delegate(c, requestWithJsonBody(c, c.req.valid('json'))),
    )
    .post(
      '/messages/:messageId/tool-calls/:toolCallId/respond',
      zValidator('json', ChatsToolCallRespondSchema),
      (c) => delegate(c, requestWithJsonBody(c, c.req.valid('json'))),
    )
    .post('/stream', zValidator('json', ChatsSendSchema), (c) =>
      delegate(c, requestWithJsonBody(c, c.req.valid('json'))),
    );
}

export function createChatGenerationRoutes(service: ChatGenerationService = chatGenerationService) {
  return createRouteHandler(service);
}

export function createChatStartGenerationRoute(
  service: ChatGenerationService = chatGenerationService,
) {
  const delegate = async (c: Context<AppContext>, request: Request = c.req.raw) => {
    const userId = c.get('auth')!.userId;
    return createHandler(
      service,
      userId,
    )(request).catch((error: unknown) => {
      if (error instanceof ChatGenerationInputError) {
        return Response.json({ error: error.message }, { status: 400 });
      }
      throw error;
    });
  };
  return new Hono<AppContext>().post('/', zValidator('json', ChatsStartStreamSchema), (c) =>
    delegate(c, requestWithJsonBody(c, c.req.valid('json'))),
  );
}

export const chatGenerationRoutes = createChatGenerationRoutes();
export const chatStartGenerationRoute = createChatStartGenerationRoute();
