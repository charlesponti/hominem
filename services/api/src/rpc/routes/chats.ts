import { randomUUID } from 'node:crypto';

import {
  AUDIO_TTS_MODEL,
  CHAT_MODEL,
  type ChatMessages,
  getSpeechUsageEstimate,
} from '@hominem/ai';
import type { ChatMessageFileRecord, ChatMessageRecord, NoteContext } from '@hominem/db';
import { ChatRepository, ChatSpeechRunRepository, db, runInTransaction } from '@hominem/db';
import { chatFileCleanupQueue } from '@hominem/queues';
import { getTelemetryTracer, logger } from '@hominem/telemetry';
import { zValidator } from '@hono/zod-validator';
import { SpanStatusCode } from '@opentelemetry/api';
import {
  chatParamsFromRequestBody,
  requestRunCancel,
  resumeHttpResponse,
  toHttpResponse,
  type ModelMessage,
} from '@tanstack/ai';
import { reconstructChat } from '@tanstack/ai-persistence';
import { Hono } from 'hono';

import {
  assertUnderMonthlyUsageLimit,
  recordAIUsageEvent,
  startAIUsageTimer,
} from '../../application/ai-usage.service';
import {
  ChatsAddSourceSchema,
  ChatsAgentOperationSchema,
  type ChatsAgentOperation,
  ChatsCreateSchema,
  ChatsEditMessageSchema,
  ChatsListQuerySchema,
  ChatsMessagesQuerySchema,
  ChatsSearchMessagesQuerySchema,
  ChatsUpdateSchema,
} from '../../schemas/chats.schema';
import { NotFoundError, UnavailableError, ValidationError } from '../errors';
import { authMiddleware, type AppContext } from '../middleware/auth';
import { rateLimitMiddleware } from '../middleware/rate-limit';
import { createTanStackChatStream } from './chat-agent';
import {
  createChatPersistence,
  createChatStreamDurability,
  ensureChatRun,
  getOwnedChatRun,
  getChatRunStore,
} from './chat-agent-persistence';
import { streamChatReplySpeech } from './chat-speech.service';
import {
  toChatDto,
  toChatMessageDto,
  toChatSourceDto,
  toStoredUserMessageContent,
} from './chats.mapper';

const speechTracer = getTelemetryTracer('hominem.chat');

function formatUserContentWithContext(
  message: string,
  notes: NoteContext[],
  files: ChatMessageFileRecord[],
): string {
  const sections = [];

  sections.push(message.trim());

  if (notes.length > 0) {
    sections.push(
      [
        'Referenced notes:',
        ...notes.map((note, index) => {
          const fileText = note.files
            .flatMap((file) => {
              const snippet = file.textContent ?? file.content;
              return snippet ? [`- ${file.originalName}: ${snippet.slice(0, 1_000)}`] : [];
            })
            .join('\n');

          return [
            `${index + 1}. ${note.title ?? 'Untitled note'} (${note.id})`,
            note.content,
            ...(fileText ? ['Attached files:', fileText] : []),
          ].join('\n');
        }),
      ].join('\n\n'),
    );
  }

  if (files.length > 0) {
    sections.push(
      [
        'Attached files:',
        ...files.map((file, index) => {
          const extractedText =
            file.metadata && typeof file.metadata === 'object' && 'extractedText' in file.metadata
              ? String(file.metadata.extractedText)
              : '';
          return [
            `${index + 1}. ${file.filename ?? 'Attachment'} (${file.mimeType ?? 'application/octet-stream'})`,
            ...(extractedText ? [extractedText] : []),
          ].join('\n');
        }),
      ].join('\n\n'),
    );
  }

  return sections.filter(Boolean).join('\n\n');
}

function buildMessages(
  history: ChatMessageRecord[],
  currentUserContent: string,
  systemPrompt: string,
): ChatMessages[] {
  return [
    { role: 'system', content: systemPrompt },
    ...history.map(
      (entry): ChatMessages => ({
        role: entry.role === 'assistant' ? 'assistant' : 'user',
        content: entry.content,
      }),
    ),
    { role: 'user', content: currentUserContent },
  ];
}

