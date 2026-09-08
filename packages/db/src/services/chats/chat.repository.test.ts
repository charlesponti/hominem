import { randomUUID } from 'node:crypto';

import { afterEach, describe, expect, it } from 'vitest';

import { authDb, db } from '../../db';
import { ValidationError } from '../../errors';
import { ChatRepository } from './chat.repository';

describe('ChatRepository message deletion', () => {
  const userIds: string[] = [];

  afterEach(async () => {
    for (const userId of userIds.splice(0)) {
      await authDb.deleteFrom('user').where('id', '=', userId).execute();
    }
  });

  async function createFixture() {
    const userId = randomUUID();
    const chatId = randomUUID();
    userIds.push(userId);

    await authDb
      .insertInto('user')
      .values({ id: userId, name: 'Chat Delete User', email: `${userId}@example.com` })
      .execute();
    await db
      .insertInto('app.chats')
      .values({
        id: chatId,
        ownerUserid: userId,
        title: 'Delete test',
        createdat: new Date('2026-01-01T00:00:00.000Z'),
        lastMessageAt: new Date('2026-01-01T00:00:00.000Z'),
      })
      .execute();

    const messageIds = {
      first: randomUUID(),
      target: randomUUID(),
      later: randomUUID(),
    };
    await db
      .insertInto('app.chatMessages')
      .values([
        {
          id: messageIds.first,
          chatId,
          authorUserid: userId,
          role: 'user',
          content: 'Keep this message',
          createdat: new Date('2026-01-01T00:00:01.000Z'),
        },
        {
          id: messageIds.target,
          chatId,
          authorUserid: userId,
          role: 'user',
          content: 'Delete from here',
          createdat: new Date('2026-01-01T00:00:02.000Z'),
        },
        {
          id: messageIds.later,
          chatId,
          authorUserid: userId,
          role: 'assistant',
          content: 'Later answer',
          createdat: new Date('2026-01-01T00:00:03.000Z'),
        },
      ])
      .execute();

    await db
      .insertInto('app.chatGenerationRuns')
      .values({
        id: randomUUID(),
        chatId,
        ownerUserId: userId,
        kind: 'regenerate',
        status: 'committed',
        targetAssistantMessageId: messageIds.later,
      })
      .execute();

    return { chatId, messageIds, userId };
  }

  it('truncates the target message and all later messages', async () => {
    const fixture = await createFixture();

    await expect(
      ChatRepository.deleteUserMessageAndFollowing(
        db,
        fixture.chatId,
        fixture.messageIds.target,
        fixture.userId,
      ),
    ).resolves.toEqual({
      deletedMessageIds: [fixture.messageIds.target, fixture.messageIds.later],
      cleanupFileIds: [],
    });

    await expect(ChatRepository.getMessages(db, fixture.chatId, 50)).resolves.toMatchObject([
      { id: fixture.messageIds.first, content: 'Keep this message' },
    ]);
    await expect(
      db
        .selectFrom('app.chatGenerationRuns')
        .select('id')
        .where('chatId', '=', fixture.chatId)
        .execute(),
    ).resolves.toEqual([]);
    const chat = await db
      .selectFrom('app.chats')
      .select('lastMessageAt')
      .where('id', '=', fixture.chatId)
      .executeTakeFirstOrThrow();
    expect(new Date(chat.lastMessageAt).toISOString()).toBe('2026-01-01T00:00:01.000Z');
  });

  it('edits a message and truncates all later messages', async () => {
    const fixture = await createFixture();

    await expect(
      ChatRepository.updateMessage(
        db,
        fixture.chatId,
        fixture.messageIds.target,
        fixture.userId,
        'Edited content',
      ),
    ).resolves.toMatchObject({
      message: { id: fixture.messageIds.target, content: 'Edited content' },
      deletedMessageIds: [fixture.messageIds.later],
      cleanupFileIds: [],
    });

    await expect(ChatRepository.getMessages(db, fixture.chatId, 50)).resolves.toMatchObject([
      { id: fixture.messageIds.first, content: 'Keep this message' },
      { id: fixture.messageIds.target, content: 'Edited content' },
    ]);
    await expect(
      db
        .selectFrom('app.chatGenerationRuns')
        .select('id')
        .where('chatId', '=', fixture.chatId)
        .execute(),
    ).resolves.toEqual([]);
  });

  it("does not delete another user's message when editing", async () => {
    const fixture = await createFixture();
    const otherUserId = randomUUID();
    userIds.push(otherUserId);
    await authDb
      .insertInto('user')
      .values({ id: otherUserId, name: 'Other User', email: `${otherUserId}@example.com` })
      .execute();

    await expect(
      ChatRepository.updateMessage(
        db,
        fixture.chatId,
        fixture.messageIds.target,
        otherUserId,
        'Hijacked content',
      ),
    ).rejects.toThrow('ChatMessage not found');
    await expect(ChatRepository.getMessages(db, fixture.chatId, 50)).resolves.toHaveLength(3);
  });

  it('rejects editing a non-user message', async () => {
    const fixture = await createFixture();

    await expect(
      ChatRepository.updateMessage(
        db,
        fixture.chatId,
        fixture.messageIds.later,
        fixture.userId,
        'Rewritten assistant reply',
      ),
    ).rejects.toThrow('ChatMessage not found');
  });

  it('reports whether a message has anything after it', async () => {
    const fixture = await createFixture();

    await expect(
      ChatRepository.hasMessagesAfter(db, fixture.chatId, fixture.messageIds.target),
    ).resolves.toBe(true);
    await expect(
      ChatRepository.hasMessagesAfter(db, fixture.chatId, fixture.messageIds.later),
    ).resolves.toBe(false);
    await expect(ChatRepository.hasMessagesAfter(db, fixture.chatId, randomUUID())).resolves.toBe(
      false,
    );
  });

  it('returns a stable cursor page ordered by activity and id', async () => {
    const fixture = await createFixture();
    const chatIds = [randomUUID(), randomUUID(), randomUUID()];

    await db
      .insertInto('app.chats')
      .values(
        chatIds.map((id, index) => ({
          id,
          ownerUserid: fixture.userId,
          title: `Page ${index + 1}`,
          createdat: new Date(`2026-02-0${index + 1}T00:00:00.000Z`),
          lastMessageAt: new Date(`2026-02-0${index + 1}T00:00:00.000Z`),
        })),
      )
      .execute();

    const firstPage = await ChatRepository.listForUser(db, fixture.userId, { limit: 2 });

    expect(firstPage.chats.map((chat) => chat.id)).toEqual([chatIds[2], chatIds[1]]);
    expect(firstPage.nextCursor).not.toBeNull();

    const secondPage = await ChatRepository.listForUser(db, fixture.userId, {
      cursor: firstPage.nextCursor ?? undefined,
      limit: 2,
    });

    expect(secondPage.chats.map((chat) => chat.id)).toEqual([chatIds[0], fixture.chatId]);
    expect(secondPage.nextCursor).toBeNull();
  });

  it("does not delete another user's message", async () => {
    const fixture = await createFixture();
    const otherUserId = randomUUID();
    userIds.push(otherUserId);
    await authDb
      .insertInto('user')
      .values({ id: otherUserId, name: 'Other User', email: `${otherUserId}@example.com` })
      .execute();

    await expect(
      ChatRepository.deleteUserMessageAndFollowing(
        db,
        fixture.chatId,
        fixture.messageIds.target,
        otherUserId,
      ),
    ).rejects.toThrow('ChatMessage not found');
    await expect(ChatRepository.getMessages(db, fixture.chatId, 50)).resolves.toHaveLength(3);
  });

  it('updates the title and rejects when the chat is not owned', async () => {
    const fixture = await createFixture();
    const otherUserId = randomUUID();
    userIds.push(otherUserId);
    await authDb
      .insertInto('user')
      .values({ id: otherUserId, name: 'Other User', email: `${otherUserId}@example.com` })
      .execute();

    await ChatRepository.updateTitle(db, fixture.chatId, fixture.userId, 'Renamed');
    const chat = await db
      .selectFrom('app.chats')
      .select('title')
      .where('id', '=', fixture.chatId)
      .executeTakeFirstOrThrow();
    expect(chat.title).toBe('Renamed');

    await expect(
      ChatRepository.updateTitle(db, fixture.chatId, otherUserId, 'Hijacked'),
    ).rejects.toThrow('Chat not found');
  });

  it('archives the chat and rejects when it is not owned', async () => {
    const fixture = await createFixture();
    const otherUserId = randomUUID();
    userIds.push(otherUserId);
    await authDb
      .insertInto('user')
      .values({ id: otherUserId, name: 'Other User', email: `${otherUserId}@example.com` })
      .execute();

    await expect(ChatRepository.archive(db, fixture.chatId, otherUserId)).rejects.toThrow(
      'Chat not found',
    );

    await expect(ChatRepository.archive(db, fixture.chatId, fixture.userId)).resolves.toMatchObject(
      { id: fixture.chatId },
    );
    const chat = await db
      .selectFrom('app.chats')
      .select('archivedAt')
      .where('id', '=', fixture.chatId)
      .executeTakeFirstOrThrow();
    expect(chat.archivedAt).not.toBeNull();
  });

  it('raises a safe validation error for invalid persisted message JSON', async () => {
    const fixture = await createFixture();

    await db
      .updateTable('app.chatMessages')
      .set({ files: JSON.stringify([{ type: 'file', metadata: [] }]) })
      .where('id', '=', fixture.messageIds.first)
      .execute();

    try {
      await ChatRepository.getMessageById(db, fixture.chatId, fixture.messageIds.first);
      expect.fail('Expected invalid persisted JSON to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationError);
      expect(error).toMatchObject({
        code: 'VALIDATION_ERROR',
        message: 'Invalid chat message files',
        details: {
          messageId: fixture.messageIds.first,
          field: 'files',
        },
      });
    }
  });
});

describe('ChatRepository owner-scoped reads', () => {
  const userIds: string[] = [];

  afterEach(async () => {
    for (const userId of userIds.splice(0)) {
      await authDb.deleteFrom('user').where('id', '=', userId).execute();
    }
  });

  async function createFixtureWithOutsider() {
    const userId = randomUUID();
    const chatId = randomUUID();
    const otherUserId = randomUUID();
    userIds.push(userId, otherUserId);

    await authDb
      .insertInto('user')
      .values([
        { id: userId, name: 'Owner', email: `${userId}@example.com` },
        { id: otherUserId, name: 'Outsider', email: `${otherUserId}@example.com` },
      ])
      .execute();
    await db
      .insertInto('app.chats')
      .values({
        id: chatId,
        ownerUserid: userId,
        title: 'Owner-scoped test chat',
        createdat: new Date('2026-01-01T00:00:00.000Z'),
        lastMessageAt: new Date('2026-01-01T00:00:00.000Z'),
      })
      .execute();
    const messageIds = { first: randomUUID(), second: randomUUID() };
    await db
      .insertInto('app.chatMessages')
      .values([
        {
          id: messageIds.first,
          chatId,
          authorUserid: userId,
          role: 'user',
          content: 'Find this message',
          createdat: new Date('2026-01-01T00:00:01.000Z'),
        },
        {
          id: messageIds.second,
          chatId,
          authorUserid: userId,
          role: 'assistant',
          content: 'Later reply',
          createdat: new Date('2026-01-01T00:00:02.000Z'),
        },
      ])
      .execute();

    return { chatId, messageIds, userId, otherUserId };
  }

  it('getMessagesForOwner returns ordered messages for the owner, null otherwise', async () => {
    const fixture = await createFixtureWithOutsider();

    await expect(
      ChatRepository.getMessagesForOwner(db, fixture.chatId, fixture.userId),
    ).resolves.toMatchObject([
      { id: fixture.messageIds.first, content: 'Find this message' },
      { id: fixture.messageIds.second, content: 'Later reply' },
    ]);
    await expect(
      ChatRepository.getMessagesForOwner(db, fixture.chatId, fixture.otherUserId),
    ).resolves.toBeNull();
    await expect(
      ChatRepository.getMessagesForOwner(db, randomUUID(), fixture.userId),
    ).resolves.toBeNull();
  });

  it('searchMessagesForOwner matches content for the owner, null otherwise', async () => {
    const fixture = await createFixtureWithOutsider();

    await expect(
      ChatRepository.searchMessagesForOwner(db, fixture.chatId, fixture.userId, 'Later'),
    ).resolves.toMatchObject([{ id: fixture.messageIds.second }]);
    await expect(
      ChatRepository.searchMessagesForOwner(db, fixture.chatId, fixture.otherUserId, 'Later'),
    ).resolves.toBeNull();
  });

  it('getOwnedWithMessages returns the chat and its messages for the owner, null otherwise', async () => {
    const fixture = await createFixtureWithOutsider();

    const result = await ChatRepository.getOwnedWithMessages(db, fixture.chatId, fixture.userId);
    expect(result?.chat).toMatchObject({ id: fixture.chatId, title: 'Owner-scoped test chat' });
    expect(result?.messages).toHaveLength(2);

    await expect(
      ChatRepository.getOwnedWithMessages(db, fixture.chatId, fixture.otherUserId),
    ).resolves.toBeNull();
  });

  it('listChatSourcesForOwner returns sources for the owner, null otherwise', async () => {
    const fixture = await createFixtureWithOutsider();
    const noteId = randomUUID();
    await db
      .insertInto('app.notes')
      .values({ id: noteId, ownerUserid: fixture.userId, title: 'A note' })
      .execute();
    await ChatRepository.addChatSource(db, fixture.chatId, noteId, fixture.userId);

    await expect(
      ChatRepository.listChatSourcesForOwner(db, fixture.chatId, fixture.userId),
    ).resolves.toMatchObject([{ noteId, title: 'A note' }]);
    await expect(
      ChatRepository.listChatSourcesForOwner(db, fixture.chatId, fixture.otherUserId),
    ).resolves.toBeNull();
  });
});
