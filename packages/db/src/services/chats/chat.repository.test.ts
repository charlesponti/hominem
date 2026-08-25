import { randomUUID } from 'node:crypto';

import { afterEach, describe, expect, it } from 'vitest';

import { authDb, db } from '../../db';
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
    const chat = await db
      .selectFrom('app.chats')
      .select('lastMessageAt')
      .where('id', '=', fixture.chatId)
      .executeTakeFirstOrThrow();
    expect(new Date(chat.lastMessageAt).toISOString()).toBe('2026-01-01T00:00:01.000Z');
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
});