function getChatId(c: { req: { param: (name: string) => string | undefined } }): string {
  const chatId = c.req.param('id');
  if (!chatId) throw new ValidationError('Chat id is required');
  return chatId;
}

function parseAgentOperation(body: unknown): ChatsAgentOperation {
  const forwardedProps =
    body && typeof body === 'object' && 'forwardedProps' in body
      ? (body as { forwardedProps?: unknown }).forwardedProps
      : null;
  const operation =
    forwardedProps && typeof forwardedProps === 'object' && 'operation' in forwardedProps
      ? (forwardedProps as { operation?: unknown }).operation
      : null;
  if (!operation) throw new ValidationError('Agent operation is required');
  const parsed = ChatsAgentOperationSchema.safeParse(operation);
  if (!parsed.success) throw new ValidationError('Invalid agent operation');
  return parsed.data;
}

function latestUserContent(messages: readonly ModelMessage[]): string {
  const message = [...messages].reverse().find((candidate) => candidate.role === 'user');
  return typeof message?.content === 'string' ? message.content.trim() : '';
}

function getMessageId(c: { req: { param: (name: string) => string | undefined } }): string {
  const messageId = c.req.param('messageId');
  if (!messageId) throw new ValidationError('Message id is required');
  return messageId;
}

const chatByIdRoutes = new Hono<AppContext>()
  .use('/agent', rateLimitMiddleware({ bucket: 'chat-stream', windowSec: 60, max: 30 }))
  .post('/agent', async (c) => {
    const userId = c.get('auth')!.userId;
    const chatId = getChatId(c);
    await ChatRepository.getOwnedOrThrow(db, chatId, userId);

    const body = await c.req.json();
    const params = await chatParamsFromRequestBody(body);
    if (params.threadId !== chatId) throw new ValidationError('Thread id does not match chat id');

    const operation = params.resume
      ? ({ kind: 'resume' } satisfies ChatsAgentOperation)
      : parseAgentOperation(body);
    const existingRun = await getOwnedChatRun(userId, params.runId);
    if (existingRun && existingRun.threadId !== chatId) {
      throw new ValidationError('Run id does not belong to this chat');
    }
    if (existingRun && operation.kind !== 'resume') {
      const replayUrl = new URL(c.req.url);
      replayUrl.searchParams.set('offset', '0');
      return resumeHttpResponse({
        adapter: createChatStreamDurability(
          new Request(replayUrl, c.req.raw),
          params.runId,
          userId,
        ),
      });
    }
    await assertUnderMonthlyUsageLimit(userId);
    let messages = params.messages as ModelMessage[];
    let inputFiles: ChatMessageFileRecord[] = [];
    let responseLength: 'short' | 'medium' | 'long' | undefined;

    if (operation.kind === 'send') {
      const message = latestUserContent(messages);
      const [history, notes, files] = await Promise.all([
        ChatRepository.getMessages(db, chatId, 30, 0),
        ChatRepository.getChatSourceContext(db, chatId),
        ChatRepository.resolveChatFiles(db, userId, operation.fileIds ?? []),
      ]);
      inputFiles = files;
      const storedContent = toStoredUserMessageContent(message, files);
      if (!storedContent) throw new ValidationError('Message or fileIds is required');
      if (!existingRun) {
        await runInTransaction(async (trx) => {
          await ChatRepository.insertMessage(trx, {
            chatId,
            authorUserId: userId,
            role: 'user',
            content: storedContent,
            files: files.length > 0 ? files : null,
          });
          await ChatRepository.touchLastMessage(trx, chatId);
        });
      }
      messages = buildMessages(
        history,
        formatUserContentWithContext(message, notes, files),
        '',
      ).filter((message) => message.role !== 'system') as ModelMessage[];
      responseLength = operation.responseLength;
    }

    if (operation.kind === 'regenerate') {
      const target = await ChatRepository.getMessageById(db, chatId, operation.assistantMessageId);
      if (!target || target.role !== 'assistant') {
        throw new ValidationError('Only a completed assistant message can be regenerated');
      }
      const prior = await ChatRepository.getMessagesBefore(db, chatId, target.createdAt);
      const parentIndex = [...prior].reverse().findIndex((message) => message.role === 'user');
      if (parentIndex === -1)
        throw new ValidationError('No prior message to regenerate a reply from');
      const resolvedParentIndex = prior.length - parentIndex - 1;
      const parent = prior[resolvedParentIndex]!;
      const [notes, files] = await Promise.all([
        ChatRepository.getChatSourceContext(db, chatId),
        Promise.resolve(parent.files ?? []),
      ]);
      messages = buildMessages(
        prior.slice(0, resolvedParentIndex),
        formatUserContentWithContext(parent.content, notes, files),
        '',
      ).filter((message) => message.role !== 'system') as ModelMessage[];
      responseLength = operation.responseLength;
    }

    await ensureChatRun({ ownerUserId: userId, threadId: params.threadId, runId: params.runId });

    const stream = await createTanStackChatStream({
      userId,
      model: CHAT_MODEL,
      threadId: params.threadId,
      runId: params.runId,
      messages: messages as ChatMessages[],
      resume: params.resume,
      responseLength,
      ...(operation.kind === 'regenerate'
        ? { targetAssistantMessageId: operation.assistantMessageId }
        : {}),
      ...(operation.kind === 'send' ? { inputFiles } : {}),
      responseModality: operation.kind === 'send' ? operation.responseModality : 'text',
    });

    return toHttpResponse(stream, {
      durability: { adapter: createChatStreamDurability(c.req.raw, params.runId, userId) },
    });
  })
  .post('/agent/runs/:runId/cancel', async (c) => {
    const userId = c.get('auth')!.userId;
    const chatId = getChatId(c);
    const runId = c.req.param('runId');
    if (!runId) throw new ValidationError('Run id is required');
    await ChatRepository.getOwnedOrThrow(db, chatId, userId);
    await requestRunCancel(getChatRunStore(userId), runId);
    return c.json({ success: true });
  })
  .get('/agent', async (c) => {
    const userId = c.get('auth')!.userId;
    const chatId = getChatId(c);
    await ChatRepository.getOwnedOrThrow(db, chatId, userId);

    const url = new URL(c.req.url);
    const requestedRunId = url.searchParams.get('runId');
    if (requestedRunId && url.searchParams.has('offset')) {
      return resumeHttpResponse({
        adapter: createChatStreamDurability(c.req.raw, requestedRunId, userId),
      });
    }
    url.searchParams.set('threadId', chatId);
    return reconstructChat(createChatPersistence(userId), new Request(url, c.req.raw), {
      authorize: async (threadId: string) => threadId === chatId,
    });
  })
  .get('/', async (c) => {
    const userId = c.get('auth')!.userId;
    const chatId = getChatId(c);

    const [chat, messages] = await Promise.all([
      ChatRepository.getOwnedOrThrow(db, chatId, userId),
      ChatRepository.getMessages(db, chatId, 100, 0),
    ]);

    return c.json({
      ...toChatDto(chat),
      messages: messages.map(toChatMessageDto),
    });
  })
  .patch('/', zValidator('json', ChatsUpdateSchema), async (c) => {
    const userId = c.get('auth')!.userId;
    const chatId = getChatId(c);
    const { title } = c.req.valid('json');

    await ChatRepository.getOwnedOrThrow(db, chatId, userId);
    await ChatRepository.updateTitle(db, chatId, userId, title);

    return c.json({ success: true });
  })
  .post('/archive', async (c) => {
    const userId = c.get('auth')!.userId;
    const chatId = getChatId(c);

    await ChatRepository.getOwnedOrThrow(db, chatId, userId);
    const archived = await ChatRepository.archive(db, chatId, userId);

    return c.json(toChatDto(archived));
  })
  .get('/messages', zValidator('query', ChatsMessagesQuerySchema), async (c) => {
    const userId = c.get('auth')!.userId;
    const chatId = getChatId(c);

    await ChatRepository.getOwnedOrThrow(db, chatId, userId);
    const query = c.req.valid('query');
    const limit = query.limit ? Number.parseInt(query.limit, 10) : 100;
    const offset = query.offset ? Number.parseInt(query.offset, 10) : 0;

    const messages = await ChatRepository.getMessages(db, chatId, limit, offset);
    return c.json(messages.map(toChatMessageDto));
  })
  .get('/sources', async (c) => {
    const userId = c.get('auth')!.userId;
    const chatId = getChatId(c);

    await ChatRepository.getOwnedOrThrow(db, chatId, userId);
    const sources = await ChatRepository.listChatSources(db, chatId);
    return c.json(sources.map(toChatSourceDto));
  })
  .post('/sources', zValidator('json', ChatsAddSourceSchema), async (c) => {
    const userId = c.get('auth')!.userId;
    const chatId = getChatId(c);
    const { noteId } = c.req.valid('json');

    await ChatRepository.getOwnedOrThrow(db, chatId, userId);
    const source = await ChatRepository.addChatSource(db, chatId, noteId, userId);
    return c.json(toChatSourceDto(source), 201);
  })
  .delete('/sources/:noteId', async (c) => {
    const userId = c.get('auth')!.userId;
    const chatId = getChatId(c);
    const noteId = c.req.param('noteId');

    await ChatRepository.getOwnedOrThrow(db, chatId, userId);
    const removed = await ChatRepository.removeChatSource(db, chatId, noteId);
    return c.json({ removed });
  })
  .use(
    '/messages/:messageId/speech',
    rateLimitMiddleware({ bucket: 'chat-speech', windowSec: 60, max: 20 }),
  )
  .get('/messages/:messageId/speech', async (c) => {
    const userId = c.get('auth')!.userId;
    const chatId = getChatId(c);
    const messageId = getMessageId(c);

    await assertUnderMonthlyUsageLimit(userId);
    await ChatRepository.getOwnedOrThrow(db, chatId, userId);
    const message = await ChatRepository.getMessageById(db, chatId, messageId);
    if (!message || message.role !== 'assistant') {
      throw new NotFoundError('Assistant message');
    }

    const eventId = randomUUID();
    const speechRunId = randomUUID();
    const speechStartedAt = performance.now();
    let firstAudioByteAt: number | null = null;
    let audioBytes = 0;
    logger.info('chat_speech_requested', { speechRunId });
    const speechSpan = speechTracer.startSpan('chat.speech', {
      attributes: {
        'speech.feature': 'chat_speech',
        'speech.character_count': message.content.length,
      },
    });
    const getDurationMs = startAIUsageTimer();
    await ChatSpeechRunRepository.create(db, {
      id: speechRunId,
      messageId,
      ownerUserId: userId,
      usageEventId: eventId,
      provider: 'openrouter',
      characterCount: message.content.length,
    });
    const speechUsagePromise = getSpeechUsageEstimate({
      model: AUDIO_TTS_MODEL,
      characterCount: message.content.length,
    }).catch((error: unknown) => {
      logger.warn('chat_speech_pricing_unavailable', {
        speechRunId,
        error: error instanceof Error ? error.message : 'Speech pricing unavailable',
      });
      return null;
    });
    const result = await streamChatReplySpeech(message.content);
    const providerReadyDurationMs = Math.max(0, Math.round(performance.now() - speechStartedAt));
    speechSpan.setAttribute('speech.provider_wait_ms', providerReadyDurationMs);
    logger.info('chat_speech_provider_ready', { speechRunId, durationMs: providerReadyDurationMs });
    if (result.kind === 'error') {
      speechSpan.setStatus({ code: SpanStatusCode.ERROR });
      speechSpan.end();
      await recordAIUsageEvent({
        eventId,
        userId,
        feature: 'chat_speech',
        operation: 'speech',
        model: AUDIO_TTS_MODEL,
        usage: null,
        status: 'failed',
        error: result.message,
        durationMs: getDurationMs(),
        metadata: { messageId, characterCount: message.content.length },
      });
      await ChatSpeechRunRepository.markComplete(db, { id: speechRunId, status: 'failed' });
      await ChatSpeechRunRepository.markReconciliation(db, {
        id: speechRunId,
        status: 'failed',
        error: result.message,
      });
      throw new UnavailableError('Speech playback is unavailable.');
    }

    if (result.generationId) {
      await ChatSpeechRunRepository.setProviderGenerationId(db, {
        id: speechRunId,
        providerGenerationId: result.generationId,
      });
    }

    const reader = result.stream.getReader();
    const stream = new ReadableStream<Uint8Array>({
      async pull(controller) {
        try {
          const next = await reader.read();
          if (next.done) {
            logger.info('chat_speech_completed', {
              speechRunId,
              providerReadyDurationMs,
              timeToFirstAudioByteMs:
                firstAudioByteAt === null
                  ? null
                  : Math.max(0, Math.round(firstAudioByteAt - speechStartedAt)),
              durationMs: Math.max(0, Math.round(performance.now() - speechStartedAt)),
              audioBytes,
            });
            speechSpan.setAttributes({
              'speech.time_to_first_audio_byte_ms':
                firstAudioByteAt === null
                  ? -1
                  : Math.max(0, Math.round(firstAudioByteAt - speechStartedAt)),
              'speech.stream_duration_ms': Math.max(
                0,
                Math.round(performance.now() - speechStartedAt),
              ),
              'speech.audio_bytes': audioBytes,
            });
            speechSpan.setStatus({ code: SpanStatusCode.OK });
            speechSpan.end();
            const speechUsage = await speechUsagePromise;
            await recordAIUsageEvent({
              eventId,
              userId,
              feature: 'chat_speech',
              operation: 'speech',
              model: AUDIO_TTS_MODEL,
              usage: speechUsage,
              status: 'succeeded',
              durationMs: getDurationMs(),
              metadata: {
                messageId,
                characterCount: message.content.length,
                costSource: speechUsage?.costSource ?? null,
                costPerCharacterUsd: speechUsage?.costPerCharacterUsd ?? null,
              },
            });
            await ChatSpeechRunRepository.markComplete(db, {
              id: speechRunId,
              status: 'succeeded',
            });
            await ChatSpeechRunRepository.markReconciliation(db, {
              id: speechRunId,
              status: speechUsage ? 'succeeded' : 'failed',
              ...(speechUsage ? {} : { error: 'Speech pricing was unavailable' }),
            });
            controller.close();
            return;
          }
          if (firstAudioByteAt === null) {
            firstAudioByteAt = performance.now();
            logger.info('chat_speech_first_audio_byte', {
              speechRunId,
              durationMs: Math.max(0, Math.round(firstAudioByteAt - speechStartedAt)),
            });
          }
          audioBytes += next.value.byteLength;
          controller.enqueue(next.value);
        } catch (error) {
          logger.error('chat_speech_failed', {
            speechRunId,
            durationMs: Math.max(0, Math.round(performance.now() - speechStartedAt)),
            audioBytes,
            error,
          });
          speechSpan.recordException(new Error('Speech stream failed'));
          speechSpan.setStatus({ code: SpanStatusCode.ERROR });
          speechSpan.end();
          await recordAIUsageEvent({
            eventId,
            userId,
            feature: 'chat_speech',
            operation: 'speech',
            model: AUDIO_TTS_MODEL,
            usage: null,
            status: 'failed',
            error,
            durationMs: getDurationMs(),
            metadata: { messageId, characterCount: message.content.length },
          });
          await ChatSpeechRunRepository.markComplete(db, { id: speechRunId, status: 'failed' });
          await ChatSpeechRunRepository.markReconciliation(db, {
            id: speechRunId,
            status: 'failed',
            error: error instanceof Error ? error.message : 'Speech stream failed',
          });
          controller.error(error);
        }
      },
      async cancel(reason) {
        logger.warn('chat_speech_cancelled', {
          speechRunId,
          durationMs: Math.max(0, Math.round(performance.now() - speechStartedAt)),
          audioBytes,
        });
        speechSpan.setAttributes({
          'speech.stream_duration_ms': Math.max(0, Math.round(performance.now() - speechStartedAt)),
          'speech.audio_bytes': audioBytes,
          'speech.outcome': 'cancelled',
        });
        speechSpan.setStatus({ code: SpanStatusCode.OK });
        speechSpan.end();
        await reader.cancel(reason);
        await recordAIUsageEvent({
          eventId,
          userId,
          feature: 'chat_speech',
          operation: 'speech',
          model: AUDIO_TTS_MODEL,
          usage: null,
          status: 'failed',
          error: reason,
          durationMs: getDurationMs(),
          metadata: { messageId, characterCount: message.content.length },
        });
        await ChatSpeechRunRepository.markComplete(db, { id: speechRunId, status: 'failed' });
        await ChatSpeechRunRepository.markReconciliation(db, {
          id: speechRunId,
          status: 'failed',
          error: reason instanceof Error ? reason.message : 'Speech stream cancelled',
        });
      },
    });

    return new Response(stream, {
      headers: {
        'Cache-Control': 'no-store',
        'Content-Type': result.mimeType,
        'X-Content-Type-Options': 'nosniff',
        'Server-Timing': `speech-provider;dur=${providerReadyDurationMs}`,
      },
    });
  })
  .get('/messages/search', zValidator('query', ChatsSearchMessagesQuerySchema), async (c) => {
    const userId = c.get('auth')!.userId;
    const chatId = getChatId(c);

    await ChatRepository.getOwnedOrThrow(db, chatId, userId);
    const { query, limit } = c.req.valid('query');
    const messages = await ChatRepository.searchMessages(db, chatId, query, limit);

    return c.json(messages.map(toChatMessageDto));
  })
  .patch('/messages/:messageId', zValidator('json', ChatsEditMessageSchema), async (c) => {
    const userId = c.get('auth')!.userId;
    const chatId = getChatId(c);
    const messageId = getMessageId(c);
    const { content } = c.req.valid('json');

    await ChatRepository.getOwnedOrThrow(db, chatId, userId);
    const updated = await ChatRepository.updateMessageContent(
      db,
      chatId,
      messageId,
      userId,
      content,
    );

    return c.json(toChatMessageDto(updated));
  })
  .delete('/messages/:messageId', async (c) => {
    const userId = c.get('auth')!.userId;
    const chatId = getChatId(c);
    const messageId = getMessageId(c);

    await ChatRepository.getOwnedOrThrow(db, chatId, userId);
    const result = await runInTransaction((trx) =>
      ChatRepository.deleteUserMessageAndFollowing(trx, chatId, messageId, userId),
    );

    if (result.cleanupFileIds.length > 0) {
      await chatFileCleanupQueue.add(
        'cleanup-chat-files',
        { fileIds: result.cleanupFileIds, userId },
        {
          attempts: 5,
          backoff: { type: 'exponential', delay: 1_000 },
          jobId: `chat-file-cleanup:${chatId}:${messageId}`,
          removeOnComplete: true,
          removeOnFail: false,
        },
      );
    }

    return c.json({ deletedMessageIds: result.deletedMessageIds });
  });
export const chatsRoutes = new Hono<AppContext>()
  .use('*', authMiddleware)
  .get('/', zValidator('query', ChatsListQuerySchema), async (c) => {
    const userId = c.get('auth')!.userId;
    const { cursor, includeArchived, limit } = c.req.valid('query');
    const page = await ChatRepository.listForUser(db, userId, {
      cursor,
      includeArchived: includeArchived === 'true',
      limit,
    });
    return c.json({ items: page.chats.map(toChatDto), nextCursor: page.nextCursor });
  })
  .post('/', zValidator('json', ChatsCreateSchema), async (c) => {
    const userId = c.get('auth')!.userId;
    const { title } = c.req.valid('json');
    const chat = await ChatRepository.create(db, { userId, title });
    return c.json(toChatDto(chat), 201);
  })
  .route('/:id', chatByIdRoutes);
