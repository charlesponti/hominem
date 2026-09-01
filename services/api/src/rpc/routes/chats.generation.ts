import type { GenerationWireEvent } from '@hominem/chat';
import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';

import {
  ChatGenerationInputError,
  chatGenerationService,
} from '../../application/chat-generation.service';
import type { ChatGenerationService } from '../../application/chat-generation.service';
import {
  ChatsRegenerateMessageSchema,
  ChatsSendSchema,
  ChatsStartStreamSchema,
  ChatsToolCallRespondSchema,
} from '../../schemas/chats.schema';
import { ValidationError } from '../errors';
import type { AppContext } from '../middleware/auth';
import { getChatId, getGenerationId, getMessageId } from './chats.route-helpers';

type GenerationStream = {
  writeSSE: (input: { data: string; id?: string }) => Promise<void>;
};

function writeGenerationWireEvent(stream: GenerationStream, event: GenerationWireEvent) {
  return stream.writeSSE({
    data: JSON.stringify(event),
    ...('sequence' in event ? { id: String(event.sequence) } : {}),
  });
}

async function writeGenerationStream(
  stream: GenerationStream,
  events: AsyncIterable<GenerationWireEvent>,
): Promise<void> {
  for await (const event of events) await writeGenerationWireEvent(stream, event);
  await stream.writeSSE({ data: '[DONE]' });
}

function getGenerationReplayCursor(c: {
  req: {
    header: (name: string) => string | undefined;
    query: (name: string) => string | undefined;
  };
}): number {
  const value = c.req.header('Last-Event-ID') ?? c.req.query('afterSequence') ?? '0';
  if (!/^\d+$/.test(value)) throw new ValidationError('Invalid generation event cursor');
  const cursor = Number(value);
  if (!Number.isSafeInteger(cursor) || cursor < 0) {
    throw new ValidationError('Invalid generation event cursor');
  }
  return cursor;
}

async function writeGenerationReplay(
  stream: GenerationStream,
  service: ChatGenerationService,
  generationId: string,
  ownerUserId: string,
  afterSequence: number,
  terminal: boolean,
): Promise<void> {
  for await (const event of await service.replay({
    generationId,
    ownerUserId,
    afterSequence,
    terminal,
  })) {
    await writeGenerationWireEvent(stream, event);
  }
}

export function createChatGenerationRoutes(service: ChatGenerationService = chatGenerationService) {
  return new Hono<AppContext>()
    .get('/generations/:generationId', async (c) => {
      const userId = c.get('auth')!.userId;
      const chatId = getChatId(c);
      const generationId = getGenerationId(c);

      const run = await service.getGeneration({
        chatId,
        generationId,
        ownerUserId: userId,
      });
      if (!run) throw new ValidationError('Generation run not found');
      return c.json(run);
    })
    .get('/generations/:generationId/stream', async (c) => {
      const userId = c.get('auth')!.userId;
      const chatId = getChatId(c);
      const generationId = getGenerationId(c);

      const run = await service.getGeneration({
        chatId,
        generationId,
        ownerUserId: userId,
      });
      if (!run) throw new ValidationError('Generation run not found');
      const afterSequence = getGenerationReplayCursor(c);

      return streamSSE(c, async (stream) => {
        await writeGenerationReplay(
          stream,
          service,
          generationId,
          userId,
          afterSequence,
          ['committed', 'cancelled', 'failed'].includes(run.status),
        );
        await stream.writeSSE({ data: '[DONE]' });
      });
    })
    .post('/generations/:generationId/cancel', async (c) => {
      const userId = c.get('auth')!.userId;
      const chatId = getChatId(c);
      const generationId = getGenerationId(c);

      const run = await service.cancel({
        chatId,
        generationId,
        ownerUserId: userId,
      });
      if (!run) throw new ValidationError('Generation cannot be cancelled');
      return c.json(run);
    })
    .post(
      '/messages/:messageId/regenerate',
      zValidator('json', ChatsRegenerateMessageSchema),
      async (c) => {
        const userId = c.get('auth')!.userId;
        const chatId = getChatId(c);
        const messageId = getMessageId(c);
        const { generationId, responseLength } = c.req.valid('json');
        let events;
        try {
          events = await service.regenerateMessage({
            userId,
            generationId,
            chatId,
            messageId,
            responseLength,
          });
        } catch (error) {
          if (error instanceof ChatGenerationInputError) {
            throw new ValidationError(error.message);
          }
          throw error;
        }

        return streamSSE(c, (stream) => writeGenerationStream(stream, events));
      },
    )
    .post(
      '/messages/:messageId/tool-calls/:toolCallId/respond',
      zValidator('json', ChatsToolCallRespondSchema),
      async (c) => {
        const userId = c.get('auth')!.userId;
        const chatId = getChatId(c);
        const messageId = getMessageId(c);
        const toolCallId = c.req.param('toolCallId');
        if (!toolCallId) throw new ValidationError('Tool call id is required');
        const { approved, responseLength } = c.req.valid('json');
        let events;
        try {
          events = await service.respondToConfirmation({
            userId,
            chatId,
            messageId,
            toolCallId,
            approved,
            responseLength,
          });
        } catch (error) {
          if (error instanceof ChatGenerationInputError) {
            throw new ValidationError(error.message);
          }
          throw error;
        }

        return streamSSE(c, (stream) => writeGenerationStream(stream, events));
      },
    )
    .post('/stream', zValidator('json', ChatsSendSchema), async (c) => {
      const userId = c.get('auth')!.userId;
      const chatId = getChatId(c);
      const {
        generationId,
        message,
        fileIds = [],
        responseModality,
        responseLength,
      } = c.req.valid('json');
      const events = await service.sendMessage({
        userId,
        generationId,
        chatId,
        message,
        fileIds,
        responseLength,
        responseModality,
      });

      return streamSSE(c, (stream) => writeGenerationStream(stream, events));
    });
}

export function createChatStartGenerationRoute(
  service: ChatGenerationService = chatGenerationService,
) {
  return new Hono<AppContext>().post('/', zValidator('json', ChatsStartStreamSchema), async (c) => {
    const userId = c.get('auth')!.userId;
    const { generationId, title, message, fileIds = [], responseLength } = c.req.valid('json');
    const events = await service.startMessage({
      userId,
      generationId,
      title,
      message,
      fileIds,
      responseLength,
    });

    return streamSSE(c, (stream) => writeGenerationStream(stream, events));
  });
}

export const chatGenerationRoutes = createChatGenerationRoutes();
export const chatStartGenerationRoute = createChatStartGenerationRoute();
