// @vitest-environment jsdom

import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const mockUploadFiles = vi.fn();
const mockAddSource = vi.fn();
const mockRemoveSource = vi.fn();
let sourcesData: Array<{ id: string; chatId: string; noteId: string; title: string | null }> = [];

vi.mock('~/hooks/use-notes', () => ({
  useNoteSearch: (query: string) => ({
    data:
      query.length > 0
        ? {
            notes: [
              { id: 'note-1', title: 'Existing note', excerpt: 'Already selected' },
              { id: 'note-2', title: 'Suggested note', excerpt: 'Suggestion' },
            ],
          }
        : undefined,
  }),
}));

vi.mock('./use-file-upload', () => ({
  useFileUpload: () => ({
    uploadFiles: mockUploadFiles,
    uploadState: { errors: [] },
  }),
}));

vi.mock('./use-chat-sources', () => ({
  useChatSources: () => ({ data: sourcesData }),
  useAddChatSource: () => ({ mutate: mockAddSource }),
  useRemoveChatSource: () => ({ mutate: mockRemoveSource }),
}));

import { useChatComposerState } from './use-chat-composer-state';

describe('useChatComposerState', () => {
  it('attaches a seeded note as a chat source', async () => {
    sourcesData = [];
    renderHook(() =>
      useChatComposerState({
        chatId: 'chat-1',
        seedNote: { id: 'note-1', title: 'Existing note', excerpt: 'Already selected' },
      }),
    );

    await waitFor(() =>
      expect(mockAddSource).toHaveBeenCalledWith({ chatId: 'chat-1', noteId: 'note-1' }),
    );
  });

  it('does not re-attach a seeded note that is already a source', async () => {
    sourcesData = [{ id: 'src-1', chatId: 'chat-1', noteId: 'note-1', title: 'Existing note' }];
    mockAddSource.mockClear();
    renderHook(() =>
      useChatComposerState({
        chatId: 'chat-1',
        seedNote: { id: 'note-1', title: 'Existing note', excerpt: 'Already selected' },
      }),
    );

    expect(mockAddSource).not.toHaveBeenCalled();
  });

  it('selecting a suggestion attaches it as a chat source', async () => {
    sourcesData = [];
    const { result } = renderHook(() => useChatComposerState({ chatId: 'chat-1', seedNote: null }));

    act(() => {
      result.current.setDraft('Find #');
      result.current.selectSuggestion({
        id: 'note-2',
        title: 'Suggested note',
        excerpt: 'Suggestion',
      });
    });

    expect(mockAddSource).toHaveBeenCalledWith({ chatId: 'chat-1', noteId: 'note-2' });
  });

  it('removing a selected note calls the remove mutation', () => {
    sourcesData = [];
    const { result } = renderHook(() => useChatComposerState({ chatId: 'chat-1', seedNote: null }));

    act(() => result.current.removeSelectedNote('note-2'));

    expect(mockRemoveSource).toHaveBeenCalledWith('note-2');
  });

  it('clears and restores draft/attachment state after a failed send', async () => {
    sourcesData = [];
    const { result } = renderHook(() => useChatComposerState({ chatId: 'chat-1', seedNote: null }));

    act(() => result.current.setDraft('Retry me'));
    act(() => result.current.clear());
    expect(result.current.draft).toBe('');
    expect(result.current.attachedFiles).toHaveLength(0);

    act(() =>
      result.current.restore({
        attachments: [{ id: 'file-1', originalName: 'brief.pdf', url: '/files/brief.pdf' }],
        draft: 'Retry this',
      }),
    );
    await waitFor(() => expect(result.current.draft).toBe('Retry this'));
    expect(result.current.attachedFiles[0]?.id).toBe('file-1');
  });

  it('adds successfully uploaded files to the composer', async () => {
    sourcesData = [];
    mockUploadFiles.mockResolvedValueOnce([
      { id: 'file-1', originalName: 'brief.pdf', url: '/files/brief.pdf' },
    ]);
    const { result } = renderHook(() => useChatComposerState({ chatId: 'chat-1', seedNote: null }));
    const file = new File(['brief'], 'brief.pdf', { type: 'application/pdf' });
    const fileList: FileList = {
      0: file,
      length: 1,
      item: (index) => (index === 0 ? file : null),
      [Symbol.iterator]: [file][Symbol.iterator],
    };

    await result.current.attachFiles(fileList);

    await waitFor(() => expect(result.current.attachedFiles[0]?.id).toBe('file-1'));
  });

  it('persists the draft and attachments for the chat across reloads', async () => {
    window.localStorage.clear();
    mockUploadFiles.mockResolvedValueOnce([
      {
        content: 'binary-contents',
        id: 'file-1',
        originalName: 'brief.pdf',
        textContent: 'uploaded transcript',
        url: '/files/brief.pdf',
      },
    ]);
    const file = new File(['brief'], 'brief.pdf', { type: 'application/pdf' });
    const fileList: FileList = {
      0: file,
      length: 1,
      item: (index) => (index === 0 ? file : null),
      [Symbol.iterator]: [file][Symbol.iterator],
    };

    const { result, unmount } = renderHook(() =>
      useChatComposerState({ chatId: 'chat-2', seedNote: null }),
    );

    await act(async () => {
      result.current.setDraft('Draft text for reload');
      await result.current.attachFiles(fileList);
    });

    await waitFor(() => {
      expect(window.localStorage.getItem('chat-composer:chat-2')).toContain(
        'Draft text for reload',
      );
    });
    const persisted = JSON.parse(window.localStorage.getItem('chat-composer:chat-2') ?? '{}');
    expect(persisted.attachments[0]).toEqual({
      id: 'file-1',
      originalName: 'brief.pdf',
      url: '/files/brief.pdf',
    });

    unmount();

    const { result: restored } = renderHook(() =>
      useChatComposerState({ chatId: 'chat-2', seedNote: null }),
    );

    await waitFor(() => {
      expect(restored.current.draft).toBe('Draft text for reload');
      expect(restored.current.attachedFiles[0]?.id).toBe('file-1');
    });
  });
});
