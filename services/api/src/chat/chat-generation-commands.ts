import { CHAT_MODEL, type ChatMessages } from '@hominem/ai';
import type { GenerationEvent } from '@hominem/chat';
import { restoreGenerationState } from '@hominem/chat/server';
import { ChatGenerationRepository, ChatRepository } from '@hominem/db/chats';
import { db } from '@hominem/db/core';
import { runInTransaction } from '@hominem/db/transaction';

import { assertUnderMonthlyUsageLimit } from '../application/ai-usage.service';
import { planChatTools } from '../mcp/chat-tool-adapter';
import { ChatGenerationInputError } from './chat-generation-errors';
import { execute, send, start } from './chat-generation-execute';
import {
  RESPONSE_LENGTH_MAX_TOKENS,
  buildMessages,
  formatUserContentWithContext,
  getReasoningConfig,
  toStoredUserMessageContent,
} from './chat-generation-input';
import { replay } from './chat-generation-lifecycle';
import { toHistoryEvent } from './chat-generation-snapshot';
import type {
  ChatGenerationDependencies,
  ConfirmationMessageInput,
  RegenerateInput,
  SendMessageInput,
  StartMessageInput,
} from './chat-generation-types';
import { buildChatSystemPrompt } from './chat-prompts';

function planTools(
  dependencies: ChatGenerationDependencies,
  messages: ChatMessages[],
): ReturnType<typeof planChatTools> {
  return (dependencies.planChatTools ?? planChatTools)({ model: CHAT_MODEL, messages });
}

// Redo the most recent attempt at a turn. `messageId` targeting an
// assistant message redoes its completed reply (deleting it and its run
// once the replacement commits); targeting a user message (e.g. right
// after editing it, once its own stale reply was already deleted) starts
// a fresh reply with nothing to supersede. `failedGenerationId` redoes an
// attempt that never produced a message (deleting its run once the
// replacement commits — there's no failure trail worth keeping once it's
// been retried). All three resolve to the same shared redoGeneration.
export async function regenerate(
  dependencies: ChatGenerationDependencies,
  input: RegenerateInput,
): Promise<AsyncIterable<GenerationEvent>> {
  await ChatRepository.getOwnedOrThrow(db, input.chatId, input.userId);
  // Check for an idempotent replay before resolving the target: once a
  // regenerate/retry commits, the attempt it superseded is deleted, so a
  // duplicate request for the *same new* generationId must not re-resolve
  // a target that may no longer exist.
  const existingRun = await ChatRepository.getGenerationRun(
    db,
    input.chatId,
    input.generationId,
    input.userId,
  );
  if (existingRun) {
    return replay({
      generationId: input.generationId,
      ownerUserId: input.userId,
      terminal: true,
    });
  }
  if ('messageId' in input) {
    const target = await ChatRepository.getMessageById(db, input.chatId, input.messageId);
    if (!target || (target.role !== 'assistant' && target.role !== 'user')) {
      throw new ChatGenerationInputError('Only a user or assistant message can be regenerated');
    }
    // An edited user message has no reply to supersede yet — generate a
    // fresh one directly for it.
    if (target.role === 'user') {
      return redoGeneration(dependencies, {
        userId: input.userId,
        chatId: input.chatId,
        generationId: input.generationId,
        userMessageId: target.id,
        staleGenerationId: null,
        staleAssistantMessageId: null,
        responseLength: input.responseLength,
      });
    }
    if (!target.parentMessageId) {
      throw new ChatGenerationInputError('No prior message to regenerate a reply from');
    }
    const staleRun = await ChatRepository.getGenerationRunByAssistantMessageId(
      db,
      input.chatId,
      target.id,
      input.userId,
    );
    return redoGeneration(dependencies, {
      userId: input.userId,
      chatId: input.chatId,
      generationId: input.generationId,
      userMessageId: target.parentMessageId,
      staleGenerationId: staleRun?.id ?? null,
      staleAssistantMessageId: target.id,
      responseLength: input.responseLength,
    });
  }

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
  return redoGeneration(dependencies, {
    userId: input.userId,
    chatId: input.chatId,
    generationId: input.generationId,
    userMessageId: failedRun.userMessageId,
    staleGenerationId: failedRun.id,
    staleAssistantMessageId: null,
    responseLength: input.responseLength,
  });
}

