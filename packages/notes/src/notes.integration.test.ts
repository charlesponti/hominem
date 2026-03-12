import { _db } from '@hominem/db';
import {
  cleanupTestData,
  createDeterministicIdFactory,
  ensureIntegrationUsers,
  isIntegrationDatabaseAvailable,
} from '@hominem/db/test/utils';
import { beforeEach, describe, expect, it } from 'vitest';

import type { NoteOutput } from './contracts';
import { ConflictError } from './note.state.service';
import { NotFoundError, NotesService } from './notes.service';

const nextUserId = createDeterministicIdFactory('notes.integration');
const describeIntegration = (await isIntegrationDatabaseAvailable()) ? describe : describe.skip;

describeIntegration('notes integration', () => {
  const service = new NotesService();
  let ownerId: string;
  let otherUserId: string;

  const cleanupUsersAndNotes = async (userIds: string[]) => {
    await cleanupTestData(userIds);
  };

  const createNoteFor = async (
    userId: string,
    overrides: Partial<NoteOutput> = {},
  ): Promise<NoteOutput> => {
    return service.create({
      userId,
      title: overrides.title ?? 'Integration Note',
      content: overrides.content ?? 'Integration content',
      type: overrides.type ?? 'note',
      status: overrides.status ?? 'draft',
      tags: overrides.tags ?? [],
      mentions: overrides.mentions ?? [],
      isLatestVersion: overrides.isLatestVersion ?? true,
      versionNumber: overrides.versionNumber ?? 1,
      createdAt: overrides.createdAt,
      updatedAt: overrides.updatedAt,
    });
  };

  beforeEach(async () => {
    ownerId = nextUserId();
    otherUserId = nextUserId();
    await cleanupUsersAndNotes([ownerId, otherUserId]);
    await ensureIntegrationUsers([
      { id: ownerId, name: 'Notes Owner' },
      { id: otherUserId, name: 'Notes Other User' },
    ]);
  });

  it('publishes a draft note', async () => {
    const note = await createNoteFor(ownerId, { status: 'draft' });

    const published = await service.publish(note.id, ownerId);

    expect(published.status).toBe('published');
    expect(published.publishedAt).toBeTruthy();
  });

  it('archives a published note', async () => {
    const note = await createNoteFor(ownerId);
    await service.publish(note.id, ownerId);

    const archived = await service.archive(note.id, ownerId);

    expect(archived.status).toBe('archived');
  });

  it('unpublishes a published note back to draft', async () => {
    const note = await createNoteFor(ownerId);
    await service.publish(note.id, ownerId);

    const unpublished = await service.unpublish(note.id, ownerId);

    expect(unpublished.status).toBe('draft');
    expect(unpublished.publishedAt).toBeNull();
  });

  it('rejects archiving a draft note', async () => {
    const note = await createNoteFor(ownerId, { status: 'draft' });

    await expect(service.archive(note.id, ownerId)).rejects.toThrow(ConflictError);
  });

  it('rejects unpublishing an archived note', async () => {
    const note = await createNoteFor(ownerId);
    await service.publish(note.id, ownerId);
    await service.archive(note.id, ownerId);

    await expect(service.unpublish(note.id, ownerId)).rejects.toThrow(ConflictError);
  });

  it('allows republishing an archived note', async () => {
    const note = await createNoteFor(ownerId);
    await service.publish(note.id, ownerId);
    await service.archive(note.id, ownerId);

    const republished = await service.publish(note.id, ownerId);

    expect(republished.status).toBe('published');
  });

  it('rejects scheduling publish from non-draft status', async () => {
    const note = await createNoteFor(ownerId);
    await service.publish(note.id, ownerId);

    await expect(
      service.publish(note.id, ownerId, { scheduledFor: '2026-03-10T00:00:00.000Z' }),
    ).rejects.toThrow(ConflictError);
  });

  it('keeps status draft when scheduling publish from draft', async () => {
    const note = await createNoteFor(ownerId, { status: 'draft' });

    const scheduled = await service.publish(note.id, ownerId, {
      scheduledFor: '2026-03-10T00:00:00.000Z',
    });

    expect(scheduled.status).toBe('draft');
    expect(scheduled.scheduledFor).toBeTruthy();
  });

  it('enforces ownership on publish operations', async () => {
    const note = await createNoteFor(ownerId);

    await expect(service.publish(note.id, otherUserId)).rejects.toThrow(NotFoundError);
  });

  it('returns only owner notes in deterministic updatedAt-desc order', async () => {
    const older = await createNoteFor(ownerId, {
      title: 'Older',
      updatedAt: '2026-03-01T00:00:00.000Z',
      createdAt: '2026-03-01T00:00:00.000Z',
    });
    const newer = await createNoteFor(ownerId, {
      title: 'Newer',
      updatedAt: '2026-03-02T00:00:00.000Z',
      createdAt: '2026-03-02T00:00:00.000Z',
    });
    await createNoteFor(otherUserId, {
      title: 'Other User Note',
      updatedAt: '2026-03-03T00:00:00.000Z',
      createdAt: '2026-03-03T00:00:00.000Z',
    });

    const { notes: ownerNotes } = await service.query(ownerId);
    const orderedIds = ownerNotes.map((note) => note.id);

    expect(orderedIds).toEqual([newer.id, older.id]);
  });

  it('persists tags via note_tags and filters by tag name', async () => {
    await createNoteFor(ownerId, {
      title: 'Tagged Note',
      tags: [{ value: 'work' }, { value: 'urgent' }],
    });
    await createNoteFor(ownerId, {
      title: 'Untagged Note',
      tags: [{ value: 'personal' }],
    });

    const { notes: filtered } = await service.query(ownerId, { tags: ['work'] });

    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.title).toBe('Tagged Note');
    expect(filtered[0]?.tags).toEqual([{ value: 'urgent' }, { value: 'work' }]);
  });

  it('replaces note tags on update', async () => {
    const note = await createNoteFor(ownerId, {
      tags: [{ value: 'old' }],
    });

    const updated = await service.update({
      id: note.id,
      userId: ownerId,
      tags: [{ value: 'new' }, { value: 'focus' }],
    });

    expect(updated.tags).toEqual([{ value: 'focus' }, { value: 'new' }]);

    const { notes: oldTagQuery } = await service.query(ownerId, { tags: ['old'] });
    expect(oldTagQuery).toHaveLength(0);

    const { notes: newTagQuery } = await service.query(ownerId, { tags: ['new'] });
    expect(newTagQuery).toHaveLength(1);
    expect(newTagQuery[0]?.id).toBe(note.id);
  });
});
