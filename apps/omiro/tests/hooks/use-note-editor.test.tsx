// @vitest-environment jsdom
import type { Note } from '@hominem/rpc/types';
import { act } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { inboxEntityKeys } from '~/services/inbox/inbox-entities';
import { inboxKeys, noteKeys } from '~/services/notes/query-keys';
import t from '~/translations';

import { renderHookWithQueryClient } from '../utils/render-hook';

const mockNotePatch = vi.fn();
const mockAlert = vi.fn();
const mockSchedule = vi.fn();
const mockFlush = vi.fn();
const mockPersistNow = vi.fn();
let capturedSaverOptions:
  | {
      commit: (note: Note) => void;
      onError: (error: unknown) => void;
      persist: (payload: {
        title: string | null;
        content: string;
        fileIds: string[];
      }) => Promise<Note>;
    }
  | undefined;

vi.mock('react-native', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-native')>();
  return { ...actual, Alert: { alert: mockAlert } };
});

vi.mock('@hominem/rpc/react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@hominem/rpc/react')>();
  return {
    ...actual,
    useApiClient: () => ({
      api: {
        notes: {
          ':id': {
            $patch: mockNotePatch,
          },
        },
      },
    }),
  };
});

vi.mock('~/hooks/debounced-note-saver', () => ({
  createDebouncedNoteSaver: (opts: typeof capturedSaverOptions) => {
    capturedSaverOptions = opts;
    return {
      flush: mockFlush,
      persistNow: mockPersistNow,
      schedule: mockSchedule,
    };
  },
}));

const { useNoteEditor } = await import('~/hooks/use-note-editor');

const NOTE_ID = 'note-1';

function noteFixture(overrides: Partial<Note> = {}): Note {
  return {
    id: NOTE_ID,
    title: 'Original title',
    content: 'Original content',
    excerpt: 'Original content',
    updatedAt: new Date().toISOString(),
    files: [],
    ...overrides,
  } as Note;
}

function seedInboxEntity(queryClient: ReturnType<typeof renderHookWithQueryClient>['queryClient']) {
  queryClient.setQueryData(inboxEntityKeys.all, {
    [`note:${NOTE_ID}`]: {
      id: `note:${NOTE_ID}`,
      entityId: NOTE_ID,
      kind: 'note',
      title: 'Original title',
      preview: 'Original content',
      updatedAt: new Date().toISOString(),
      route: `/(protected)/inbox/note/${NOTE_ID}`,
      variant: 'note',
    },
  });
}

