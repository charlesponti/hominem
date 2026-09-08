import { randomUUID } from 'node:crypto';

import { CHAT_MODEL, getChatCompletionUsage } from '@hominem/ai';
import type {
  ChatMessageSnapshot,
  GenerationEvent,
  GenerationHistoryEventPayload,
  GenerationStartContext,
} from '@hominem/chat';
import { chatMessageJsonObjectSchema } from '@hominem/chat';
import { createRedisChatContextCache } from '@hominem/chat/adapters/redis';
import type { ChatGenerationEventRecord } from '@hominem/db/chats';
import { ChatGenerationRepository, ChatRepository } from '@hominem/db/chats';
import { db } from '@hominem/db/core';
import { runInTransaction } from '@hominem/db/transaction';
import { embeddingQueue } from '@hominem/queues';
import { redis } from '@hominem/services/redis';

import { recordAIUsageEvent, startAIUsageTimer } from '../application/ai-usage.service';
import { AsyncEventQueue } from './async-event-queue';
import { executeGenerationTurn } from './chat-generation-engine';
import { toGenerationFailureMessage } from './chat-generation-errors';
import {
  createEffectStore,
  toChatSnapshot,
  toHistoryEvent,
  toLiveEvent,
  toMessageSnapshot,
} from './chat-generation-snapshot';
import { recordGenerationEventDelivery } from './chat-generation-telemetry';
import type {
  ChatGenerationDependencies,
  GenerationStartInput,
  SendGenerationInput,
  StartGenerationInput,
} from './chat-generation-types';
import { persistSpeechRun, synthesizeReplyAudioFile } from './chat-speech.service';

const chatContextCache = createRedisChatContextCache(redis);

export function send(
  dependencies: ChatGenerationDependencies,
  input: SendGenerationInput,
): Promise<AsyncIterable<GenerationEvent>> {
  return execute(dependencies, { ...input, kind: 'send' });
}

export function start(
  dependencies: ChatGenerationDependencies,
  input: StartGenerationInput,
): Promise<AsyncIterable<GenerationEvent>> {
  return execute(dependencies, { ...input, kind: 'start' });
}

export async function execute(
  dependencies: ChatGenerationDependencies,
  input: GenerationStartInput,
): Promise<AsyncIterable<GenerationEvent>> {
  const queue = new AsyncEventQueue<GenerationEvent>();
  void executeGeneration(dependencies, input, queue).catch((error: unknown) => queue.fail(error));
  return queue;
}

