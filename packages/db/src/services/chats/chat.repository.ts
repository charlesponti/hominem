import { slugifyText } from '@hominem/utils/text';
import type { Selectable } from 'kysely';

import { NotFoundError, ValidationError } from '../../errors';
import {
  parseChatMessageFiles,
  parseChatMessageToolCalls,
  type ChatMessageFileRecord,
  type ChatMessageToolCallRecord,
} from '../../guards';
import type { DbHandle } from '../../transaction';
import type { AppChatGenerationRuns, AppChatMessages, AppChats } from '../../types/database';

export type { ChatMessageFileRecord, ChatMessageToolCallRecord } from '../../guards';

type ChatRow = Selectable<AppChats>;
type ChatMessageRow = Selectable<AppChatMessages>;
type ChatGenerationRunRow = Selectable<AppChatGenerationRuns>;

export interface ChatRecord {
  id: string;
  userId: string;
  title: string;
  noteId: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export type ChatMessageRole = 'system' | 'user' | 'assistant' | 'tool';

export interface ReferencedNoteRecord {
  id: string;
  title: string | null;
}

export interface ChatMessageRecord {
  id: string;
  chatId: string;
  userId: string;
  role: ChatMessageRole;
  content: string;
  files: ChatMessageFileRecord[] | null;
  referencedNotes: ReferencedNoteRecord[] | null;
  toolCalls: ChatMessageToolCallRecord[] | null;
  reasoning: string | null;
  parentMessageId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface InsertChatMessageInput {
  chatId: string;
  authorUserId: string;
  role: ChatMessageRole;
  content: string;
  files?: unknown[] | null;
  referencedNoteIds?: string[] | null;
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
    noteId: row.noteId ?? null,
    archivedAt: row.archivedAt ? new Date(row.archivedAt).toISOString() : null,
    createdAt: new Date(row.createdat).toISOString(),
    updatedAt: new Date(row.updatedat).toISOString(),
  };
}

function toChatMessageRecord(
  row: ChatMessageRow,
  noteTitlesById: Map<string, string | null>,
): ChatMessageRecord {
  const referencedNoteIds = Array.isArray(row.referencedNoteIds)
    ? (row.referencedNoteIds as string[])
    : [];

  return {
    id: row.id,
    chatId: row.chatId,
    userId: row.authorUserid ?? '',
    role: row.role as ChatMessageRole,
    content: row.content,
    files: parseChatMessageFiles(row.files),
    referencedNotes:
      referencedNoteIds.length > 0
        ? referencedNoteIds.map((id) => ({
            id,
            title: noteTitlesById.get(id) ?? null,
          }))
        : null,
    toolCalls: parseChatMessageToolCalls(row.toolCalls),
    reasoning: row.reasoning ?? null,
    parentMessageId: row.parentMessageId,
    createdAt: new Date(row.createdat).toISOString(),
    updatedAt: new Date(row.updatedat).toISOString(),
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
   * Get a chat by note ID with ownership enforcement.
   */
  async getByNoteId(handle: DbHandle, noteId: string, userId: string): Promise<ChatRecord | null> {
    const chat = await handle
      .selectFrom('app.chats')
      .selectAll()
      .where('noteId', '=', noteId)
      .where('ownerUserid', '=', userId)
      .executeTakeFirst();

    return chat ? toChatRecord(chat) : null;
  },

  /**
   * List non-archived chats for a user, ordered by last message.
   */
  async listForUser(
    handle: DbHandle,
    userId: string,
    limit = 100,
    options: { includeArchived?: boolean } = {},
  ): Promise<ChatRecord[]> {
    let query = handle.selectFrom('app.chats').selectAll().where('ownerUserid', '=', userId);

    if (!options.includeArchived) {
      query = query.where('archivedAt', 'is', null);
    }

    const chats = (await query
      .orderBy('lastMessageAt', 'desc')
      .limit(limit)
      .execute()) as ChatRow[];

    return chats.map(toChatRecord);
  },

  /**
   * Create a new chat.
   */
  async create(
    handle: DbHandle,
    input: { userId: string; title: string; noteId?: string | null; archivedAt?: string | null },
  ): Promise<ChatRecord> {
    const chat = await handle
      .insertInto('app.chats')
      .values({
        ownerUserid: input.userId,
        title: input.title,
        noteId: input.noteId ?? null,
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
   * Delete a chat by ID with ownership enforcement.
   */
  async delete(handle: DbHandle, chatId: string, userId: string): Promise<void> {
    await handle
      .deleteFrom('app.chats')
      .where('id', '=', chatId)
      .where('ownerUserid', '=', userId)
      .execute();
  },

  /**
   * Delete all messages for a chat after checking ownership.
   */
  async clearMessages(handle: DbHandle, chatId: string, userId: string): Promise<boolean> {
    const existing = await handle
      .selectFrom('app.chats')
      .select('id')
      .where('id', '=', chatId)
      .where('ownerUserid', '=', userId)
      .executeTakeFirst();

    if (!existing) {
      return false;
    }

    await handle.deleteFrom('app.chatMessages').where('chatId', '=', chatId).execute();
    return true;
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

    const noteIds = Array.isArray(updated.referencedNoteIds)
      ? (updated.referencedNoteIds as string[])
      : [];
    const noteTitlesById = await ChatRepository.getNoteTitles(handle, noteIds);

    return toChatMessageRecord(updated, noteTitlesById);
  },

  /**
   * Fetch a single message by id, enriched with referenced note titles.
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

    const noteIds = Array.isArray(row.referencedNoteIds) ? (row.referencedNoteIds as string[]) : [];
    const noteTitlesById = await ChatRepository.getNoteTitles(handle, noteIds);

    return toChatMessageRecord(row, noteTitlesById);
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

    const noteIds = Array.isArray(updated.referencedNoteIds)
      ? (updated.referencedNoteIds as string[])
      : [];
    const noteTitlesById = await ChatRepository.getNoteTitles(handle, noteIds);

    return toChatMessageRecord(updated, noteTitlesById);
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

    const noteIds = [
      ...new Set(
        messages.flatMap((m) =>
          Array.isArray(m.referencedNoteIds) ? (m.referencedNoteIds as string[]) : [],
        ),
      ),
    ];
    const noteTitlesById = await ChatRepository.getNoteTitles(handle, noteIds);

    return messages.map((m) => toChatMessageRecord(m, noteTitlesById));
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

    const noteIds = Array.isArray(updated.referencedNoteIds)
      ? (updated.referencedNoteIds as string[])
      : [];
    const noteTitlesById = await ChatRepository.getNoteTitles(handle, noteIds);

    return toChatMessageRecord(updated, noteTitlesById);
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
   * Fetch note titles for referenced note IDs (for message enrichment).
   */
  async getNoteTitles(handle: DbHandle, noteIds: string[]): Promise<Map<string, string | null>> {
    if (noteIds.length === 0) {
      return new Map();
    }
    const notes = (await handle
      .selectFrom('app.notes')
      .select(['id', 'title'])
      .where('id', 'in', noteIds)
      .execute()) as Array<{ id: string; title: string | null }>;

    return new Map(notes.map((note) => [note.id, note.title]));
  },

  /**
   * Get messages for a chat, enriched with referenced note titles.
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

    const noteIds = [
      ...new Set(
        messages.flatMap((m) =>
          Array.isArray(m.referencedNoteIds) ? (m.referencedNoteIds as string[]) : [],
        ),
      ),
    ];
    const noteTitlesById = await ChatRepository.getNoteTitles(handle, noteIds);

    return messages.map((m) => toChatMessageRecord(m, noteTitlesById));
  },

  /**
   * Search all messages in a chat by content, enriched with referenced note titles.
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

    const noteIds = [
      ...new Set(
        messages.flatMap((m) =>
          Array.isArray(m.referencedNoteIds) ? (m.referencedNoteIds as string[]) : [],
        ),
      ),
    ];
    const noteTitlesById = await ChatRepository.getNoteTitles(handle, noteIds);

    return messages.map((m) => toChatMessageRecord(m, noteTitlesById));
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
        referencedNoteIds: toJsonColumnValue(input.referencedNoteIds),
        reasoning: input.reasoning ?? null,
        toolCalls: toJsonColumnValue(input.toolCalls as unknown[] | null),
        parentMessageId: input.parentMessageId ?? null,
      })
      .returningAll()
      .executeTakeFirstOrThrow()) as ChatMessageRow;
  },

  /**
   * Resolve note context for referenced notes (by explicit IDs and #mention slugs).
   */
  async resolveReferencedNotes(
    handle: DbHandle,
    userId: string,
    explicitNoteIds: string[],
    message: string,
  ): Promise<NoteContext[]> {
    const mentionedSlugs = extractMentionSlugs(message);
    const explicitIds = [...new Set(explicitNoteIds)];

    type NoteInfo = { id: string; title: string | null; content: string; excerpt: string | null };

    const explicitNotes: NoteInfo[] =
      explicitIds.length > 0
        ? ((await handle
            .selectFrom('app.notes')
            .select(['id', 'title', 'content', 'excerpt'])
            .where('ownerUserid', '=', userId)
            .where('id', 'in', explicitIds)
            .execute()) as NoteInfo[])
        : [];

    if (explicitNotes.length !== explicitIds.length) {
      throw new ValidationError('One or more referenced notes are unavailable');
    }

    const candidateNotes: NoteInfo[] =
      mentionedSlugs.length > 0
        ? ((await handle
            .selectFrom('app.notes')
            .select(['id', 'title', 'content', 'excerpt'])
            .where('ownerUserid', '=', userId)
            .execute()) as NoteInfo[])
        : [];

    const matchedMentionNotes = candidateNotes.filter((note) => {
      const slug = slugifyText(note.title);
      return slug ? mentionedSlugs.includes(slug) : false;
    });

    const mergedNotes = [...explicitNotes, ...matchedMentionNotes].reduce<Map<string, NoteContext>>(
      (acc, note) => {
        acc.set(note.id, {
          id: note.id,
          title: note.title,
          content: note.content,
          excerpt: note.excerpt,
          files: [],
        });
        return acc;
      },
      new Map(),
    );

    const noteIds = [...mergedNotes.keys()];
    if (noteIds.length === 0) {
      return [];
    }

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
      .where('noteFile.noteId', 'in', noteIds)
      .execute()) as Array<{
      noteId: string;
      id: string;
      originalName: string;
      content: string | null;
      textContent: string | null;
    }>;

    for (const file of files) {
      const note = mergedNotes.get(file.noteId);
      if (!note) continue;
      note.files.push({
        id: file.id,
        originalName: file.originalName,
        content: file.content,
        textContent: file.textContent,
      });
    }

    return [...mergedNotes.values()];
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

function extractMentionSlugs(message: string): string[] {
  return [...message.matchAll(/#([a-zA-Z0-9][\w-]*)/g)].map((match) => match[1]!.toLowerCase());
}
