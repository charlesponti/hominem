// @vitest-environment jsdom
import type { ChatMessageItem } from '@hominem/chat';
import { act } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { renderHookWithQueryClient } from '../utils/render-hook';

const mockTasksPost = vi.fn();
const mockNotesPost = vi.fn();
const mockTasksExtractPost = vi.fn();
const mockTasksBatchPost = vi.fn();
const mockAlert = vi.fn();

vi.mock('@hominem/rpc/react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@hominem/rpc/react')>();
  return {
    ...actual,
    useApiClient: () => ({
      api: {
        tasks: {
          $post: mockTasksPost,
          extract: { $post: mockTasksExtractPost },
          batch: { $post: mockTasksBatchPost },
        },
        notes: { $post: mockNotesPost },
      },
    }),
  };
});

vi.mock('react-native', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-native')>();
  return { ...actual, Alert: { alert: mockAlert } };
});

const { useTaskExtraction } = await import('~/hooks/use-task-extraction');

const CHAT_ID = 'chat-1';

function message(role: ChatMessageItem['role'], text: string): ChatMessageItem {
  return {
    id: `${role}-${text}`,
    role,
    message: text,
    created_at: new Date().toISOString(),
    chat_id: CHAT_ID,
    profile_id: '',
    reasoning: null,
    referencedNotes: null,
    toolCalls: null,
    isStreaming: false,
  } as ChatMessageItem;
}

const MESSAGES = [message('user', "Let's plan the launch"), message('assistant', 'Sure, on it')];

function renderTaskExtraction(overrides: Partial<Parameters<typeof useTaskExtraction>[0]> = {}) {
  const onContentCreated = vi.fn().mockResolvedValue(undefined);
  const hook = renderHookWithQueryClient(() =>
    useTaskExtraction({
      chatId: CHAT_ID,
      source: { kind: 'new' },
      messages: MESSAGES,
      onContentCreated,
      ...overrides,
    }),
  );
  return { ...hook, onContentCreated };
}

describe('useTaskExtraction', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('can extract once there are messages', () => {
    const { result } = renderTaskExtraction();
    expect(result.current.canTransform).toBe(true);
    expect(result.current.isReviewVisible).toBe(false);
  });

  it('surfaces an unsupported-extraction error via Alert for note (routes through note-draft-sheet.tsx instead)', async () => {
    const { result } = renderTaskExtraction();

    await act(async () => {
      await result.current.handleTransform('note');
    });

    expect(result.current.isReviewVisible).toBe(false);
    expect(mockAlert).toHaveBeenCalledWith('Could not prepare review', 'Please try again.');
    expect(mockNotesPost).not.toHaveBeenCalled();
  });

  it('extracts tasks from the transcript for a task_list extraction', async () => {
    mockTasksExtractPost.mockResolvedValue({
      json: async () => ({ tasks: [{ title: 'Book venue' }, { title: 'Send invites' }] }),
    });
    const { result } = renderTaskExtraction();

    await act(async () => {
      await result.current.handleTransform('task_list');
    });

    expect(mockTasksExtractPost).toHaveBeenCalledWith({
      json: { transcript: expect.any(String) },
    });
    expect(result.current.pendingReview).toEqual(
      expect.objectContaining({
        proposedType: 'task_list',
        proposedTitle: '2 tasks',
        items: [{ title: 'Book venue' }, { title: 'Send invites' }],
      }),
    );
  });

  it('surfaces an extraction error via Alert instead of throwing', async () => {
    mockTasksExtractPost.mockRejectedValue(new Error('network down'));
    const { result } = renderTaskExtraction();

    await act(async () => {
      await result.current.handleTransform('task_list');
    });

    expect(result.current.isReviewVisible).toBe(false);
    expect(mockAlert).toHaveBeenCalledWith('Could not prepare review', 'Please try again.');
  });

  it('accepting a batch review (items present) creates all tasks and reports the parent', async () => {
    mockTasksExtractPost.mockResolvedValue({
      json: async () => ({ tasks: [{ title: 'Book venue' }] }),
    });
    mockTasksBatchPost.mockResolvedValue({
      json: async () => ({
        parent: { id: 'parent-1', title: 'Launch tasks', artifactType: 'task', updatedAt: 't' },
        tasks: [],
      }),
    });
    const { result, onContentCreated } = renderTaskExtraction();

    await act(async () => {
      await result.current.handleTransform('task_list');
    });
    await act(async () => {
      await result.current.handleAcceptReview();
    });

    expect(mockTasksBatchPost).toHaveBeenCalledWith({
      json: { tasks: [{ title: 'Book venue' }] },
    });
    expect(onContentCreated).toHaveBeenCalledWith(
      expect.objectContaining({
        source: { kind: 'artifact', id: 'parent-1', title: 'Launch tasks', type: 'task' },
      }),
    );
  });

  it('rejects an empty batch review with an alert rather than creating anything', async () => {
    mockTasksExtractPost.mockResolvedValue({ json: async () => ({ tasks: [] }) });
    const { result } = renderTaskExtraction();

    await act(async () => {
      await result.current.handleTransform('task_list');
    });
    await act(async () => {
      await result.current.handleAcceptReview();
    });

    expect(mockTasksBatchPost).not.toHaveBeenCalled();
    expect(mockAlert).toHaveBeenCalledWith('Could not save content', 'Please try again.');
    // Rejected accept returns to the reviewing state rather than clearing it.
    expect(result.current.isReviewVisible).toBe(true);
  });
});
