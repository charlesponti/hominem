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

const { useChatTransform } = await import('~/hooks/use-chat-transform');

const CHAT_ID = 'chat-1';

function message(role: ChatMessageItem['role'], text: string): ChatMessageItem {
  return {
    id: `${role}-${text}`,
    role,
    message: text,
    created_at: new Date().toISOString(),
    chat_id: CHAT_ID,
    profile_id: '',
    focus_ids: null,
    focus_items: null,
    reasoning: null,
    referencedNotes: null,
    toolCalls: null,
    isStreaming: false,
  } as ChatMessageItem;
}

const MESSAGES = [message('user', 'Let’s plan the launch'), message('assistant', 'Sure, on it')];

function renderChatTransform(overrides: Partial<Parameters<typeof useChatTransform>[0]> = {}) {
  const onNoteCreated = vi.fn().mockResolvedValue(undefined);
  const onContentCreated = vi.fn().mockResolvedValue(undefined);
  const hook = renderHookWithQueryClient(() =>
    useChatTransform({
      chatId: CHAT_ID,
      source: { kind: 'new' },
      messages: MESSAGES,
      onNoteCreated,
      onContentCreated,
      ...overrides,
    }),
  );
  return { ...hook, onNoteCreated, onContentCreated };
}

describe('useChatTransform', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('can transform once there are messages', () => {
    const { result } = renderChatTransform();
    expect(result.current.canTransform).toBe(true);
    expect(result.current.isReviewVisible).toBe(false);
  });

  it('builds a note proposal client-side and surfaces it for review', async () => {
    const { result } = renderChatTransform();

    await act(async () => {
      await result.current.handleTransform('note');
    });

    expect(result.current.isReviewVisible).toBe(true);
    expect(result.current.pendingReview).toEqual(expect.objectContaining({ proposedType: 'note' }));
    expect(mockTasksExtractPost).not.toHaveBeenCalled();
  });

  it('extracts tasks from the transcript for a task_list transform', async () => {
    mockTasksExtractPost.mockResolvedValue({
      json: async () => ({ tasks: [{ title: 'Book venue' }, { title: 'Send invites' }] }),
    });
    const { result } = renderChatTransform();

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

  it('surfaces a transform error via Alert instead of throwing', async () => {
    mockTasksExtractPost.mockRejectedValue(new Error('network down'));
    const { result } = renderChatTransform();

    await act(async () => {
      await result.current.handleTransform('task_list');
    });

    expect(result.current.isReviewVisible).toBe(false);
    expect(mockAlert).toHaveBeenCalledWith('Could not prepare review', 'Please try again.');
  });

  it('accepting a note review creates the note and notifies onNoteCreated', async () => {
    mockNotesPost.mockResolvedValue({
      json: async () => ({ id: 'note-1', title: 'Launch plan', updatedAt: '2026-01-01' }),
    });
    const { result, onNoteCreated, onContentCreated } = renderChatTransform();

    await act(async () => {
      await result.current.handleTransform('note');
    });
    await act(async () => {
      await result.current.handleAcceptReview();
    });

    expect(mockNotesPost).toHaveBeenCalledTimes(1);
    expect(onNoteCreated).toHaveBeenCalledTimes(1);
    expect(onContentCreated).toHaveBeenCalledWith({
      source: { kind: 'artifact', id: 'note-1', title: 'Launch plan', type: 'note' },
      updatedAt: '2026-01-01',
    });
    expect(result.current.pendingReview).toBeNull();
    expect(result.current.resolvedSource).toEqual({
      kind: 'artifact',
      id: 'note-1',
      type: 'note',
      title: 'Launch plan',
    });
  });

  it('accepting a task review creates a single task', async () => {
    mockTasksPost.mockResolvedValue({
      json: async () => ({
        id: 'task-1',
        title: 'Book venue',
        artifactType: 'task',
        updatedAt: '2026-01-01',
      }),
    });
    const { result, onContentCreated } = renderChatTransform();

    await act(async () => {
      await result.current.handleTransform('task');
    });
    await act(async () => {
      await result.current.handleAcceptReview();
    });

    expect(mockTasksPost).toHaveBeenCalledTimes(1);
    expect(onContentCreated).toHaveBeenCalledWith({
      source: { kind: 'artifact', id: 'task-1', title: 'Book venue', type: 'task' },
      updatedAt: '2026-01-01',
    });
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
    const { result, onContentCreated } = renderChatTransform();

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
    const { result } = renderChatTransform();

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
