import { randomUUID } from 'node:crypto';

import { afterEach, describe, expect, it } from 'vitest';

import { authDb, db } from '../../db';
import { ChatSpeechRunRepository } from './chat-speech-run.repository';

describe('ChatSpeechRunRepository', () => {
  const userIds: string[] = [];

  afterEach(async () => {
    for (const userId of userIds.splice(0)) {
      await authDb.deleteFrom('user').where('id', '=', userId).execute();
    }
  });

  async function createFixture() {
    const userId = randomUUID();
    const chatId = randomUUID();
    const messageId = randomUUID();
    userIds.push(userId);

    await authDb
      .insertInto('user')
      .values({ id: userId, name: 'Speech Test User', email: `${userId}@example.com` })
      .execute();
    await db
      .insertInto('app.chats')
      .values({ id: chatId, ownerUserid: userId, title: 'Speech test' })
      .execute();
    await db
      .insertInto('app.chatMessages')
      .values({
        id: messageId,
        chatId,
        authorUserid: userId,
        role: 'assistant',
        content: 'Hello from speech',
      })
      .execute();

    return { userId, chatId, messageId };
  }

  it('stores multiple runs for one message and reconciles their state', async () => {
    const fixture = await createFixture();
    const first = await ChatSpeechRunRepository.create(db, {
      id: randomUUID(),
      messageId: fixture.messageId,
      ownerUserId: fixture.userId,
      usageEventId: randomUUID(),
      provider: 'openrouter',
      characterCount: 18,
    });
    const second = await ChatSpeechRunRepository.create(db, {
      id: randomUUID(),
      messageId: fixture.messageId,
      ownerUserId: fixture.userId,
      usageEventId: randomUUID(),
      provider: 'openrouter',
      characterCount: 18,
    });

    expect(first.id).not.toBe(second.id);
    await ChatSpeechRunRepository.setProviderGenerationId(db, {
      id: first.id,
      providerGenerationId: 'gen-tts-1',
    });
    await ChatSpeechRunRepository.markComplete(db, { id: first.id, status: 'succeeded' });
    await ChatSpeechRunRepository.markReconciliation(db, { id: first.id, status: 'succeeded' });

    await expect(
      ChatSpeechRunRepository.setProviderGenerationId(db, {
        id: second.id,
        providerGenerationId: 'gen-tts-1',
      }),
    ).rejects.toThrow();

    const pending = await ChatSpeechRunRepository.listPending(db);
    expect(pending).toEqual([]);
    expect(await ChatSpeechRunRepository.getById(db, first.id, fixture.userId)).toMatchObject({
      providerGenerationId: 'gen-tts-1',
      status: 'succeeded',
      reconciliationStatus: 'succeeded',
    });
  });

  it('enforces owner filtering and message deletion cascade', async () => {
    const fixture = await createFixture();
    const otherUserId = randomUUID();
    userIds.push(otherUserId);
    await authDb
      .insertInto('user')
      .values({ id: otherUserId, name: 'Other User', email: `${otherUserId}@example.com` })
      .execute();

    const run = await ChatSpeechRunRepository.create(db, {
      id: randomUUID(),
      messageId: fixture.messageId,
      ownerUserId: fixture.userId,
      usageEventId: randomUUID(),
      provider: 'openrouter',
      characterCount: 18,
    });

    expect(await ChatSpeechRunRepository.getById(db, run.id, otherUserId)).toBeNull();

    await db.deleteFrom('app.chatMessages').where('id', '=', fixture.messageId).execute();
    expect(await ChatSpeechRunRepository.getById(db, run.id)).toBeNull();
  });
});
