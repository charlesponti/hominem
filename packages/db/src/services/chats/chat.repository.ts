import type { Selectable } from 'kysely';

import { NotFoundError, ValidationError } from '../../errors';
import {
  parseChatMessageFiles,
  parseChatMessageToolCalls,
  type ChatMessageFileRecord,
  type ChatMessageToolCallRecord,
} from '../../guards';
import type { DbHandle } from '../../transaction';
import type {
  AppChatGenerationRuns,
  AppChatMessages,
  AppChatSources,
  AppChats,
} from '../../types/database';

export type { ChatMessageFileRecord, ChatMessageToolCallRecord } from '../../guards';

type ChatRow = Selectable<AppChats>;
type ChatMessageRow = Selectable<AppChatMessages>;
type ChatGenerationRunRow = Selectable<AppChatGenerationRuns>;
type ChatSourceRow = Selectable<AppChatSources>;

export interface ChatRecord {
  id: string;
  userId: string;
  title: string;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ChatPage {
  chats: ChatRecord[];
  nextCursor: string | null;
}

type ChatListCursor = { id: string; lastMessageAt: string };

export type ChatMessageRole = 'system' | 'user' | 'assistant' | 'tool';

export interface ChatMessageRecord {
  id: string;
  chatId: string;
  userId: string;
  role: ChatMessageRole;
  content: string;
  files: ChatMessageFileRecord[] | null;
  toolCalls: ChatMessageToolCallRecord[] | null;
  reasoning: string | null;
  parentMessageId: string | null;
  createdAt: string;
  updatedAt: string;
}

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

export interface InsertChatMessageInput {
  chatId: string;
  authorUserId: string;
  role: ChatMessageRole;
  content: string;
  files?: unknown[] | null;
  reasoning?: string | null;
  toolCalls?: unknown[] | null;
  parentMessageId?: string | null;
}

export type ChatGenerationKind = 'send' | 'start' | 'regenerate';
export type ChatGenerationStatus = 'preparing' | 'saving' | 'committed' | 'cancelled' | 'failed';

export interface ChatGenerationRunRecord {
  id: string;
  chatId: string;
  ownerUserId: string;
  kind: ChatGenerationKind;
  status: ChatGenerationStatus;
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

function toChatRecord(row: ChatRow): ChatRecord {
  return {
    id: row.id,
    userId: row.ownerUserid,
    title: row.title,
    archivedAt: row.archivedAt ? new Date(row.archivedAt).toISOString() : null,
    createdAt: new Date(row.createdat).toISOString(),
    updatedAt: new Date(row.updatedat).toISOString(),
  };
}

function decodeChatListCursor(cursor: string): ChatListCursor {
  try {
    const value = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) as ChatListCursor;
    if (!value.id || !value.lastMessageAt || Number.isNaN(Date.parse(value.lastMessageAt))) {
      throw new Error('Invalid cursor');
    }
    return value;
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

function toChatMessageRecord(row: ChatMessageRow): ChatMessageRecord {
  return {
    id: row.id,
    chatId: row.chatId,
    userId: row.authorUserid ?? '',
    role: row.role as ChatMessageRole,
    content: row.content,
    files: parseChatMessageFiles(row.files),
    toolCalls: parseChatMessageToolCalls(row.toolCalls),
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
    kind: row.kind as ChatGenerationKind,
    status: row.status as ChatGenerationStatus,
    userMessageId: row.userMessageId,
    targetAssistantMessageId: row.targetAssistantMessageId,
    assistantMessageId: row.assistantMessageId,
    errorMessage: row.errorMessage,
    createdAt: new Date(row.createdAt).toISOString(),
    updatedAt: new Date(row.updatedAt).toISOString(),
  };
}

function toJsonColumnValue(value: unknown[] | null | undefined): string | null {
  return value ? JSON.stringify(value) : null;
}

export const ChatRepository = {
  async getGenerationRun(
    handle: DbHandle,
    chatId: string,
    generationId: string,
    ownerUserId: string,
  ): Promise<ChatGenerationRunRecord | null> {
    const row = (await handle
      .selectFrom('app.chatGenerationRuns')
      .selectAll()
      .where('id', '=', generationId)
      .where('chatId', '=', chatId)
      .where('ownerUserId', '=', ownerUserId)
      .executeTakeFirst()) as ChatGenerationRunRow | undefined;

    return row ? toChatGenerationRunRecord(row) : null;
  },

  /**
   * Look up a generation run by id alone (no chatId) — `id` is the table's
   * primary key, globally unique. Used by `/start-stream`, which has no
   * chatId yet at the point it needs to detect a retried `generationId`.
   */
  async getGenerationRunById(
    handle: DbHandle,
    generationId: string,
    ownerUserId: string,
  ): Promise<ChatGenerationRunRecord | null> {
    const row = (await handle
      .selectFrom('app.chatGenerationRuns')
      .selectAll()
      .where('id', '=', generationId)
      .where('ownerUserId', '=', ownerUserId)
      .executeTakeFirst()) as ChatGenerationRunRow | undefined;

    return row ? toChatGenerationRunRecord(row) : null;
  },

  async createGenerationRun(
    handle: DbHandle,
    input: CreateChatGenerationRunInput,
  ): Promise<ChatGenerationRunRecord> {
    const row = (await handle
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
      .executeTakeFirstOrThrow()) as ChatGenerationRunRow;

    return toChatGenerationRunRecord(row);
  },

  async updateGenerationRun(
    handle: DbHandle,
    input: {
      id: string;
      ownerUserId: string;
      status: ChatGenerationStatus;
      assistantMessageId?: string | null;
      errorMessage?: string | null;
    },
  ): Promise<ChatGenerationRunRecord | null> {
    const row = (await handle
      .updateTable('app.chatGenerationRuns')
      .set({
        status: input.status,
        assistantMessageId: input.assistantMessageId,
        errorMessage: input.errorMessage,
      })
      .where('id', '=', input.id)
      .where('ownerUserId', '=', input.ownerUserId)
      .returningAll()
      .executeTakeFirst()) as ChatGenerationRunRow | undefined;

    return row ? toChatGenerationRunRecord(row) : null;
  },

  async cancelGenerationRun(
    handle: DbHandle,
    generationId: string,
    ownerUserId: string,
  ): Promise<ChatGenerationRunRecord | null> {
    const row = (await handle
      .updateTable('app.chatGenerationRuns')
      .set({ status: 'cancelled' })
      .where('id', '=', generationId)
      .where('ownerUserId', '=', ownerUserId)
      .where('status', 'in', ['preparing', 'saving'])
      .returningAll()
      .executeTakeFirst()) as ChatGenerationRunRow | undefined;

    return row ? toChatGenerationRunRecord(row) : null;
  },

  /**
   * Get a chat by ID with ownership enforcement. Throws if not found.
   */
  async getOwnedOrThrow(handle: DbHandle, chatId: string, userId: string): Promise<ChatRecord> {
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

  /**
   * List non-archived chats for a user, ordered by last message.
   */
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

    const chats = (await query
      .orderBy('lastMessageAt', 'desc')
      .orderBy('id', 'desc')
      .limit(limit + 1)
      .execute()) as ChatRow[];

    const page = chats.slice(0, limit);
    const finalChat = page.at(-1);
    return {
      chats: page.map(toChatRecord),
      nextCursor: chats.length > limit && finalChat ? encodeChatListCursor(finalChat) : null,
    };
  },

  /**
   * Create a new chat.
   */
  async create(
    handle: DbHandle,
    input: { userId: string; title: string; archivedAt?: string | null },
  ): Promise<ChatRecord> {
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

  /**
   * Update a chat's title.
   */
  async updateTitle(
    handle: DbHandle,
    chatId: string,
    userId: string,
    title: string,
  ): Promise<void> {
    await handle
      .updateTable('app.chats')
      .set({ title, updatedat: new Date().toISOString() })
      .where('id', '=', chatId)
      .where('ownerUserid', '=', userId)
      .executeTakeFirstOrThrow();
  },

  /**
   * Archive a chat.
   */
  async archive(handle: DbHandle, chatId: string, userId: string): Promise<ChatRecord> {
    const archived = await handle
      .updateTable('app.chats')
      .set({
        archivedAt: new Date().toISOString(),
        updatedat: new Date().toISOString(),
      })
      .where('id', '=', chatId)
      .where('ownerUserid', '=', userId)
      .returningAll()
      .executeTakeFirstOrThrow();

    return toChatRecord(archived);
  },

  /**
   * Update a user message's content. Only the message's author may edit it,
   * and only 'user' role messages are editable.
   */
  async updateMessageContent(
    handle: DbHandle,
    chatId: string,
    messageId: string,
    userId: string,
    content: string,
  ): Promise<ChatMessageRecord> {
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

    const updated = (await handle
      .updateTable('app.chatMessages')
      .set({ content, updatedat: new Date().toISOString() })
      .where('id', '=', messageId)
      .where('chatId', '=', chatId)
      .where('authorUserid', '=', userId)
      .returningAll()
      .executeTakeFirstOrThrow()) as ChatMessageRow;

    return toChatMessageRecord(updated);
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
      .where((expressionBuilder) =>
        expressionBuilder.or([
          expressionBuilder('createdat', '>', target.createdat),
          expressionBuilder.and([
            expressionBuilder('createdat', '=', target.createdat),
            expressionBuilder('id', '>=', target.id),
          ]),
        ]),
      )
      .execute();

    const cleanupFileIdsSet = new Set<string>();
    for (const message of messages) {
      for (const file of parseChatMessageFiles(message.files) ?? []) {
        if (file.type === 'audio' && file.fileId) {
          cleanupFileIdsSet.add(file.fileId);
        }
      }
    }
    const cleanupFileIds = [...cleanupFileIdsSet];
    const deletedMessageIds = messages.map((message) => message.id);

    if (deletedMessageIds.length > 0) {
      await handle
        .deleteFrom('app.chatGenerationRuns')
        .where('chatId', '=', chatId)
        .where((expressionBuilder) =>
          expressionBuilder.or([
            expressionBuilder('userMessageId', 'in', deletedMessageIds),
            expressionBuilder('targetAssistantMessageId', 'in', deletedMessageIds),
            expressionBuilder('assistantMessageId', 'in', deletedMessageIds),
          ]),
        )
        .execute();

      await handle
        .deleteFrom('app.chatMessages')
        .where('chatId', '=', chatId)
        .where('id', 'in', deletedMessageIds)
        .execute();
    }

    return { deletedMessageIds, cleanupFileIds };
  },

  /**
   * Fetch a single message by id.
   */
  async getMessageById(
    handle: DbHandle,
    chatId: string,
    messageId: string,
  ): Promise<ChatMessageRecord | undefined> {
    const row = (await handle
      .selectFrom('app.chatMessages')
      .selectAll()
      .where('id', '=', messageId)
      .where('chatId', '=', chatId)
      .executeTakeFirst()) as ChatMessageRow | undefined;

    if (!row) return undefined;

    return toChatMessageRecord(row);
  },

  /**
   * Update the `status` of a single entry within a message's `toolCalls`
   * array (used by the tool-call approve/reject flow). Throws if the message
   * or the matching tool call isn't found.
   */
  async updateToolCallStatus(
    handle: DbHandle,
    chatId: string,
    messageId: string,
    toolCallId: string,
    status: ChatMessageToolCallRecord['status'],
  ): Promise<ChatMessageRecord> {
    const row = (await handle
      .selectFrom('app.chatMessages')
      .selectAll()
      .where('id', '=', messageId)
      .where('chatId', '=', chatId)
      .executeTakeFirst()) as ChatMessageRow | undefined;

    if (!row) {
      throw new NotFoundError('ChatMessage', { chatId, messageId });
    }

    const toolCalls = parseChatMessageToolCalls(row.toolCalls) ?? [];
    const index = toolCalls.findIndex((call) => call.toolCallId === toolCallId);
    if (index === -1) {
      throw new NotFoundError('ChatMessageToolCall', { chatId, messageId, toolCallId });
    }
    toolCalls[index] = { ...toolCalls[index]!, status };

    const updated = (await handle
      .updateTable('app.chatMessages')
      .set({ toolCalls: toJsonColumnValue(toolCalls), updatedat: new Date().toISOString() })
      .where('id', '=', messageId)
      .where('chatId', '=', chatId)
      .returningAll()
      .executeTakeFirst()) as ChatMessageRow | undefined;

    if (!updated) {
      throw new NotFoundError('ChatMessage', { chatId, messageId });
    }

    return toChatMessageRecord(updated);
  },

  /**
   * Fetch the messages immediately preceding a given point in time (for
   * regenerate), ordered oldest-first like getMessages.
   */
  async getMessagesBefore(
    handle: DbHandle,
    chatId: string,
    beforeCreatedAt: string,
    limit = 200,
  ): Promise<ChatMessageRecord[]> {
    const messages = (await handle
      .selectFrom('app.chatMessages')
      .selectAll()
      .where('chatId', '=', chatId)
      .where('createdat', '<', beforeCreatedAt)
      .orderBy('createdat', 'desc')
      .limit(limit)
      .execute()) as ChatMessageRow[];
    messages.reverse();

    return messages.map(toChatMessageRecord);
  },

  /**
   * Replace an assistant message's content (used for regenerate). Clears any
   * attached audio file since it no longer matches the new text.
   */
  async replaceAssistantMessageContent(
    handle: DbHandle,
    chatId: string,
    messageId: string,
    content: string,
    options?: { reasoning?: string | null; toolCalls?: ChatMessageToolCallRecord[] | null },
  ): Promise<ChatMessageRecord> {
    const updated = (await handle
      .updateTable('app.chatMessages')
      .set({
        content,
        files: null,
        reasoning: options?.reasoning ?? null,
        toolCalls: toJsonColumnValue(options?.toolCalls ?? null),
        updatedat: new Date().toISOString(),
      })
      .where('id', '=', messageId)
      .where('chatId', '=', chatId)
      .where('role', '=', 'assistant')
      .returningAll()
      .executeTakeFirst()) as ChatMessageRow | undefined;

    if (!updated) {
      throw new NotFoundError('ChatMessage', { chatId, messageId });
    }

    return toChatMessageRecord(updated);
  },

  /**
   * Touch lastMessageAt after sending messages.
   */
  async touchLastMessage(handle: DbHandle, chatId: string): Promise<void> {
    await handle
      .updateTable('app.chats')
      .set({ lastMessageAt: new Date().toISOString() })
      .where('id', '=', chatId)
      .execute();
  },

  /**
   * Get messages for a chat.
   *
   * Paginates from the most recent message backward: `offset=0` returns the
   * latest `limit` messages (chronological order), `offset=limit` returns
   * the `limit` messages before those, etc. Callers wanting "load older
   * history" should increase `offset`, mirroring `getMessagesBefore`.
   */
  async getMessages(
    handle: DbHandle,
    chatId: string,
    limit = 100,
    offset = 0,
  ): Promise<ChatMessageRecord[]> {
    const messages = (await handle
      .selectFrom('app.chatMessages')
      .selectAll()
      .where('chatId', '=', chatId)
      .orderBy('createdat', 'desc')
      .limit(limit)
      .offset(offset)
      .execute()) as ChatMessageRow[];
    messages.reverse();

    return messages.map(toChatMessageRecord);
  },

  /**
   * Search all messages in a chat by content.
   */
  async searchMessages(
    handle: DbHandle,
    chatId: string,
    query: string,
    limit = 50,
  ): Promise<ChatMessageRecord[]> {
    const escapedQuery = query.trim().replace(/[\\%_]/g, '\\$&');
    const messages = (await handle
      .selectFrom('app.chatMessages')
      .selectAll()
      .where('chatId', '=', chatId)
      .where('role', '!=', 'tool')
      .where('content', 'ilike', `%${escapedQuery}%`)
      .orderBy('createdat', 'asc')
      .limit(limit)
      .execute()) as ChatMessageRow[];

    return messages.map(toChatMessageRecord);
  },

  /**
   * Insert a single message. Returns the raw row for transaction composition.
   */
  async insertMessage(handle: DbHandle, input: InsertChatMessageInput): Promise<ChatMessageRow> {
    return (await handle
      .insertInto('app.chatMessages')
      .values({
        chatId: input.chatId,
        authorUserid: input.authorUserId,
        role: input.role,
        content: input.content,
        files: toJsonColumnValue(input.files as unknown[] | null),
        reasoning: input.reasoning ?? null,
        toolCalls: toJsonColumnValue(input.toolCalls as unknown[] | null),
        parentMessageId: input.parentMessageId ?? null,
      })
      .returningAll()
      .executeTakeFirstOrThrow()) as ChatMessageRow;
  },

  /**
   * Attach a note to a chat as a persistent context source. Idempotent --
   * adding an already-attached note is a no-op, not an error.
   */
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

    const row = (await handle
      .selectFrom('app.chatSources')
      .selectAll()
      .where('chatId', '=', chatId)
      .where('noteId', '=', noteId)
      .executeTakeFirstOrThrow()) as ChatSourceRow;

    return toChatSourceRecord(row, note.title);
  },

  /**
   * Detach a note from a chat. Returns whether a source was actually removed.
   */
  async removeChatSource(handle: DbHandle, chatId: string, noteId: string): Promise<boolean> {
    const result = await handle
      .deleteFrom('app.chatSources')
      .where('chatId', '=', chatId)
      .where('noteId', '=', noteId)
      .executeTakeFirst();

    return (result.numDeletedRows ?? 0n) > 0n;
  },

  /**
   * List the notes currently attached to a chat, most recently added first.
   */
  async listChatSources(handle: DbHandle, chatId: string): Promise<ChatSourceRecord[]> {
    const rows = (await handle
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
      .execute()) as Array<{
      id: string;
      chatId: string;
      noteId: string;
      title: string | null;
      addedByUserid: string | null;
      createdAt: string | Date;
    }>;

    return rows.map((row) => toChatSourceRecord(row, row.title));
  },

  /**
   * Resolve the full note context (content + attached files) for every note
   * currently attached to a chat -- read once per generation turn.
   */
  async getChatSourceContext(handle: DbHandle, chatId: string): Promise<NoteContext[]> {
    const notes = (await handle
      .selectFrom('app.chatSources as source')
      .innerJoin('app.notes as note', 'note.id', 'source.noteId')
      .select(['note.id', 'note.title', 'note.content', 'note.excerpt'])
      .where('source.chatId', '=', chatId)
      .execute()) as Array<{
      id: string;
      title: string | null;
      content: string;
      excerpt: string | null;
    }>;

    if (notes.length === 0) {
      return [];
    }

    const notesById = new Map<string, NoteContext>(
      notes.map((note) => [
        note.id,
        { id: note.id, title: note.title, content: note.content, excerpt: note.excerpt, files: [] },
      ]),
    );

    const files = (await handle
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
      .execute()) as Array<{
      noteId: string;
      id: string;
      originalName: string;
      content: string | null;
      textContent: string | null;
    }>;

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

  /**
   * Resolve chat file attachments by file IDs with ownership check.
   */
  async resolveChatFiles(
    handle: DbHandle,
    userId: string,
    fileIds: string[],
  ): Promise<ChatMessageFileRecord[]> {
    if (fileIds.length === 0) {
      return [];
    }

    const uniqueIds = [...new Set(fileIds)];
    const files = (await handle
      .selectFrom('app.files')
      .selectAll()
      .where('ownerUserid', '=', userId)
      .where('id', 'in', uniqueIds)
      .execute()) as Array<{
      id: string;
      mimetype: string;
      originalName: string;
      size: number;
      textContent: string | null;
      url: string;
    }>;

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