export async function startMessage(
  dependencies: ChatGenerationDependencies,
  input: StartMessageInput,
): Promise<AsyncIterable<GenerationEvent>> {
  const existingRun = await ChatRepository.getGenerationRunById(
    db,
    input.generationId,
    input.userId,
  );
  if (existingRun) {
    return replay({
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
  const toolPlan = await planTools(dependencies, messages);
  return start(dependencies, {
    userId: input.userId,
    generationId: input.generationId,
    chatId: created.chat.id,
    model: CHAT_MODEL,
    messages,
    tools: toolPlan.tools,
    requiresToolCall: toolPlan.requiresLookup,
    maxTokens: input.responseLength ? RESPONSE_LENGTH_MAX_TOKENS[input.responseLength] : undefined,
    reasoning: getReasoningConfig(),
    userMessageId: created.userMessageId,
  });
}

export async function sendMessage(
  dependencies: ChatGenerationDependencies,
  input: SendMessageInput,
): Promise<AsyncIterable<GenerationEvent>> {
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
    return replay({
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
  const toolPlan = await planTools(dependencies, messages);
  return send(dependencies, {
    userId: input.userId,
    generationId: input.generationId,
    chatId: input.chatId,
    model: CHAT_MODEL,
    messages,
    tools: toolPlan.tools,
    requiresToolCall: toolPlan.requiresLookup,
    maxTokens: input.responseLength ? RESPONSE_LENGTH_MAX_TOKENS[input.responseLength] : undefined,
    reasoning: getReasoningConfig(),
    userMessageId,
    responseModality: input.responseModality,
  });
}

// Shared by regenerate's two branches: rerun the LLM against the same chat
// history and land a brand-new generation for the same user message.
async function redoGeneration(
  dependencies: ChatGenerationDependencies,
  input: {
    userId: string;
    chatId: string;
    generationId: string;
    userMessageId: string;
    staleGenerationId: string | null;
    staleAssistantMessageId: string | null;
    responseLength?: 'short' | 'medium' | 'long';
  },
): Promise<AsyncIterable<GenerationEvent>> {
  await assertUnderMonthlyUsageLimit(input.userId);
  const [history, notes] = await Promise.all([
    ChatRepository.getMessages(db, input.chatId, 30, 0),
    ChatRepository.getChatSourceContext(db, input.chatId),
  ]);
  const userMessageIndex = history.findIndex((message) => message.id === input.userMessageId);
  const userMessage = history[userMessageIndex];
  if (!userMessage || userMessage.role !== 'user') {
    throw new ChatGenerationInputError('The message being answered was not found');
  }
  await ChatRepository.createGenerationRun(db, {
    id: input.generationId,
    chatId: input.chatId,
    ownerUserId: input.userId,
    kind: 'send',
    userMessageId: input.userMessageId,
  });
  const messages = buildMessages(
    history.slice(0, userMessageIndex),
    formatUserContentWithContext(userMessage.content, notes, userMessage.files ?? []),
    buildChatSystemPrompt(input.responseLength),
  );
  const toolPlan = await planTools(dependencies, messages);
  return send(dependencies, {
    userId: input.userId,
    generationId: input.generationId,
    chatId: input.chatId,
    model: CHAT_MODEL,
    messages,
    tools: toolPlan.tools,
    requiresToolCall: toolPlan.requiresLookup,
    maxTokens: input.responseLength ? RESPONSE_LENGTH_MAX_TOKENS[input.responseLength] : undefined,
    reasoning: getReasoningConfig(),
    userMessageId: input.userMessageId,
    staleGenerationId: input.staleGenerationId,
    staleAssistantMessageId: input.staleAssistantMessageId,
  });
}

export async function respondToConfirmation(
  dependencies: ChatGenerationDependencies,
  input: ConfirmationMessageInput,
): Promise<AsyncIterable<GenerationEvent>> {
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
  const priorHistory = pendingMessageIndex === -1 ? history : history.slice(0, pendingMessageIndex);
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
  const toolPlan = await planTools(dependencies, messages);
  const events = await ChatGenerationRepository.listEvents(db, run.id, input.userId, 0);
  const initialState = {
    ...restoreGenerationState(run.id, events.map(toHistoryEvent)),
    // The checkpoint contains the approval prompt. A resumed generation
    // must start a fresh assistant body so that prompt text is not appended
    // to the post-approval response.
    assistantText: '',
    reasoningText: '',
  };
  return execute(dependencies, {
    userId: input.userId,
    generationId: run.id,
    chatId: chat.id,
    model: CHAT_MODEL,
    messages,
    tools: toolPlan.tools,
    requiresToolCall: toolPlan.requiresLookup,
    maxTokens: input.responseLength ? RESPONSE_LENGTH_MAX_TOKENS[input.responseLength] : undefined,
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