describe('useNoteEditor', () => {
  afterEach(() => {
    vi.clearAllMocks();
    capturedSaverOptions = undefined;
  });

  it('schedules a debounced save via save()', () => {
    const { result } = renderHookWithQueryClient(() => useNoteEditor(NOTE_ID));

    act(() => {
      result.current.save('New title', 'New content', ['file-1']);
    });

    expect(mockSchedule).toHaveBeenCalledWith({
      title: 'New title',
      content: 'New content',
      fileIds: ['file-1'],
    });
  });

  it('normalizes an empty title to null when scheduling a save', () => {
    const { result } = renderHookWithQueryClient(() => useNoteEditor(NOTE_ID));

    act(() => {
      result.current.save('', 'New content', []);
    });

    expect(mockSchedule).toHaveBeenCalledWith({ title: null, content: 'New content', fileIds: [] });
  });

  it('persists immediately via flushSave and returns the saver promise', async () => {
    mockPersistNow.mockResolvedValueOnce(undefined);
    const { result } = renderHookWithQueryClient(() => useNoteEditor(NOTE_ID));

    await act(async () => {
      await result.current.flushSave('Title', 'Content', ['file-1']);
    });

    expect(mockPersistNow).toHaveBeenCalledWith({
      title: 'Title',
      content: 'Content',
      fileIds: ['file-1'],
    });
  });

  it('flushes the pending save on unmount', () => {
    const { unmount } = renderHookWithQueryClient(() => useNoteEditor(NOTE_ID));
    mockFlush.mockClear();

    unmount();

    expect(mockFlush).toHaveBeenCalledTimes(1);
  });

  it('persists via the api client and commits the server response into caches on success', async () => {
    const updatedNote = noteFixture({ title: 'Server title', excerpt: 'Server excerpt' });
    mockNotePatch.mockResolvedValueOnce({ json: async () => updatedNote });
    const { queryClient } = renderHookWithQueryClient(() => useNoteEditor(NOTE_ID));
    seedInboxEntity(queryClient);

    await capturedSaverOptions?.persist({ title: 'Server title', content: 'x', fileIds: [] });
    act(() => {
      capturedSaverOptions?.commit(updatedNote);
    });

    expect(mockNotePatch).toHaveBeenCalledWith({
      param: { id: NOTE_ID },
      json: { title: 'Server title', content: 'x', fileIds: [] },
    });
    expect(queryClient.getQueryData(noteKeys.detail(NOTE_ID))).toEqual(updatedNote);
    expect(
      (queryClient.getQueryData(inboxEntityKeys.all) as Record<string, { title: string }>)[
        `note:${NOTE_ID}`
      ].title,
    ).toBe('Server title');
  });

  it('invalidates the inbox pages query after a successful commit', async () => {
    const updatedNote = noteFixture();
    const { queryClient } = renderHookWithQueryClient(() => useNoteEditor(NOTE_ID));
    seedInboxEntity(queryClient);
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    act(() => {
      capturedSaverOptions?.commit(updatedNote);
    });

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: inboxKeys.pages() });
  });

  it('shows a save-error alert once and invalidates the note query when the saver reports an error', () => {
    const { queryClient } = renderHookWithQueryClient(() => useNoteEditor(NOTE_ID));
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    act(() => {
      capturedSaverOptions?.onError(new Error('save failed'));
    });

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: noteKeys.detail(NOTE_ID) });
    expect(mockAlert).toHaveBeenCalledWith(
      t.notes.editor.saveErrorTitle,
      t.notes.editor.saveErrorMessage,
    );
  });

  it('does not show a duplicate alert for repeated save errors until a successful commit resets the flag', () => {
    renderHookWithQueryClient(() => useNoteEditor(NOTE_ID));

    act(() => {
      capturedSaverOptions?.onError(new Error('first'));
      capturedSaverOptions?.onError(new Error('second'));
    });
    expect(mockAlert).toHaveBeenCalledTimes(1);

    act(() => {
      capturedSaverOptions?.commit(noteFixture());
    });
    act(() => {
      capturedSaverOptions?.onError(new Error('third'));
    });

    expect(mockAlert).toHaveBeenCalledTimes(2);
  });

  it('updates the note cache and syncs the inbox title via updateCache', () => {
    const { result, queryClient } = renderHookWithQueryClient(() => useNoteEditor(NOTE_ID));
    seedInboxEntity(queryClient);
    queryClient.setQueryData(noteKeys.detail(NOTE_ID), noteFixture());

    act(() => {
      result.current.updateCache({ title: 'Patched title' });
    });

    expect(queryClient.getQueryData<Note>(noteKeys.detail(NOTE_ID))?.title).toBe('Patched title');
    expect(
      (queryClient.getQueryData(inboxEntityKeys.all) as Record<string, { title: string }>)[
        `note:${NOTE_ID}`
      ].title,
    ).toBe('Patched title');
  });

  it('does nothing via updateCache when no note is cached yet', () => {
    const { result, queryClient } = renderHookWithQueryClient(() => useNoteEditor(NOTE_ID));

    act(() => {
      result.current.updateCache({ title: 'Patched title' });
    });

    expect(queryClient.getQueryData(noteKeys.detail(NOTE_ID))).toBeUndefined();
  });

  it('detaches a file: updates the cache optimistically and persists the remaining fileIds', async () => {
    mockPersistNow.mockResolvedValueOnce(undefined);
    const { result, queryClient } = renderHookWithQueryClient(() => useNoteEditor(NOTE_ID));
    const files = [
      { id: 'file-1', name: 'a.png' },
      { id: 'file-2', name: 'b.png' },
    ] as Note['files'];
    queryClient.setQueryData(noteKeys.detail(NOTE_ID), noteFixture({ files }));

    await act(async () => {
      await result.current.detachFile('file-1', files, 'Title', 'Content');
    });

    expect(queryClient.getQueryData<Note>(noteKeys.detail(NOTE_ID))?.files).toEqual([
      { id: 'file-2', name: 'b.png' },
    ]);
    expect(mockPersistNow).toHaveBeenCalledWith({
      title: 'Title',
      content: 'Content',
      fileIds: ['file-2'],
    });
  });
});
