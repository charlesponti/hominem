// @vitest-environment jsdom

import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const mockUploadFiles = vi.fn();

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

import { useChatComposerState } from './use-chat-composer-state';

describe('useChatComposerState', () => {
  it('adds a seeded note to the message and excludes it from suggestions', async () => {
    const { result } = renderHook(() =>
      useChatComposerState({
        seedNote: { id: 'note-1', title: 'Existing note', excerpt: 'Already selected' },
      }),
    );

    act(() => result.current.setDraft('Summarize'));

    await waitFor(() => expect(result.current.draftWithSeed).toBe('Summarize #existing-note'));
    expect(result.current.selectedNotesForSend.map((note) => note.id)).toEqual(['note-1']);
    expect(result.current.mentionQuery).toBe('existing-note');
  });

  it('selects a suggestion once and restores composer state after a failed send', async () => {
    const { result } = renderHook(() => useChatComposerState({ seedNote: null }));

    act(() => {
      result.current.setDraft('Find #');
      result.current.selectSuggestion({
        id: 'note-2',
        title: 'Suggested note',
        excerpt: 'Suggestion',
      });
      result.current.selectSuggestion({
        id: 'note-2',
        title: 'Suggested note',
        excerpt: 'Suggestion',
      });
    });
    await waitFor(() => expect(result.current.selectedNotesForSend).toHaveLength(1));

    act(() => result.current.clear());
    expect(result.current.draft).toBe('');
    expect(result.current.selectedNotes).toHaveLength(0);

    act(() =>
      result.current.restore({
        attachments: [{ id: 'file-1', originalName: 'brief.pdf', url: '/files/brief.pdf' }],
        draft: 'Retry this',
        notes: [{ id: 'note-2', title: 'Suggested note', excerpt: 'Suggestion' }],
      }),
    );
    await waitFor(() => expect(result.current.draft).toBe('Retry this'));
    expect(result.current.attachedFiles[0]?.id).toBe('file-1');
    expect(result.current.selectedNotes[0]?.id).toBe('note-2');
  });

  it('adds successfully uploaded files to the composer', async () => {
    mockUploadFiles.mockResolvedValueOnce([
      { id: 'file-1', originalName: 'brief.pdf', url: '/files/brief.pdf' },
    ]);
    const { result } = renderHook(() => useChatComposerState({ seedNote: null }));
    const file = new File(['brief'], 'brief.pdf', { type: 'application/pdf' });
    const fileList = { 0: file, length: 1, item: () => file } as unknown as FileList;

    await result.current.attachFiles(fileList);

    await waitFor(() => expect(result.current.attachedFiles[0]?.id).toBe('file-1'));
  });
});
