import type { Note } from '@hominem/rpc/types/notes.types';
import { resolveComposerActions } from '@hominem/ui/composer';
import { describe, expect, it, vi } from 'vitest';

import type { UploadedFile } from '~/lib/types/upload';

function createNoteFixture(overrides: Partial<Note> = {}): Note {
  return {
    id: 'note-1',
    userId: 'user-1',
    type: 'note',
    status: 'draft',
    title: 'Context',
    content: 'Body copy',
    excerpt: 'Body copy',
    tags: [],
    mentions: null,
    analysis: null,
    publishingMetadata: null,
    parentNoteId: null,
    versionNumber: 1,
    isLatestVersion: true,
    publishedAt: null,
    scheduledFor: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

function createDeps() {
  return {
    createNote: vi.fn<(input: { content: string; title?: string }) => Promise<void>>(),
    updateNote: vi.fn<(input: { id: string; content: string }) => Promise<void>>(),
    sendMessage: vi.fn<(input: { chatId: string; message: string }) => Promise<void>>(),
    createChat: vi.fn<(input: { seedText: string; title: string }) => Promise<{ id: string }>>(),
    clearDraft: vi.fn(),
    clearAttachedNotes: vi.fn(),
    clearUploadedFiles: vi.fn(),
    navigate: vi.fn(),
    runWithSubmitLock: vi.fn<(task: () => Promise<void>) => Promise<void>>(async (task) => {
      await task();
    }),
  };
}

function createUploadedFileFixture(overrides: Partial<UploadedFile> = {}): UploadedFile {
  const file: UploadedFile = {
    id: overrides.id ?? 'upload-1',
    originalName: overrides.originalName ?? 'brief.pdf',
    type: overrides.type ?? 'document',
    mimetype: overrides.mimetype ?? 'application/pdf',
    size: overrides.size ?? 512,
    status: overrides.status ?? 'ready',
    content: overrides.content ?? 'Quarterly brief',
    url: overrides.url ?? 'https://example.test/brief.pdf',
    uploadedAt: overrides.uploadedAt ?? new Date(),
  };

  if (overrides.textContent !== undefined) {
    file.textContent = overrides.textContent;
  }
  if (overrides.thumbnail !== undefined) {
    file.thumbnail = overrides.thumbnail;
  }
  if (overrides.metadata !== undefined) {
    file.metadata = overrides.metadata;
  }
  if (overrides.vectorIds !== undefined) {
    file.vectorIds = overrides.vectorIds;
  }

  return file;
}

describe('resolveComposerActions', () => {
  it('maps capture primary to note creation', async () => {
    const deps = createDeps();
    deps.createNote.mockResolvedValue();

    const actions = resolveComposerActions({
      posture: 'capture',
      draftText: 'Hello',
      noteId: null,
      noteTitle: null,
      chatId: null,
      attachedNotes: [],
      uploadedFiles: [],
      isUploadingAttachments: false,
      isSubmitting: false,
      ...deps,
    });

    await actions.primary.execute();

    expect(deps.createNote).toHaveBeenCalledWith({ content: 'Hello', title: 'Hello' });
    expect(deps.clearDraft).toHaveBeenCalledTimes(1);
    expect(deps.runWithSubmitLock).toHaveBeenCalledTimes(1);
  });

  it('maps draft secondary to note discussion chat creation', async () => {
    const deps = createDeps();
    deps.createChat.mockResolvedValue({ id: 'chat-1' });

    const actions = resolveComposerActions({
      posture: 'draft',
      draftText: 'Help me think through this',
      noteId: 'note-1',
      noteTitle: 'Roadmap',
      chatId: null,
      attachedNotes: [],
      uploadedFiles: [],
      isUploadingAttachments: false,
      isSubmitting: false,
      ...deps,
    });

    await actions.secondary.execute();

    expect(deps.createChat).toHaveBeenCalledWith({
      title: 'Help me think through this',
      seedText: '[Regarding note: "Roadmap"]\n\nHelp me think through this',
    });
    expect(deps.navigate).toHaveBeenCalledWith('/chat/chat-1');
    expect(deps.clearDraft).toHaveBeenCalledTimes(1);
  });

  it('maps reply primary to chat send with note context and cleanup', async () => {
    const deps = createDeps();
    deps.sendMessage.mockResolvedValue();

    const actions = resolveComposerActions({
      posture: 'reply',
      draftText: 'Question',
      noteId: null,
      noteTitle: null,
      chatId: 'chat-1',
      attachedNotes: [createNoteFixture()],
      uploadedFiles: [],
      isUploadingAttachments: false,
      isSubmitting: false,
      ...deps,
    });

    await actions.primary.execute();

    expect(deps.sendMessage).toHaveBeenCalledWith({
      chatId: 'chat-1',
      message: '<context>\n### Context\n\nBody copy\n</context>\n\nQuestion',
    });
    expect(deps.clearDraft).toHaveBeenCalledTimes(1);
    expect(deps.clearAttachedNotes).toHaveBeenCalledTimes(1);
  });

  it('adds uploaded file context to reply send actions', async () => {
    const deps = createDeps();
    deps.sendMessage.mockResolvedValue();

    const actions = resolveComposerActions({
      posture: 'reply',
      draftText: 'Question',
      noteId: null,
      noteTitle: null,
      chatId: 'chat-1',
      attachedNotes: [],
      uploadedFiles: [createUploadedFileFixture()],
      isUploadingAttachments: false,
      isSubmitting: false,
      ...deps,
    });

    await actions.primary.execute();

    expect(deps.sendMessage).toHaveBeenCalledWith({
      chatId: 'chat-1',
      message: expect.stringContaining('Attached files context:'),
    });
    expect(deps.clearUploadedFiles).toHaveBeenCalledTimes(1);
  });
});
