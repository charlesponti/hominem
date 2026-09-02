import { randomUUID } from 'node:crypto';

import {
  CHAT_MODEL,
  type ChatFunctionTool,
  type ChatMessages,
  getChatCompletionUsage,
} from '@hominem/ai';
import { restoreGenerationState } from '@hominem/chat';
import type {
  GenerationHistoryEvent,
  GenerationHistoryEventPayload,
  GenerationHistoryMessageSnapshot,
  GenerationLiveEvent,
  GenerationStreamEventPayload,
  GenerationStartContext,
  GenerationWireEvent,
  GenerationInput,
  GenerationState,
} from '@hominem/chat';
import {
  chatMessageJsonObjectSchema,
  chatMessageSnapshotSchema,
  chatSnapshotSchema,
  GenerationProjectionError,
  parseGenerationHistoryEvent,
} from '@hominem/chat';
import type {
  ChatGenerationEventRecord,
  ChatGenerationRunRecord,
  ChatMessageFileRecord,
  ChatMessageRecord,
  NoteContext,
} from '@hominem/db';
import { ChatGenerationRepository, ChatRepository, db, runInTransaction } from '@hominem/db';
import { embeddingQueue } from '@hominem/queues';

import { planChatTools } from '../mcp/chat-tool-adapter';
import { recordAIUsageEvent, startAIUsageTimer } from './ai-usage.service';
import { assertUnderMonthlyUsageLimit } from './ai-usage.service';
import { executeGenerationTurn } from './chat-generation-engine';
import { replayGenerationEvents } from './chat-generation-replay';
import {
  recordGenerationEventDeduplicated,
  recordGenerationEventDelivery,
  recordGenerationRecovery,
  recordGenerationToolEffect,
} from './chat-generation-telemetry';
import type { ChatGenerationEffectStore } from './chat-generation-tools';
import type {
  ChatGenerationFailureHooks,
  ChatGenerationModelFactory,
  ChatToolRuntime,
} from './chat-generation-types';
import { buildChatSystemPrompt } from './chat-prompts';
import { chatSpeechService } from './chat-speech.service';
import { publishGenerationEvent, subscribeToGenerationEvents } from './generation-live-bus';

type GenerationStreamQueue = AsyncIterable<GenerationWireEvent>;

export class ChatGenerationInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ChatGenerationInputError';
  }
}

type PreparedGeneration = {
  userId: string;
  generationId: string;
  chatId: string;
  kind: 'send' | 'start' | 'regenerate';
  messages: ChatMessages[];
  tools: ChatFunctionTool[];
  model: string;
  reasoning?: Parameters<typeof executeGenerationTurn>[0]['reasoning'];
  requiresToolCall?: boolean;
  maxTokens?: number;
  responseLength?: 'short' | 'medium' | 'long';
  responseModality?: 'text' | 'audio';
  targetAssistantMessageId?: string | null;
  userMessageId?: string | null;
  retryOfGenerationId?: string;
};

type GenerationStartInput = Omit<PreparedGeneration, 'kind'> & {
  kind: 'send' | 'start' | 'regenerate';
  resume?: boolean;
  initialState?: GenerationState;
  initialInput?: GenerationInput;
  confirmation?: {
    messageId: string;
    toolCallId: string;
    approved: boolean;
  };
};

type SendGenerationInput = Omit<GenerationStartInput, 'kind'> & { kind?: 'send' };
type StartGenerationInput = Omit<GenerationStartInput, 'kind'> & { kind?: 'start' };
type RegenerateGenerationInput = Omit<GenerationStartInput, 'kind'> & { kind?: 'regenerate' };

type ReplayInput = {
  generationId: string;
  ownerUserId: string;
  afterSequence?: number;
  terminal?: boolean;
};

type CancelInput = {
  chatId: string;
  generationId: string;
  ownerUserId: string;
};

export type GenerationRecoveryInput = GenerationLookupInput;

export type GenerationRecoveryResult = {
  generationId: string;
  chatId: string;
  phase: ChatGenerationRunRecord['status'];
  lastDurableSequence: number;
  disposition: 'terminal' | 'awaiting_confirmation' | 'resume_required';
  mayExecuteEffect: boolean;
};

export type GenerationLookupInput = {
  chatId: string;
  generationId: string;
  ownerUserId: string;
};

export type ConfirmationMessageInput = {
  userId: string;
  chatId: string;
  messageId: string;
  toolCallId: string;
  approved: boolean;
  responseLength?: 'short' | 'medium' | 'long';
};

export type SendMessageInput = {
  userId: string;
  generationId: string;
  chatId: string;
  message: string;
  fileIds: string[];
  responseLength?: 'short' | 'medium' | 'long';
  responseModality?: 'text' | 'audio';
};

export type StartMessageInput = Omit<SendMessageInput, 'chatId'> & { title: string };

