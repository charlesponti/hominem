import {
  chatGenerationKindSchema,
  chatMessageFilesSchema,
  chatMessageToolCallsSchema,
  generationPhaseSchema,
  type ChatGenerationKind,
  type ChatMessageFileRecord,
  type ChatMessageSnapshot,
  type ChatMessageToolCallRecord,
  type ChatSnapshot,
  type GenerationPhase,
} from '@hominem/chat';
import type { Selectable } from 'kysely';
import { z, type ZodType } from 'zod';

import { sql } from '../../db';
import { NotFoundError, ValidationError } from '../../errors';
import type { DbHandle } from '../../transaction';
import type { AppChatGenerationRuns, AppChatMessages, AppChats } from '../../types/database';
import { ChatGenerationRepository } from './chat-generation.repository';

export type { ChatMessageFileRecord, ChatMessageToolCallRecord } from '@hominem/chat';

type ChatRow = Selectable<AppChats>;
type ChatMessageRow = Selectable<AppChatMessages>;
type ChatGenerationRunRow = Selectable<AppChatGenerationRuns>;

export interface ChatPage {
  chats: ChatSnapshot[];
  nextCursor: string | null;
}

type ChatListCursor = { id: string; lastMessageAt: string };
const chatListCursorSchema = z.object({
  id: z.string().min(1),
  lastMessageAt: z.string().datetime(),
});

export interface ChatSourceRecord {
  id: string;
  chatId: string;
  noteId: string;
  title: string | null;
  addedByUserId: string | null;
  createdAt: string;
}

export interface DeleteChatMessagesResult {
  deletedMessageIds: string[];
  cleanupFileIds: string[];
}

export interface UpdateMessageResult {
  message: ChatMessageSnapshot;
  deletedMessageIds: string[];
  cleanupFileIds: string[];
}

export interface InsertChatMessageInput {
  chatId: string;
  authorUserId: string;
  role: ChatMessageSnapshot['role'];
  content: string;
  files?: unknown[] | null;
  reasoning?: string | null;
  toolCalls?: unknown[] | null;
  parentMessageId?: string | null;
}

export type { ChatGenerationKind, GenerationPhase } from '@hominem/chat';