async function executeGeneration(
  dependencies: ChatGenerationDependencies,
  input: GenerationStartInput,
  queue: AsyncEventQueue<GenerationEvent>,
): Promise<void> {
  const eventId = randomUUID();
  const getDurationMs = startAIUsageTimer();
  let usage: ReturnType<typeof getChatCompletionUsage> = null;
  let toolCallCount = 0;
  let streamError: unknown = null;
  let failureDeliveryError: unknown = null;
  let eventOrdinal = 0;

  const append = async (event: GenerationHistoryEventPayload): Promise<void> => {
    await appendMany([event]);
  };

  // Live-delivery bookkeeping for events that are already durably
  // appended (by appendMany below, or — for the commit/checkpoint pair —
  // inside commitGeneration's own transaction; see there for why).
  const deliver = (records: ChatGenerationEventRecord[]): void => {
    for (const record of records) {
      recordGenerationEventDelivery({
        generationId: record.generationId,
        sequence: record.sequence,
        delivery: 'live',
      });
      queue.push(toHistoryEvent(record));
    }
  };

  // Folds+inserts a batch of events (no work between them) as ONE
  // transaction instead of one per event — see appendEvents in
  // ChatGenerationRepository. Used for the startup burst
  // (started/accepted/phase_changed:running); a lone event just becomes a
  // batch of 1.
  const appendMany = async (events: GenerationHistoryEventPayload[]): Promise<void> => {
    for (const event of events) {
      await dependencies.failureHooks?.beforeEventAppend?.(event);
    }
    const records = await runInTransaction((trx) =>
      ChatGenerationRepository.appendEvents(trx, {
        generationId: input.generationId,
        ownerUserId: input.userId,
        events: events.map((event) => ({
          event,
          idempotencyKey: `${input.generationId}:service:${eventOrdinal++}:${event.type}`,
        })),
      }),
    );
    deliver(records);
  };

  try {
    const startContext: GenerationStartContext = {
      chatId: input.chatId,
      kind: input.kind,
      userMessageId: input.userMessageId ?? null,
      targetAssistantMessageId: input.targetAssistantMessageId ?? null,
      requestContext: {},
    };
    const chat = await ChatRepository.getOwnedOrThrow(db, input.chatId, input.userId);
    const userMessage = input.userMessageId
      ? await ChatRepository.getMessageById(db, input.chatId, input.userMessageId)
      : null;
    if (!input.resume) {
      await appendMany([
        { type: 'generation.started', context: startContext },
        {
          type: 'generation.accepted',
          chatId: input.chatId,
          chat: toChatSnapshot(chat),
          userMessage: userMessage ? toMessageSnapshot(userMessage) : null,
        },
        { type: 'generation.phase_changed', phase: 'running' },
      ]);
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
      modelFactory: dependencies.modelFactory,
      toolRuntime: dependencies.toolRuntime,
      maxTokens: input.maxTokens,
      effectStore: createEffectStore(input.userId),
      eventStore: {
        append: ({ event, idempotencyKey }) =>
          (async () => {
            await dependencies.failureHooks?.beforeEventAppend?.(event);
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
      context: {
        recordCompletion: ({ chatId, usage }) =>
          chatContextCache
            .recordCompletion({ chatId, model: CHAT_MODEL, usage })
            .catch(() => undefined),
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
    const committed = await commitGeneration(dependencies, input, {
      assistantText: result.assistantText,
      reasoningText: result.reasoningText,
      toolCallRecords: result.toolCallRecords,
      pendingToolCall: result.pendingToolCall,
      responseModality: input.responseModality,
    });
    // committed.events (the committed/checkpointed event, plus
    // confirmation.required when applicable) were already durably
    // appended inside commitGeneration's own transaction — see there for
    // why. This just delivers them live.
    deliver(committed.events);
  } catch (error) {
    streamError = error;
    try {
      await append({
        type: 'generation.failed',
        message: toGenerationFailureMessage(error),
      });
    } catch (failureError) {
      failureDeliveryError = failureError;
      // The event-append path (persist generation.failed + recompute
      // projected status) just failed too, so the run row would otherwise
      // be stuck at its last non-terminal status forever — even a
      // reconnect/replay reads that same stuck row. Force it directly,
      // bypassing the event log entirely. Best-effort: if this also
      // throws (e.g. DB fully down), there's nothing further this process
      // can do.
      try {
        await runInTransaction((trx) =>
          ChatGenerationRepository.forceFail(trx, {
            generationId: input.generationId,
            ownerUserId: input.userId,
            errorMessage: toGenerationFailureMessage(error),
          }),
        );
      } catch {
        // best-effort, see comment above
      }
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

async function commitGeneration(
  dependencies: ChatGenerationDependencies,
  input: GenerationStartInput,
  result: {
    assistantText: string;
    reasoningText: string | null;
    toolCallRecords: Awaited<ReturnType<typeof executeGenerationTurn>>['toolCallRecords'];
    pendingToolCall: Awaited<ReturnType<typeof executeGenerationTurn>>['pendingToolCall'];
    responseModality?: 'text' | 'audio';
  },
): Promise<{
  message: ChatMessageSnapshot;
  awaitingConfirmation: boolean;
  events: ChatGenerationEventRecord[];
}> {
  const content = result.assistantText.trim()
    ? result.assistantText
    : `I'd like to run "${result.pendingToolCall?.toolName ?? 'a tool'}", which needs your approval first.`;
  const audio =
    result.responseModality === 'audio' && result.assistantText.trim()
      ? await synthesizeReplyAudioFile(input.userId, result.assistantText)
      : null;
  const toolCalls =
    input.confirmation?.approved === false
      ? result.toolCallRecords.map((toolCall) =>
          toolCall.toolCallId === input.confirmation?.toolCallId
            ? { ...toolCall, confirmationStatus: 'rejected' as const, executionStatus: undefined }
            : toolCall,
        )
      : result.toolCallRecords;
  await dependencies.failureHooks?.beforeSnapshotCommit?.();
  const awaitingConfirmation = result.pendingToolCall !== null;
  const { message, events } = await runInTransaction(async (trx) => {
    const updated =
      input.targetAssistantMessageId && input.confirmation
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
        : await ChatRepository.insertMessage(trx, {
            chatId: input.chatId,
            authorUserId: input.userId,
            role: 'assistant',
            content,
            reasoning: result.reasoningText,
            toolCalls: toolCalls.length > 0 ? toolCalls : null,
            files: audio?.file ? [audio.file] : null,
            parentMessageId: input.userMessageId ?? null,
          });
    await ChatRepository.touchLastMessage(trx, input.chatId);
    // Regenerate supersedes the previous attempt outright rather than
    // branching from it — delete its event history and stale message
    // now that the replacement has committed (or checkpointed).
    if (input.staleGenerationId) {
      await ChatGenerationRepository.deleteRun(trx, {
        generationId: input.staleGenerationId,
        ownerUserId: input.userId,
      });
    }
    if (input.staleAssistantMessageId) {
      await ChatRepository.deleteAssistantMessage(trx, input.chatId, input.staleAssistantMessageId);
    }
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

    // The run row's status/assistantMessageId is now updated ONLY via
    // this event append (its projectionUpdate), not by a separate
    // direct write — a direct write here would set the row to a
    // terminal status ahead of the event that's supposed to cause that
    // transition, and appendEvent(s) reads the row as its "current
    // projection" input (see toCurrentProjection), so that ordering
    // would make this same append fail as "followed a terminal event".
    const commitEvent: GenerationHistoryEventPayload = awaitingConfirmation
      ? {
          type: 'generation.checkpointed',
          checkpoint: {
            turnId: input.generationId,
            iteration: 0,
            assistantMessage: toMessageSnapshot(updated),
            pendingToolCallIds: result.pendingToolCall ? [result.pendingToolCall.toolCallId] : [],
          },
        }
      : { type: 'generation.committed', message: toMessageSnapshot(updated) };
    const pendingEvents: GenerationHistoryEventPayload[] = [commitEvent];
    if (awaitingConfirmation && result.pendingToolCall) {
      pendingEvents.push({
        type: 'confirmation.required',
        call: {
          id: result.pendingToolCall.toolCallId,
          name: result.pendingToolCall.toolName,
          arguments: JSON.stringify(result.pendingToolCall.args),
          iteration: 0,
          turnId: input.generationId,
          messageId: updated.id,
          preview: result.pendingToolCall.preview
            ? chatMessageJsonObjectSchema.parse(result.pendingToolCall.preview)
            : null,
        },
      });
    }
    const appended = await ChatGenerationRepository.appendEvents(trx, {
      generationId: input.generationId,
      ownerUserId: input.userId,
      events: pendingEvents.map((event, index) => ({
        event,
        idempotencyKey: `${input.generationId}:service:commit:${index}:${event.type}`,
      })),
    });

    return { message: updated, events: appended };
  });
  await (dependencies.embeddingQueue ?? embeddingQueue).add(
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
    await persistSpeechRun(message.id, input.userId, result.assistantText, audio);
  }
  return { message, awaitingConfirmation, events };
}