export type RegenerateMessageInput = {
  userId: string;
  generationId: string;
  chatId: string;
  messageId: string;
  responseLength?: 'short' | 'medium' | 'long';
};

const RESPONSE_LENGTH_MAX_TOKENS: Record<'short' | 'medium' | 'long', number> = {
  short: 250,
  medium: 1600,
  long: 6000,
};

function getReasoningConfig(): { effort: 'none' } {
  return { effort: 'none' };
}

function toGenerationFailureMessage(error: unknown): string {
  return error instanceof ChatGenerationInputError ? error.message : 'Generation failed';
}

function toStoredUserMessageContent(message: string, files: ChatMessageFileRecord[]): string {
  const trimmed = message.trim();
  if (trimmed.length > 0) return trimmed;
  if (files.length > 0) return files.map((file) => file.filename ?? 'Attachment').join(', ');
  return '';
}

function formatUserContentWithContext(
  message: string,
  notes: NoteContext[],
  files: ChatMessageFileRecord[],
): string {
  const sections = [message.trim()];
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

export class AsyncEventQueue<T> implements AsyncIterable<T> {
  private readonly values: T[] = [];
  private readonly waiters: Array<{
    resolve: (result: IteratorResult<T>) => void;
    reject: (error: unknown) => void;
  }> = [];
  private closed = false;
  private failure: unknown = null;
  private cleanupCalled = false;

  constructor(private readonly onReturn?: () => void) {}

  push(value: T): void {
    const waiter = this.waiters.shift();
    if (waiter) {
      waiter.resolve({ value, done: false });
      return;
    }
    this.values.push(value);
  }

  close(): void {
    this.closed = true;
    while (this.waiters.length > 0) {
      this.waiters.shift()!.resolve({ value: undefined, done: true });
    }
  }

  fail(error: unknown): void {
    this.failure = error;
    while (this.waiters.length > 0) this.waiters.shift()!.reject(error);
  }

  [Symbol.asyncIterator](): AsyncIterator<T> {
    return {
      next: async (): Promise<IteratorResult<T>> => {
        if (this.values.length > 0) {
          return { value: this.values.shift()!, done: false };
        }
        if (this.failure !== null) throw this.failure;
        if (this.closed) return { value: undefined, done: true };
        return new Promise<IteratorResult<T>>((resolve, reject) => {
          this.waiters.push({ resolve, reject });
        });
      },
      return: async (): Promise<IteratorResult<T>> => {
        this.close();
        if (!this.cleanupCalled) {
          this.cleanupCalled = true;
          this.onReturn?.();
        }
        return { value: undefined, done: true };
      },
    };
  }
}

function toHistoryEvent(record: ChatGenerationEventRecord): GenerationHistoryEvent {
  return parseGenerationHistoryEvent({
    version: 1,
    generationId: record.generationId,
    sequence: record.sequence,
    type: record.type,
    payload: record.payload,
  });
}

function toMessageSnapshot(message: ChatMessageRecord): GenerationHistoryMessageSnapshot {
  const parsed = chatMessageSnapshotSchema.parse(message);
  if (parsed.role !== 'user' && parsed.role !== 'assistant') {
    throw new Error('Generation snapshots only support user and assistant messages');
  }
  return { ...parsed, role: parsed.role };
}

function toChatSnapshot(chat: Awaited<ReturnType<typeof ChatRepository.getOwnedOrThrow>>) {
  return chatSnapshotSchema.parse(chat);
}

function toLiveEvent(
  generationId: string,
  event: GenerationStreamEventPayload,
): GenerationLiveEvent {
  return { version: 1, generationId, event };
}

function createEffectStore(ownerUserId: string): ChatGenerationEffectStore {
  return {
    get: async ({ generationId, idempotencyKey, toolName }) => {
      const effect = await ChatGenerationRepository.getToolEffect(db, {
        generationId,
        ownerUserId,
        idempotencyKey,
      });
      if (!effect) return null;
      recordGenerationToolEffect({ generationId, toolName, outcome: 'reused' });
      return effect.result;
    },
    save: async ({ generationId, idempotencyKey, toolName, result }) => {
      const effect = await ChatGenerationRepository.saveToolEffect(db, {
        generationId,
        ownerUserId,
        idempotencyKey,
        toolName,
        result,
      });
      recordGenerationToolEffect({
        generationId,
        toolName,
        outcome: result.error ? 'failed' : 'executed',
      });
      return effect.result;
    },
  };
}

export class ChatGenerationService {
  constructor(
    private readonly dependencies: {
      modelFactory?: ChatGenerationModelFactory;
      toolRuntime?: ChatToolRuntime;
      planChatTools?: typeof planChatTools;
      failureHooks?: ChatGenerationFailureHooks;
      embeddingQueue?: {
        add: (...args: Parameters<typeof embeddingQueue.add>) => Promise<unknown>;
      };
    } = {},
  ) {}

  private planTools(messages: ChatMessages[]): ReturnType<typeof planChatTools> {
    return (this.dependencies.planChatTools ?? planChatTools)({ model: CHAT_MODEL, messages });
  }

  private publishEvent(event: ChatGenerationEventRecord): void {
    this.dependencies.failureHooks?.beforeEventPublish?.(event);
    publishGenerationEvent(event);
  }

  async regenerateMessage(input: RegenerateMessageInput): Promise<GenerationStreamQueue> {
    await assertUnderMonthlyUsageLimit(input.userId);
    await ChatRepository.getOwnedOrThrow(db, input.chatId, input.userId);
    const target = await ChatRepository.getMessageById(db, input.chatId, input.messageId);
    if (!target || target.role !== 'assistant') {
      throw new ChatGenerationInputError('Only a completed assistant message can be regenerated');
    }
    const priorMessages = await ChatRepository.getMessagesBefore(
      db,
      input.chatId,
      target.createdAt,
    );
    const parentIndex = [...priorMessages].reverse().findIndex((entry) => entry.role === 'user');
    if (parentIndex === -1)
      throw new ChatGenerationInputError('No prior message to regenerate a reply from');
    const parentIndexFromStart = priorMessages.length - 1 - parentIndex;
    const parent = priorMessages[parentIndexFromStart]!;
    const history = priorMessages.slice(0, parentIndexFromStart);
    const [notes, existingRun] = await Promise.all([
      ChatRepository.getChatSourceContext(db, input.chatId),
      ChatRepository.getGenerationRun(db, input.chatId, input.generationId, input.userId),
    ]);
    if (existingRun) {
      return this.replay({
        generationId: input.generationId,
        ownerUserId: input.userId,
        terminal: true,
      });
    }
    await ChatRepository.createGenerationRun(db, {
      id: input.generationId,
      chatId: input.chatId,
      ownerUserId: input.userId,
      kind: 'regenerate',
      targetAssistantMessageId: input.messageId,
    });
    const messages = buildMessages(
      history,
      formatUserContentWithContext(parent.content, notes, parent.files ?? []),
      buildChatSystemPrompt(input.responseLength),
    );
    const toolPlan = await this.planTools(messages);
    return this.regenerate({
      userId: input.userId,
      generationId: input.generationId,
      chatId: input.chatId,
      model: CHAT_MODEL,
      messages,
      tools: toolPlan.tools,
      requiresToolCall: toolPlan.requiresLookup,
      maxTokens: input.responseLength
        ? RESPONSE_LENGTH_MAX_TOKENS[input.responseLength]
        : undefined,
      reasoning: getReasoningConfig(),
      targetAssistantMessageId: input.messageId,
      userMessageId: null,
    });
  }

  async startMessage(input: StartMessageInput): Promise<GenerationStreamQueue> {
    const existingRun = await ChatRepository.getGenerationRunById(
      db,
      input.generationId,
      input.userId,
    );
    if (existingRun) {
      return this.replay({
        generationId: input.generationId,
        ownerUserId: input.userId,
        terminal: true,
      });
    }
    const files = await ChatRepository.resolveChatFiles(db, input.userId, input.fileIds);
    const storedContent = toStoredUserMessageContent(input.message, files);
    if (!storedContent) throw new ChatGenerationInputError('Message or fileIds is required');
    const created = await runInTransaction(async (trx) => {
      const chat = await ChatRepository.create(trx, { userId: input.userId, title: input.title });
      const userMessage = await ChatRepository.insertMessage(trx, {
        chatId: chat.id,
        authorUserId: input.userId,
        role: 'user',
        content: storedContent,
        files: files.length > 0 ? files : null,
      });
      await ChatRepository.touchLastMessage(trx, chat.id);
      await ChatRepository.createGenerationRun(trx, {
        id: input.generationId,
        chatId: chat.id,
        ownerUserId: input.userId,
        kind: 'start',
        userMessageId: userMessage.id,
      });
      return { chat, userMessageId: userMessage.id };
    });
    const messages = buildMessages(
      [],
      formatUserContentWithContext(input.message, [], files),
      buildChatSystemPrompt(input.responseLength),
    );
    const toolPlan = await this.planTools(messages);
    return this.start({
      userId: input.userId,
      generationId: input.generationId,
      chatId: created.chat.id,
      model: CHAT_MODEL,
      messages,
      tools: toolPlan.tools,
      requiresToolCall: toolPlan.requiresLookup,
      maxTokens: input.responseLength
        ? RESPONSE_LENGTH_MAX_TOKENS[input.responseLength]
        : undefined,
      reasoning: getReasoningConfig(),
      userMessageId: created.userMessageId,
    });
  }

  async sendMessage(input: SendMessageInput): Promise<GenerationStreamQueue> {
    await assertUnderMonthlyUsageLimit(input.userId);
    await ChatRepository.getOwnedOrThrow(db, input.chatId, input.userId);
    const [history, notes, files] = await Promise.all([
      ChatRepository.getMessages(db, input.chatId, 30, 0),
      ChatRepository.getChatSourceContext(db, input.chatId),
      ChatRepository.resolveChatFiles(db, input.userId, input.fileIds),
    ]);
    const storedContent = toStoredUserMessageContent(input.message, files);
    if (!storedContent) throw new ChatGenerationInputError('Message or fileIds is required');

    const existingRun = await ChatRepository.getGenerationRun(
      db,
      input.chatId,
      input.generationId,
      input.userId,
    );
    if (existingRun)
      return this.replay({
        generationId: input.generationId,
        ownerUserId: input.userId,
        terminal: true,
      });

    const userMessageId = await runInTransaction(async (trx): Promise<string> => {
      const userMessage = await ChatRepository.insertMessage(trx, {
        chatId: input.chatId,
        authorUserId: input.userId,
        role: 'user',
        content: storedContent,
        files: files.length > 0 ? files : null,
      });
      await ChatRepository.touchLastMessage(trx, input.chatId);
      await ChatRepository.createGenerationRun(trx, {
        id: input.generationId,
        chatId: input.chatId,
        ownerUserId: input.userId,
        kind: 'send',
        userMessageId: userMessage.id,
      });
      return userMessage.id;
    });
    const messages = buildMessages(
      history,
      formatUserContentWithContext(input.message, notes, files),
      buildChatSystemPrompt(input.responseLength),
    );
    const toolPlan = await this.planTools(messages);
    return this.send({
      userId: input.userId,
      generationId: input.generationId,
      chatId: input.chatId,
      model: CHAT_MODEL,
      messages,
      tools: toolPlan.tools,
      requiresToolCall: toolPlan.requiresLookup,
      maxTokens: input.responseLength
        ? RESPONSE_LENGTH_MAX_TOKENS[input.responseLength]
        : undefined,
      reasoning: getReasoningConfig(),
      userMessageId,
      responseModality: input.responseModality,
    });
  }

  async retryMessage(input: {
    userId: string;
    chatId: string;
    failedGenerationId: string;
    generationId: string;
    responseLength?: 'short' | 'medium' | 'long';
  }): Promise<GenerationStreamQueue> {
    await assertUnderMonthlyUsageLimit(input.userId);
    await ChatRepository.getOwnedOrThrow(db, input.chatId, input.userId);
    const failedRun = await ChatRepository.getGenerationRun(
      db,
      input.chatId,
      input.failedGenerationId,
      input.userId,
    );
    if (!failedRun || failedRun.status !== 'failed' || !failedRun.userMessageId) {
      throw new ChatGenerationInputError(
        'Only a failed generation with a user message can be retried',
      );
    }
    const existingRun = await ChatRepository.getGenerationRun(
      db,
      input.chatId,
      input.generationId,
      input.userId,
    );
    if (existingRun) {
      return this.replay({
        generationId: input.generationId,
        ownerUserId: input.userId,
        terminal: true,
      });
    }

    const history = await ChatRepository.getMessages(db, input.chatId, 30, 0);
    const userMessageIndex = history.findIndex((message) => message.id === failedRun.userMessageId);
    const userMessage = history[userMessageIndex];
    if (!userMessage || userMessage.role !== 'user') {
      throw new ChatGenerationInputError('The failed generation user message was not found');
    }
    const [notes] = await Promise.all([ChatRepository.getChatSourceContext(db, input.chatId)]);
    await ChatRepository.createGenerationRun(db, {
      id: input.generationId,
      chatId: input.chatId,
      ownerUserId: input.userId,
      kind: 'send',
      userMessageId: failedRun.userMessageId,
    });
    const messages = buildMessages(
      history.slice(0, userMessageIndex),
      formatUserContentWithContext(userMessage.content, notes, userMessage.files ?? []),
      buildChatSystemPrompt(input.responseLength),
    );
    const toolPlan = await this.planTools(messages);
    return this.send({
      userId: input.userId,
      generationId: input.generationId,
      chatId: input.chatId,
      model: CHAT_MODEL,
      messages,
      tools: toolPlan.tools,
      requiresToolCall: toolPlan.requiresLookup,
      maxTokens: input.responseLength
        ? RESPONSE_LENGTH_MAX_TOKENS[input.responseLength]
        : undefined,
      reasoning: getReasoningConfig(),
      userMessageId: failedRun.userMessageId,
      retryOfGenerationId: failedRun.id,
    });
  }

  send(input: SendGenerationInput): Promise<GenerationStreamQueue> {
    return this.execute({ ...input, kind: 'send' });
  }

  start(input: StartGenerationInput): Promise<GenerationStreamQueue> {
    return this.execute({ ...input, kind: 'start' });
  }

  regenerate(input: RegenerateGenerationInput): Promise<GenerationStreamQueue> {
    return this.execute({ ...input, kind: 'regenerate' });
  }

  async respondToConfirmation(input: ConfirmationMessageInput): Promise<GenerationStreamQueue> {
    await assertUnderMonthlyUsageLimit(input.userId);
    const chat = await ChatRepository.getOwnedOrThrow(db, input.chatId, input.userId);
    const message = await ChatRepository.getMessageById(db, input.chatId, input.messageId);
    const pendingCall = message?.toolCalls?.find((call) => call.toolCallId === input.toolCallId);
    if (!message || message.role !== 'assistant' || !pendingCall) {
      throw new ChatGenerationInputError('Tool call not found');
    }
    if (pendingCall.confirmationStatus !== 'pending') {
      throw new ChatGenerationInputError('Tool call is not awaiting confirmation');
    }
    const run = await ChatRepository.getAwaitingGenerationRunForAssistantMessage(
      db,
      input.chatId,
      input.messageId,
      input.userId,
    );
    if (!run) throw new ChatGenerationInputError('Generation is not awaiting confirmation');

    const history = await ChatRepository.getMessages(db, input.chatId, 30, 0);
    const pendingMessageIndex = history.findIndex((entry) => entry.id === input.messageId);
    const priorHistory =
      pendingMessageIndex === -1 ? history : history.slice(0, pendingMessageIndex);
    const messages: ChatMessages[] = [
      { role: 'system', content: buildChatSystemPrompt(input.responseLength) },
      ...priorHistory.map(
        (entry): ChatMessages => ({
          role: entry.role === 'assistant' ? 'assistant' : 'user',
          content: entry.content,
        }),
      ),
      {
        role: 'assistant',
        content: message.content || null,
        toolCalls: [
          {
            id: input.toolCallId,
            type: 'function',
            function: {
              name: pendingCall.toolName,
              arguments: JSON.stringify(pendingCall.args),
            },
          },
        ],
      },
      ...(input.approved
        ? []
        : [
            {
              role: 'tool' as const,
              toolCallId: input.toolCallId,
              content: JSON.stringify({ error: 'User rejected tool call' }),
            },
          ]),
    ];
    const toolPlan = await this.planTools(messages);
    const events = await ChatGenerationRepository.listEvents(db, run.id, input.userId, 0);
    const initialState = {
      ...restoreGenerationState(run.id, events.map(toHistoryEvent)),
      // The checkpoint contains the approval prompt. A resumed generation
      // must start a fresh assistant body so that prompt text is not appended
      // to the post-approval response.
      assistantText: '',
      reasoningText: '',
    };
    return this.execute({
      userId: input.userId,
      generationId: run.id,
      chatId: chat.id,
      model: CHAT_MODEL,
      messages,
      tools: toolPlan.tools,
      requiresToolCall: toolPlan.requiresLookup,
      maxTokens: input.responseLength
        ? RESPONSE_LENGTH_MAX_TOKENS[input.responseLength]
        : undefined,
      reasoning: getReasoningConfig(),
      userMessageId: null,
      targetAssistantMessageId: input.messageId,
      kind: 'send',
      resume: true,
      initialState,
      initialInput: input.approved
        ? { type: 'confirmation-approved', callId: input.toolCallId }
        : {
            type: 'confirmation-rejected',
            callId: input.toolCallId,
            reason: 'User rejected tool call',
          },
      confirmation: {
        messageId: input.messageId,
        toolCallId: input.toolCallId,
        approved: input.approved,
      },
    });
  }

  async replay(input: ReplayInput): Promise<GenerationStreamQueue> {
    const afterSequence = input.afterSequence ?? 0;
    const subscriber = subscribeToGenerationEvents(input.generationId);
    const queue = new AsyncEventQueue<GenerationWireEvent>(() => subscriber.close());
    void (async () => {
      try {
        for await (const event of replayGenerationEvents(
          {
            load: () =>
              ChatGenerationRepository.listEvents(
                db,
                input.generationId,
                input.ownerUserId,
                afterSequence,
              ),
            subscribe: () => subscriber,
            stopAfterLoad: input.terminal === true,
            onDelivery: recordGenerationEventDelivery,
            onDeduplicated: recordGenerationEventDeduplicated,
          },
          afterSequence,
        )) {
          queue.push(event);
        }
        queue.close();
      } finally {
        subscriber.close();
      }
    })().catch((error: unknown) => queue.fail(error));
    return queue;
  }

  async getGeneration(
    input: GenerationLookupInput,
  ): Promise<Awaited<ReturnType<typeof ChatRepository.getGenerationRun>>> {
    await ChatRepository.getOwnedOrThrow(db, input.chatId, input.ownerUserId);
    const run = await ChatRepository.getGenerationRun(
      db,
      input.chatId,
      input.generationId,
      input.ownerUserId,
    );
    return run;
  }

  async recover(input: GenerationRecoveryInput): Promise<GenerationRecoveryResult | null> {
    const run = await this.getGeneration(input);
    if (!run) return null;

    const events = await ChatGenerationRepository.listEvents(
      db,
      input.generationId,
      input.ownerUserId,
      0,
    );
    const projection =
      events.length > 0
        ? await ChatGenerationRepository.rebuildProjection(
            db,
            input.generationId,
            input.ownerUserId,
          )
        : null;
    const phase = projection?.status ?? run.status;
    const terminal = ['committed', 'cancelled', 'failed'].includes(phase);
    const awaitingConfirmation = phase === 'awaiting_confirmation';

    const result: GenerationRecoveryResult = {
      generationId: run.id,
      chatId: run.chatId,
      phase,
      lastDurableSequence: events.at(-1)?.sequence ?? 0,
      disposition: terminal
        ? 'terminal'
        : awaitingConfirmation
          ? 'awaiting_confirmation'
          : 'resume_required',
      mayExecuteEffect: false,
    };
    recordGenerationRecovery(result);
    return result;
  }

  async cancel(
    input: CancelInput,
  ): Promise<Awaited<ReturnType<typeof ChatRepository.cancelGenerationRun>>> {
    await ChatRepository.getOwnedOrThrow(db, input.chatId, input.ownerUserId);
    await this.dependencies.failureHooks?.beforeCancellationCommit?.();
    const requestedAt = new Date().toISOString();
    let events: ChatGenerationEventRecord[] = [];
    try {
      events = await runInTransaction(async (trx): Promise<ChatGenerationEventRecord[]> => {
        const run = await ChatRepository.getGenerationRunById(
          trx,
          input.generationId,
          input.ownerUserId,
        );
        if (!run || ['committed', 'cancelled', 'failed'].includes(run.status)) return [];

        const cancellationEvents: ChatGenerationEventRecord[] = [];
        if (run.status === 'preparing') {
          cancellationEvents.push(
            await ChatGenerationRepository.appendEvent(trx, {
              generationId: input.generationId,
              ownerUserId: input.ownerUserId,
              event: {
                type: 'generation.started',
                context: {
                  chatId: run.chatId,
                  kind: run.kind,
                  userMessageId: run.userMessageId,
                  targetAssistantMessageId: run.targetAssistantMessageId,
                  requestContext: {},
                },
              },
              idempotencyKey: `${input.generationId}:started`,
            }),
          );
        }
        cancellationEvents.push(
          await ChatGenerationRepository.appendEvent(trx, {
            generationId: input.generationId,
            ownerUserId: input.ownerUserId,
            event: {
              type: 'generation.cancel_requested',
              requestedAt,
              requestedBy: input.ownerUserId,
            },
            idempotencyKey: `${input.generationId}:cancel-requested`,
          }),
          await ChatGenerationRepository.appendEvent(trx, {
            generationId: input.generationId,
            ownerUserId: input.ownerUserId,
            event: { type: 'generation.cancelled' },
            idempotencyKey: `${input.generationId}:cancelled`,
          }),
        );
        return cancellationEvents;
      });
    } catch (error) {
      if (!(error instanceof GenerationProjectionError)) throw error;
    }
    for (const event of events) this.publishEvent(event);
    return ChatRepository.getGenerationRunById(db, input.generationId, input.ownerUserId);
  }

  private async execute(input: GenerationStartInput): Promise<GenerationStreamQueue> {
    const queue = new AsyncEventQueue<GenerationWireEvent>();
    void this.executeGeneration(input, queue).catch((error: unknown) => queue.fail(error));
    return queue;
  }

  private async executeGeneration(
    input: GenerationStartInput,
    queue: AsyncEventQueue<GenerationWireEvent>,
  ): Promise<void> {
    const eventId = randomUUID();
    const getDurationMs = startAIUsageTimer();
    let usage: ReturnType<typeof getChatCompletionUsage> = null;
    let toolCallCount = 0;
    let streamError: unknown = null;
    let failureDeliveryError: unknown = null;
    let eventOrdinal = 0;

    const append = async (event: GenerationHistoryEventPayload): Promise<void> => {
      await this.dependencies.failureHooks?.beforeEventAppend?.(event);
      const record = await runInTransaction((trx) =>
        ChatGenerationRepository.appendEvent(trx, {
          generationId: input.generationId,
          ownerUserId: input.userId,
          event,
          idempotencyKey: `${input.generationId}:service:${eventOrdinal++}:${event.type}`,
        }),
      );
      recordGenerationEventDelivery({
        generationId: record.generationId,
        sequence: record.sequence,
        delivery: 'live',
      });
      this.publishEvent(record);
      queue.push(toHistoryEvent(record));
    };

    try {
      const startContext: GenerationStartContext = {
        chatId: input.chatId,
        kind: input.kind,
        userMessageId: input.userMessageId ?? null,
        targetAssistantMessageId: input.targetAssistantMessageId ?? null,
        ...(input.retryOfGenerationId ? { retryOfGenerationId: input.retryOfGenerationId } : {}),
        requestContext: {},
      };
      const chat = await ChatRepository.getOwnedOrThrow(db, input.chatId, input.userId);
      const userMessage = input.userMessageId
        ? await ChatRepository.getMessageById(db, input.chatId, input.userMessageId)
        : null;
      if (!input.resume) {
        await append({ type: 'generation.started', context: startContext });
        await append({
          type: 'generation.accepted',
          chatId: input.chatId,
          chat: toChatSnapshot(chat),
          userMessage: userMessage ? toMessageSnapshot(userMessage) : null,
        });
        await append({ type: 'generation.phase_changed', phase: 'running' });
      }

      const result = await executeGenerationTurn({
        userId: input.userId,
        generationId: input.generationId,
        chatId: input.chatId,
        generationKind: input.kind,
        userMessageId: input.userMessageId,
        targetAssistantMessageId: input.targetAssistantMessageId,
        messages: input.messages,
        tools: input.tools,
        model: input.model,
        reasoning: input.reasoning,
        requiresToolCall: input.requiresToolCall,
        initialState: input.initialState,
        initialInput: input.initialInput,
        modelFactory: this.dependencies.modelFactory,
        toolRuntime: this.dependencies.toolRuntime,
        maxTokens: input.maxTokens,
        effectStore: createEffectStore(input.userId),
        eventStore: {
          append: ({ event, idempotencyKey }) =>
            (async () => {
              await this.dependencies.failureHooks?.beforeEventAppend?.(event);
              return runInTransaction(async (trx) => {
                const record = await ChatGenerationRepository.appendEvent(trx, {
                  generationId: input.generationId,
                  ownerUserId: input.userId,
                  event,
                  idempotencyKey,
                });
                if (input.confirmation) {
                  const lifecycle =
                    event.type === 'confirmation.rejected'
                      ? { confirmationStatus: 'rejected' as const }
                      : event.type === 'confirmation.approved'
                        ? {
                            confirmationStatus: 'approved' as const,
                            executionStatus: 'running' as const,
                          }
                        : event.type === 'tool.requested'
                          ? { executionStatus: 'running' as const }
                          : event.type === 'tool.completed'
                            ? { executionStatus: 'completed' as const }
                            : event.type === 'tool.failed'
                              ? input.confirmation.approved
                                ? { executionStatus: 'failed' as const }
                                : { confirmationStatus: 'rejected' as const }
                              : null;
                  if (lifecycle) {
                    await ChatRepository.updateToolCallLifecycle(
                      trx,
                      input.chatId,
                      input.confirmation.messageId,
                      input.confirmation.toolCallId,
                      lifecycle,
                    );
                  }
                }
                return record;
              });
            })(),
        },
        durableEvents: {
          accept: (record) => {
            this.publishEvent(record);
            queue.push(toHistoryEvent(record));
          },
        },
        cancellation: {
          isRequested: async () =>
            (await ChatRepository.getGenerationRunById(db, input.generationId, input.userId))
              ?.status === 'cancelled',
        },
        liveEvents: {
          accept: (event) => {
            queue.push(toLiveEvent(input.generationId, event));
          },
        },
      });
      usage = result.usage;
      toolCallCount = result.toolCallRecords.length;

      const currentRun = await ChatRepository.getGenerationRunById(
        db,
        input.generationId,
        input.userId,
      );
      if (currentRun?.status === 'cancelled') return;

      if (!result.assistantText.trim() && !result.pendingToolCall) {
        throw new Error('No reply was generated');
      }
      await append({ type: 'generation.phase_changed', phase: 'saving' });
      const committed = await this.commitGeneration(input, {
        assistantText: result.assistantText,
        reasoningText: result.reasoningText,
        toolCallRecords: result.toolCallRecords,
        pendingToolCall: result.pendingToolCall,
        responseModality: input.responseModality,
      });
      await append(
        committed.awaitingConfirmation
          ? {
              type: 'generation.checkpointed',
              checkpoint: {
                turnId: input.generationId,
                iteration: 0,
                assistantMessage: toMessageSnapshot(committed.message),
                pendingToolCallIds: result.pendingToolCall
                  ? [result.pendingToolCall.toolCallId]
                  : [],
              },
            }
          : {
              type: 'generation.committed',
              message: toMessageSnapshot(committed.message),
            },
      );
      if (committed.awaitingConfirmation && result.pendingToolCall) {
        await append({
          type: 'confirmation.required',
          call: {
            id: result.pendingToolCall.toolCallId,
            name: result.pendingToolCall.toolName,
            arguments: JSON.stringify(result.pendingToolCall.args),
            iteration: 0,
            turnId: input.generationId,
            messageId: committed.message.id,
            preview: result.pendingToolCall.preview
              ? chatMessageJsonObjectSchema.parse(result.pendingToolCall.preview)
              : null,
          },
        });
      }
    } catch (error) {
      streamError = error;
      try {
        await append({
          type: 'generation.failed',
          message: toGenerationFailureMessage(error),
        });
      } catch (failureError) {
        failureDeliveryError = failureError;
      }
    } finally {
      await recordAIUsageEvent({
        eventId,
        userId: input.userId,
        feature: 'chat_stream',
        operation: 'chat_completion',
        model: CHAT_MODEL,
        usage,
        status: streamError ? 'failed' : 'succeeded',
        error: streamError,
        durationMs: getDurationMs(),
        metadata: { chatId: input.chatId, generationId: input.generationId, toolCallCount },
      });
      if (failureDeliveryError) queue.fail(failureDeliveryError);
      else queue.close();
    }
  }

  private async commitGeneration(
    input: GenerationStartInput,
    result: {
      assistantText: string;
      reasoningText: string | null;
      toolCallRecords: Awaited<ReturnType<typeof executeGenerationTurn>>['toolCallRecords'];
      pendingToolCall: Awaited<ReturnType<typeof executeGenerationTurn>>['pendingToolCall'];
      responseModality?: 'text' | 'audio';
    },
  ): Promise<{ message: ChatMessageRecord; awaitingConfirmation: boolean }> {
    const content = result.assistantText.trim()
      ? result.assistantText
      : `I'd like to run "${result.pendingToolCall?.toolName ?? 'a tool'}", which needs your approval first.`;
    const audio =
      result.responseModality === 'audio' && result.assistantText.trim()
        ? await chatSpeechService.synthesizeReplyAudioFile(input.userId, result.assistantText)
        : null;
    const toolCalls =
      input.confirmation?.approved === false
        ? result.toolCallRecords.map((toolCall) =>
            toolCall.toolCallId === input.confirmation?.toolCallId
              ? { ...toolCall, confirmationStatus: 'rejected' as const, executionStatus: undefined }
              : toolCall,
          )
        : result.toolCallRecords;
    await this.dependencies.failureHooks?.beforeSnapshotCommit?.();
    const message = await runInTransaction(async (trx): Promise<ChatMessageRecord> => {
      const updated =
        input.targetAssistantMessageId && (input.kind === 'regenerate' || input.confirmation)
          ? await ChatRepository.replaceAssistantMessageContent(
              trx,
              input.chatId,
              input.targetAssistantMessageId,
              content,
              {
                reasoning: result.reasoningText,
                toolCalls: toolCalls.length > 0 ? toolCalls : null,
                files: audio?.file ? [audio.file] : undefined,
              },
            )
          : await (async () => {
              const inserted = await ChatRepository.insertMessage(trx, {
                chatId: input.chatId,
                authorUserId: input.userId,
                role: 'assistant',
                content,
                reasoning: result.reasoningText,
                toolCalls: toolCalls.length > 0 ? toolCalls : null,
                files: audio?.file ? [audio.file] : null,
                parentMessageId: input.userMessageId ?? null,
              });
              return ChatRepository.getMessageById(trx, input.chatId, inserted.id).then((value) => {
                if (!value) throw new Error('Committed assistant message could not be loaded');
                return value;
              });
            })();
      await ChatRepository.touchLastMessage(trx, input.chatId);
      if (input.confirmation) {
        const toolResult = result.toolCallRecords.find(
          (toolCall) => toolCall.toolCallId === input.confirmation?.toolCallId,
        );
        await ChatRepository.updateToolCallLifecycle(
          trx,
          input.chatId,
          input.confirmation.messageId,
          input.confirmation.toolCallId,
          input.confirmation.approved
            ? {
                confirmationStatus: 'approved',
                executionStatus: toolResult?.executionStatus ?? 'failed',
              }
            : { confirmationStatus: 'rejected' },
        );
      }
      await ChatRepository.updateGenerationRun(trx, {
        id: input.generationId,
        ownerUserId: input.userId,
        status: result.pendingToolCall ? 'awaiting_confirmation' : 'committed',
        assistantMessageId: updated.id,
      });
      return updated;
    });
    await (this.dependencies.embeddingQueue ?? embeddingQueue).add(
      'generate-embedding',
      {
        jobId: `chat-${input.chatId}`,
        userId: input.userId,
        entityType: 'chat',
        entityId: input.chatId,
      },
      { jobId: `chat-${input.chatId}`, removeOnComplete: true, removeOnFail: false },
    );
    if (audio) {
      await chatSpeechService.persistSpeechRun(
        message.id,
        input.userId,
        result.assistantText,
        audio,
      );
    }
    return { message, awaitingConfirmation: result.pendingToolCall !== null };
  }
}

export const chatGenerationService = new ChatGenerationService();

export type {
  CancelInput,
  GenerationStartInput,
  RegenerateGenerationInput,
  ReplayInput,
  SendGenerationInput,
  StartGenerationInput,
};