export interface ChatGenerationRunRecord {
  id: string;
  chatId: string;
  ownerUserId: string;
  kind: ChatGenerationKind;
  status: GenerationPhase;
  userMessageId: string | null;
  targetAssistantMessageId: string | null;
  assistantMessageId: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateChatGenerationRunInput {
  id: string;
  chatId: string;
  ownerUserId: string;
  kind: ChatGenerationKind;
  userMessageId?: string | null;
  targetAssistantMessageId?: string | null;
}

function toChatRecord(row: ChatRow): ChatSnapshot {
  return {
    id: row.id,
    userId: row.ownerUserid,
    title: row.title,
    archivedAt: row.archivedAt ? new Date(row.archivedAt).toISOString() : null,
    createdAt: new Date(row.createdat).toISOString(),
    updatedAt: new Date(row.updatedat).toISOString(),
  };
}

function parseChatMessageJson<T>(
  value: unknown,
  schema: ZodType<T>,
  messageId: string,
  field: 'files' | 'toolCalls',
): T {
  const result = schema.safeParse(value);
  if (result.success) return result.data;

  throw new ValidationError(`Invalid chat message ${field}`, {
    messageId,
    field,
    issues: result.error.issues.map(({ path, message }) => ({ path, message })),
  });
}

function parseChatMessageFiles(value: unknown, messageId: string): ChatMessageFileRecord[] | null {
  return parseChatMessageJson(value, chatMessageFilesSchema, messageId, 'files');
}

function parseChatMessageToolCalls(
  value: unknown,
  messageId: string,
): ChatMessageToolCallRecord[] | null {
  return parseChatMessageJson(value, chatMessageToolCallsSchema, messageId, 'toolCalls');
}

function decodeChatListCursor(cursor: string): ChatListCursor {
  try {
    return chatListCursorSchema.parse(
      JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')),
    );
  } catch {
    throw new ValidationError('Invalid chat cursor');
  }
}

function encodeChatListCursor(row: ChatRow): string {
  return Buffer.from(
    JSON.stringify({
      id: row.id,
      lastMessageAt: new Date(row.lastMessageAt).toISOString(),
    }),
  ).toString('base64url');
}

function toChatMessageRecord(row: ChatMessageRow): ChatMessageSnapshot {
  return {
    id: row.id,
    chatId: row.chatId,
    userId:
      row.authorUserid ??
      (() => {
        throw new ValidationError('Invalid chat message owner', { messageId: row.id });
      })(),
    role: z.enum(['system', 'user', 'assistant', 'tool']).parse(row.role),
    content: row.content,
    files: parseChatMessageFiles(row.files, row.id),
    toolCalls: parseChatMessageToolCalls(row.toolCalls, row.id),
    reasoning: row.reasoning ?? null,
    parentMessageId: row.parentMessageId,
    createdAt: new Date(row.createdat).toISOString(),
    updatedAt: new Date(row.updatedat).toISOString(),
  };
}

function toChatSourceRecord(
  row: {
    id: string;
    chatId: string;
    noteId: string;
    addedByUserid: string | null;
    createdAt: string | Date;
  },
  title: string | null,
): ChatSourceRecord {
  return {
    id: row.id,
    chatId: row.chatId,
    noteId: row.noteId,
    title,
    addedByUserId: row.addedByUserid,
    createdAt: new Date(row.createdAt).toISOString(),
  };
}

function toChatGenerationRunRecord(row: ChatGenerationRunRow): ChatGenerationRunRecord {
  return {
    id: row.id,
    chatId: row.chatId,
    ownerUserId: row.ownerUserId,
    kind: chatGenerationKindSchema.parse(row.kind),
    status: generationPhaseSchema.parse(row.status),
    userMessageId: row.userMessageId,
    targetAssistantMessageId: row.targetAssistantMessageId,
    assistantMessageId: row.assistantMessageId,
    errorMessage: row.errorMessage,
    createdAt: new Date(row.createdAt).toISOString(),
    updatedAt: new Date(row.updatedAt).toISOString(),
  };
}

function toJsonColumnValue(value: readonly unknown[] | null | undefined): string | null {
  return value ? JSON.stringify(value) : null;
}

// Deletes the given messages (and their generation runs), returning the ids
// deleted plus any audio file ids that need queue-based cleanup. Shared by
// message delete (deletes the target + following) and message edit (deletes
// only the following messages, keeping the edited target).
async function deleteMessages(
  handle: DbHandle,
  chatId: string,
  messages: { id: string; files: unknown }[],
): Promise<DeleteChatMessagesResult> {
  const cleanupFileIdsSet = new Set<string>();
  for (const message of messages) {
    for (const file of parseChatMessageFiles(message.files, message.id) ?? []) {
      if (file.type === 'audio' && file.fileId) {
        cleanupFileIdsSet.add(file.fileId);
      }
    }
  }
  const cleanupFileIds = [...cleanupFileIdsSet];
  const deletedMessageIds = messages.map((message) => message.id);

  if (deletedMessageIds.length > 0) {
    await ChatGenerationRepository.deleteByMessageIds(handle, {
      chatId,
      messageIds: deletedMessageIds,
    });

    await handle
      .deleteFrom('app.chatMessages')
      .where('chatId', '=', chatId)
      .where('id', 'in', deletedMessageIds)
      .execute();
  }

  return { deletedMessageIds, cleanupFileIds };
}

export const ChatRepository = {
  async getGenerationRun(
    handle: DbHandle,
    chatId: string,
    generationId: string,
    ownerUserId: string,
  ): Promise<ChatGenerationRunRecord | null> {
    const row = await handle
      .selectFrom('app.chatGenerationRuns')
      .selectAll()
      .where('id', '=', generationId)
      .where('chatId', '=', chatId)
      .where('ownerUserId', '=', ownerUserId)
      .executeTakeFirst();

    return row ? toChatGenerationRunRecord(row) : null;
  },

  // Looks up by id alone since it's globally unique — needed by
  // /start-stream, which doesn't have a chatId yet when it checks for a
  // retried generationId.
  async getGenerationRunById(
    handle: DbHandle,
    generationId: string,
    ownerUserId: string,
  ): Promise<ChatGenerationRunRecord | null> {
    const row = await handle
      .selectFrom('app.chatGenerationRuns')
      .selectAll()
      .where('id', '=', generationId)
      .where('ownerUserId', '=', ownerUserId)
      .executeTakeFirst();

    return row ? toChatGenerationRunRecord(row) : null;
  },

  async getAwaitingGenerationRunForAssistantMessage(
    handle: DbHandle,
    chatId: string,
    assistantMessageId: string,
    ownerUserId: string,
  ): Promise<ChatGenerationRunRecord | null> {
    const row = await handle
      .selectFrom('app.chatGenerationRuns')
      .selectAll()
      .where('chatId', '=', chatId)
      .where('assistantMessageId', '=', assistantMessageId)
      .where('ownerUserId', '=', ownerUserId)
      .where('status', '=', 'awaiting_confirmation')
      .executeTakeFirst();

    return row ? toChatGenerationRunRecord(row) : null;
  },

  // Used by regenerate to find the run that produced the message being
  // redone, so its event history can be deleted once the new one commits.
  async getGenerationRunByAssistantMessageId(
    handle: DbHandle,
    chatId: string,
    assistantMessageId: string,
    ownerUserId: string,
  ): Promise<ChatGenerationRunRecord | null> {
    const row = await handle
      .selectFrom('app.chatGenerationRuns')
      .selectAll()
      .where('chatId', '=', chatId)
      .where('assistantMessageId', '=', assistantMessageId)
      .where('ownerUserId', '=', ownerUserId)
      .executeTakeFirst();

    return row ? toChatGenerationRunRecord(row) : null;
  },

  async createGenerationRun(
    handle: DbHandle,
    input: CreateChatGenerationRunInput,
  ): Promise<ChatGenerationRunRecord> {
    const row = await handle
      .insertInto('app.chatGenerationRuns')
      .values({
        id: input.id,
        chatId: input.chatId,
        ownerUserId: input.ownerUserId,
        kind: input.kind,
        status: 'preparing',
        userMessageId: input.userMessageId ?? null,
        targetAssistantMessageId: input.targetAssistantMessageId ?? null,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    return toChatGenerationRunRecord(row);
  },

  async updateGenerationRun(
    handle: DbHandle,
    input: {
      id: string;
      ownerUserId: string;
      status: GenerationPhase;
      assistantMessageId?: string | null;
      errorMessage?: string | null;
    },
  ): Promise<ChatGenerationRunRecord | null> {
    const row = await handle
      .updateTable('app.chatGenerationRuns')
      .set({
        status: input.status,
        assistantMessageId: input.assistantMessageId,
        errorMessage: input.errorMessage,
      })
      .where('id', '=', input.id)
      .where('ownerUserId', '=', input.ownerUserId)
      .returningAll()
      .executeTakeFirst();

    return row ? toChatGenerationRunRecord(row) : null;
  },

  async cancelGenerationRun(
    handle: DbHandle,
    generationId: string,
    ownerUserId: string,
  ): Promise<ChatGenerationRunRecord | null> {
    const row = await handle
      .updateTable('app.chatGenerationRuns')
      .set({ status: 'cancelled' })
      .where('id', '=', generationId)
      .where('ownerUserId', '=', ownerUserId)
      .where('status', 'in', ['preparing', 'saving'])
      .returningAll()
      .executeTakeFirst();

    return row ? toChatGenerationRunRecord(row) : null;
  },

  async getOwnedOrThrow(handle: DbHandle, chatId: string, userId: string): Promise<ChatSnapshot> {
    const chat = await handle
      .selectFrom('app.chats')
      .selectAll()
      .where('id', '=', chatId)
      .where('ownerUserid', '=', userId)
      .executeTakeFirst();

    if (!chat) {
      throw new NotFoundError('Chat', { chatId });
    }

    return toChatRecord(chat);
  },

  async listForUser(
    handle: DbHandle,
    userId: string,
    options: { cursor?: string; includeArchived?: boolean; limit?: number } = {},
  ): Promise<ChatPage> {
    const limit = options.limit ?? 50;
    const cursor = options.cursor ? decodeChatListCursor(options.cursor) : null;
    let query = handle.selectFrom('app.chats').selectAll().where('ownerUserid', '=', userId);

    if (!options.includeArchived) {
      query = query.where('archivedAt', 'is', null);
    }

    if (cursor) {
      query = query.where((eb) =>
        eb.or([
          eb('lastMessageAt', '<', cursor.lastMessageAt),
          eb.and([eb('lastMessageAt', '=', cursor.lastMessageAt), eb('id', '<', cursor.id)]),
        ]),
      );
    }

    const chats = await query
      .orderBy('lastMessageAt', 'desc')
      .orderBy('id', 'desc')
      .limit(limit + 1)
      .execute();

    const page = chats.slice(0, limit);
    const finalChat = page.at(-1);
    return {
      chats: page.map(toChatRecord),
      nextCursor: chats.length > limit && finalChat ? encodeChatListCursor(finalChat) : null,
    };
  },

  async create(
    handle: DbHandle,
    input: { userId: string; title: string; archivedAt?: string | null },
  ): Promise<ChatSnapshot> {
    const chat = await handle
      .insertInto('app.chats')
      .values({
        ownerUserid: input.userId,
        title: input.title,
        archivedAt: input.archivedAt ?? null,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    return toChatRecord(chat);
  },

  // Scoped by ownerUserid in the same statement, so this both mutates and
  // enforces ownership in one round trip — callers should not do a separate
  // getOwnedOrThrow first. Throws NotFoundError explicitly (rather than
  // relying on kysely's default executeTakeFirstOrThrow) so a missing/
  // unowned chat maps to the same 404 that getOwnedOrThrow would have.
  async updateTitle(
    handle: DbHandle,
    chatId: string,
    userId: string,
    title: string,
  ): Promise<void> {
    const result = await handle
      .updateTable('app.chats')
      .set({ title, updatedat: new Date().toISOString() })
      .where('id', '=', chatId)
      .where('ownerUserid', '=', userId)
      .executeTakeFirst();

    if ((result.numUpdatedRows ?? 0n) === 0n) {
      throw new NotFoundError('Chat', { chatId });
    }
  },

  // See updateTitle's note on scoping + explicit NotFoundError.
  async archive(handle: DbHandle, chatId: string, userId: string): Promise<ChatSnapshot> {
    const archived = await handle
      .updateTable('app.chats')
      .set({
        archivedAt: new Date().toISOString(),
        updatedat: new Date().toISOString(),
      })
      .where('id', '=', chatId)
      .where('ownerUserid', '=', userId)
      .returningAll()
      .executeTakeFirst();

    if (!archived) {
      throw new NotFoundError('Chat', { chatId });
    }

    return toChatRecord(archived);
  },

  // Only the author can edit their own message, and only user messages are editable.
  // Editing truncates the conversation: everything after the edited message is
  // deleted, since it was generated in response to the now-stale content.
  async updateMessage(
    handle: DbHandle,
    chatId: string,
    messageId: string,
    userId: string,
    content: string,
  ): Promise<UpdateMessageResult> {
    const existing = await handle
      .selectFrom('app.chatMessages')
      .selectAll()
      .where('id', '=', messageId)
      .where('chatId', '=', chatId)
      .where('authorUserid', '=', userId)
      .executeTakeFirst();

    if (!existing || existing.role !== 'user') {
      throw new NotFoundError('ChatMessage', { chatId, messageId });
    }

    const updated = await handle
      .updateTable('app.chatMessages')
      .set({ content, updatedat: new Date().toISOString() })
      .where('id', '=', messageId)
      .where('chatId', '=', chatId)
      .where('authorUserid', '=', userId)
      .returningAll()
      .executeTakeFirstOrThrow();

    const following = await handle
      .selectFrom('app.chatMessages')
      .select(['id', 'files'])
      .where('chatId', '=', chatId)
      .where((eb) =>
        eb.or([
          eb('createdat', '>', existing.createdat),
          eb.and([eb('createdat', '=', existing.createdat), eb('id', '>', existing.id)]),
        ]),
      )
      .execute();

    const { deletedMessageIds, cleanupFileIds } = await deleteMessages(handle, chatId, following);

    return { message: toChatMessageRecord(updated), deletedMessageIds, cleanupFileIds };
  },

  async deleteUserMessageAndFollowing(
    handle: DbHandle,
    chatId: string,
    messageId: string,
    userId: string,
  ): Promise<DeleteChatMessagesResult> {
    const target = await handle
      .selectFrom('app.chatMessages')
      .select(['id', 'createdat', 'role', 'authorUserid'])
      .where('id', '=', messageId)
      .where('chatId', '=', chatId)
      .where('authorUserid', '=', userId)
      .executeTakeFirst();

    if (!target || target.role !== 'user') {
      throw new NotFoundError('ChatMessage', { chatId, messageId });
    }

    const messages = await handle
      .selectFrom('app.chatMessages')
      .select(['id', 'files'])
      .where('chatId', '=', chatId)
      .where((eb) =>
        eb.or([
          eb('createdat', '>', target.createdat),
          eb.and([eb('createdat', '=', target.createdat), eb('id', '>=', target.id)]),
        ]),
      )
      .execute();

    return deleteMessages(handle, chatId, messages);
  },

  async getMessageById(
    handle: DbHandle,
    chatId: string,
    messageId: string,
  ): Promise<ChatMessageSnapshot | undefined> {
    const row = await handle
      .selectFrom('app.chatMessages')
      .selectAll()
      .where('id', '=', messageId)
      .where('chatId', '=', chatId)
      .executeTakeFirst();

    if (!row) return undefined;

    return toChatMessageRecord(row);
  },

  // Used by regenerate's user-message target: it must have nothing after it
  // (its edit already deleted any stale reply) — otherwise regenerating
  // would branch off a new assistant reply instead of superseding the
  // existing one.
  async hasMessagesAfter(handle: DbHandle, chatId: string, messageId: string): Promise<boolean> {
    const target = await handle
      .selectFrom('app.chatMessages')
      .select(['createdat'])
      .where('id', '=', messageId)
      .where('chatId', '=', chatId)
      .executeTakeFirst();
    if (!target) return false;

    const next = await handle
      .selectFrom('app.chatMessages')
      .select(['id'])
      .where('chatId', '=', chatId)
      .where((eb) =>
        eb.or([
          eb('createdat', '>', target.createdat),
          eb.and([eb('createdat', '=', target.createdat), eb('id', '>', messageId)]),
        ]),
      )
      .executeTakeFirst();

    return next !== undefined;
  },

  // Updates lifecycle fields for one entry inside a message's toolCalls array.
  // Throws if the message or tool call can't be found.
  async updateToolCallLifecycle(
    handle: DbHandle,
    chatId: string,
    messageId: string,
    toolCallId: string,
    lifecycle: Pick<ChatMessageToolCallRecord, 'confirmationStatus' | 'executionStatus'>,
  ): Promise<ChatMessageSnapshot> {
    const row = await handle
      .selectFrom('app.chatMessages')
      .selectAll()
      .where('id', '=', messageId)
      .where('chatId', '=', chatId)
      .executeTakeFirst();

    if (!row) {
      throw new NotFoundError('ChatMessage', { chatId, messageId });
    }

    const toolCalls = parseChatMessageToolCalls(row.toolCalls, row.id) ?? [];
    const index = toolCalls.findIndex((call) => call.toolCallId === toolCallId);
    if (index === -1) {
      throw new NotFoundError('ChatMessageToolCall', { chatId, messageId, toolCallId });
    }
    toolCalls[index] = { ...toolCalls[index]!, ...lifecycle };

    const updated = await handle
      .updateTable('app.chatMessages')
      .set({ toolCalls: toJsonColumnValue(toolCalls), updatedat: new Date().toISOString() })
      .where('id', '=', messageId)
      .where('chatId', '=', chatId)
      .returningAll()
      .executeTakeFirst();

    if (!updated) {
      throw new NotFoundError('ChatMessage', { chatId, messageId });
    }

    return toChatMessageRecord(updated);
  },

  // Used to delete a superseded assistant reply once its regenerated
  // replacement has committed.
  async deleteAssistantMessage(handle: DbHandle, chatId: string, messageId: string): Promise<void> {
    await handle
      .deleteFrom('app.chatMessages')
      .where('id', '=', messageId)
      .where('chatId', '=', chatId)
      .where('role', '=', 'assistant')
      .execute();
  },

  // Used to resume a checkpointed generation after tool-call confirmation —
  // it must overwrite its own placeholder message rather than insert a new
  // one. Clears any attached audio file since it won't match the new text.
  async replaceAssistantMessageContent(
    handle: DbHandle,
    chatId: string,
    messageId: string,
    content: string,
    options?: {
      reasoning?: string | null;
      toolCalls?: ChatMessageToolCallRecord[] | null;
      files?: ChatMessageFileRecord[] | null;
    },
  ): Promise<ChatMessageSnapshot> {
    const updated = await handle
      .updateTable('app.chatMessages')
      .set({
        content,
        files: options?.files === undefined ? null : toJsonColumnValue(options.files),
        reasoning: options?.reasoning ?? null,
        toolCalls: toJsonColumnValue(options?.toolCalls ?? null),
        updatedat: new Date().toISOString(),
      })
      .where('id', '=', messageId)
      .where('chatId', '=', chatId)
      .where('role', '=', 'assistant')
      .returningAll()
      .executeTakeFirst();

    if (!updated) {
      throw new NotFoundError('ChatMessage', { chatId, messageId });
    }

    return toChatMessageRecord(updated);
  },

  async touchLastMessage(handle: DbHandle, chatId: string): Promise<void> {
    await handle
      .updateTable('app.chats')
      .set({ lastMessageAt: sql<string>`GREATEST(last_message_at, CURRENT_TIMESTAMP)` })
      .where('id', '=', chatId)
      .execute();
  },

  // Paginates backward from the newest message: offset=0 gets the latest
  // `limit` messages, offset=limit gets the `limit` before those, and so on.
  // To load older history, just bump offset up.
  async getMessages(
    handle: DbHandle,
    chatId: string,
    limit = 100,
    offset = 0,
  ): Promise<ChatMessageSnapshot[]> {
    const messages = await handle
      .selectFrom('app.chatMessages')
      .selectAll()
      .where('chatId', '=', chatId)
      .orderBy('createdat', 'desc')
      .limit(limit)
      .offset(offset)
      .execute();
    messages.reverse();

    return messages.map(toChatMessageRecord);
  },

  async searchMessages(
    handle: DbHandle,
    chatId: string,
    query: string,
    limit = 50,
  ): Promise<ChatMessageSnapshot[]> {
    const escapedQuery = query.trim().replace(/[\\%_]/g, '\\$&');
    const messages = await handle
      .selectFrom('app.chatMessages')
      .selectAll()
      .where('chatId', '=', chatId)
      .where('role', '!=', 'tool')
      .where('content', 'ilike', `%${escapedQuery}%`)
      .orderBy('createdat', 'asc')
      .limit(limit)
      .execute();

    return messages.map(toChatMessageRecord);
  },

  // `.returningAll()` already gives every column toChatMessageRecord needs,
  // so this maps in-process instead of making the caller re-SELECT the row
  // it just inserted to get a properly-typed record.
  async insertMessage(
    handle: DbHandle,
    input: InsertChatMessageInput,
  ): Promise<ChatMessageSnapshot> {
    const inserted = await handle
      .insertInto('app.chatMessages')
      .values({
        chatId: input.chatId,
        authorUserid: input.authorUserId,
        role: input.role,
        content: input.content,
        files: toJsonColumnValue(input.files),
        reasoning: input.reasoning ?? null,
        toolCalls: toJsonColumnValue(input.toolCalls),
        parentMessageId: input.parentMessageId ?? null,
      })
      .returningAll()
      .executeTakeFirstOrThrow();
    return toChatMessageRecord(inserted);
  },

  // Idempotent — attaching a note that's already attached is a no-op, not an error
  async addChatSource(
    handle: DbHandle,
    chatId: string,
    noteId: string,
    userId: string,
  ): Promise<ChatSourceRecord> {
    const note = await handle
      .selectFrom('app.notes')
      .select(['id', 'title'])
      .where('id', '=', noteId)
      .where('ownerUserid', '=', userId)
      .executeTakeFirst();

    if (!note) {
      throw new ValidationError('Referenced note is unavailable');
    }

    await handle
      .insertInto('app.chatSources')
      .values({ chatId, noteId, addedByUserid: userId })
      .onConflict((oc) => oc.columns(['chatId', 'noteId']).doNothing())
      .execute();

    const row = await handle
      .selectFrom('app.chatSources')
      .selectAll()
      .where('chatId', '=', chatId)
      .where('noteId', '=', noteId)
      .executeTakeFirstOrThrow();

    return toChatSourceRecord(row, note.title);
  },

  async removeChatSource(handle: DbHandle, chatId: string, noteId: string): Promise<boolean> {
    const result = await handle
      .deleteFrom('app.chatSources')
      .where('chatId', '=', chatId)
      .where('noteId', '=', noteId)
      .executeTakeFirst();

    return (result.numDeletedRows ?? 0n) > 0n;
  },

  async listChatSources(handle: DbHandle, chatId: string): Promise<ChatSourceRecord[]> {
    const rows = await handle
      .selectFrom('app.chatSources as source')
      .innerJoin('app.notes as note', 'note.id', 'source.noteId')
      .select([
        'source.id',
        'source.chatId',
        'source.noteId',
        'note.title',
        'source.addedByUserid',
        'source.createdAt',
      ])
      .where('source.chatId', '=', chatId)
      .orderBy('source.createdAt', 'desc')
      .execute();

    return rows.map((row) => toChatSourceRecord(row, row.title));
  },

  // Pulls full note content + attached files for every note on this chat — read once per generation turn
  async getChatSourceContext(handle: DbHandle, chatId: string): Promise<NoteContext[]> {
    const notes = await handle
      .selectFrom('app.chatSources as source')
      .innerJoin('app.notes as note', 'note.id', 'source.noteId')
      .select(['note.id', 'note.title', 'note.content', 'note.excerpt'])
      .where('source.chatId', '=', chatId)
      .execute();

    if (notes.length === 0) {
      return [];
    }

    const notesById = new Map<string, NoteContext>(
      notes.map((note) => [
        note.id,
        { id: note.id, title: note.title, content: note.content, excerpt: note.excerpt, files: [] },
      ]),
    );

    const files = await handle
      .selectFrom('app.noteFiles as noteFile')
      .innerJoin('app.files as file', 'file.id', 'noteFile.fileId')
      .select([
        'noteFile.noteId as noteId',
        'file.id',
        'file.originalName',
        'file.content',
        'file.textContent',
      ])
      .where(
        'noteFile.noteId',
        'in',
        notes.map((note) => note.id),
      )
      .execute();

    for (const file of files) {
      const note = notesById.get(file.noteId);
      if (!note) continue;
      note.files.push({
        id: file.id,
        originalName: file.originalName,
        content: file.content,
        textContent: file.textContent,
      });
    }

    return [...notesById.values()];
  },

  async resolveChatFiles(
    handle: DbHandle,
    userId: string,
    fileIds: string[],
  ): Promise<ChatMessageFileRecord[]> {
    if (fileIds.length === 0) {
      return [];
    }

    const uniqueIds = [...new Set(fileIds)];
    const files = await handle
      .selectFrom('app.files')
      .selectAll()
      .where('ownerUserid', '=', userId)
      .where('id', 'in', uniqueIds)
      .execute();

    if (files.length !== uniqueIds.length) {
      throw new ValidationError('One or more uploaded files are unavailable');
    }

    return files.map(
      (file): ChatMessageFileRecord => ({
        type: file.mimetype.startsWith('image/') ? 'image' : 'file',
        fileId: file.id,
        url: file.url,
        filename: file.originalName,
        mimeType: file.mimetype,
        size: file.size,
        ...(file.textContent
          ? { metadata: { extractedText: file.textContent.slice(0, 4_000) } }
          : {}),
      }),
    );
  },
};

export interface NoteContext {
  id: string;
  title: string | null;
  content: string;
  excerpt: string | null;
  files: Array<{
    id: string;
    originalName: string;
    content: string | null;
    textContent: string | null;
  }>;
}
