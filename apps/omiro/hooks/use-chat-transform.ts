import type { ChatMessageItem } from '@hominem/chat';
import type { PendingReview } from '@hominem/chat/react';
import { useChatLifecycle } from '@hominem/chat/react';
import { buildArtifactProposal } from '@hominem/chat/ui';
import { useApiClient } from '@hominem/rpc/react';
import type { ArtifactType, SessionSource } from '@hominem/rpc/types';
import { useMutation } from '@tanstack/react-query';
import { useMemo } from 'react';
import { Alert } from 'react-native';

import t from '~/translations';

export interface ChatContentCreated {
  source: { kind: 'artifact'; id: string; type: Exclude<ArtifactType, 'tracker'>; title: string };
  updatedAt?: string;
}

interface UseChatTransformInput {
  chatId: string;
  source: SessionSource;
  messages: ChatMessageItem[];
  onNoteCreated?: () => Promise<void>;
  onContentCreated?: (content: ChatContentCreated) => Promise<void>;
}

export function buildTaskListProposal(previewContent: string, tasks: { title: string }[]) {
  return {
    proposedType: 'task_list' as const,
    proposedTitle:
      tasks.length === 0
        ? t.chat.actions.noTasksFoundTitle
        : tasks.length === 1
          ? tasks[0].title
          : t.chat.actions.tasksFoundTitle(tasks.length),
    proposedChanges:
      tasks.length === 0
        ? [t.chat.actions.noTasksFoundDescription]
        : tasks.map((task) => task.title),
    previewContent,
    items: tasks,
  };
}

export function useChatTransform({
  chatId,
  source,
  messages,
  onNoteCreated,
  onContentCreated,
}: UseChatTransformInput) {
  const client = useApiClient();

  const proposalMessages = useMemo(
    () => messages.map((message) => ({ role: message.role, content: message.message })),
    [messages],
  );

  const createTask = useMutation({
    mutationKey: ['chat-task', chatId],
    mutationFn: async (review: {
      proposedType: Exclude<ArtifactType, 'note' | 'tracker'>;
      proposedTitle: string;
      previewContent: string;
    }) => {
      const res = await client.api.tasks.$post({
        json: {
          artifactType: review.proposedType,
          description: review.previewContent,
          title: review.proposedTitle,
        },
      });
      return res.json();
    },
    onSuccess: async (task) => {
      if (onContentCreated) {
        await onContentCreated({
          source: {
            kind: 'artifact',
            id: task.id,
            title: task.title,
            type: task.artifactType,
          },
          updatedAt: task.updatedAt,
        });
      }
    },
  });

  const createNote = useMutation({
    mutationKey: ['chat-note', chatId],
    mutationFn: async (review: { proposedTitle: string; previewContent: string }) => {
      const res = await client.api.notes.$post({
        json: { content: review.previewContent, title: review.proposedTitle, type: 'note' },
      });
      return res.json();
    },
    onSuccess: async () => {
      if (onNoteCreated) {
        await onNoteCreated();
      }
    },
  });

  const extractTasksFromTranscript = useMutation({
    mutationKey: ['chat-task-extract', chatId],
    mutationFn: async (input: { transcript: string }) => {
      const res = await client.api.tasks.extract.$post({ json: input });
      const json = await res.json();
      if ('error' in json) {
        throw new Error(json.error);
      }
      return json;
    },
  });

  const createTasksBatch = useMutation({
    mutationKey: ['chat-task-batch', chatId],
    mutationFn: async (input: { tasks: { title: string; description?: string }[] }) => {
      const res = await client.api.tasks.batch.$post({ json: input });
      return res.json();
    },
  });

  const {
    pendingReview,
    resolvedSource,
    canTransform,
    isReviewVisible,
    handleTransform,
    handleAcceptReview,
    handleRejectReview,
  } = useChatLifecycle({
    messages: proposalMessages,
    source,
    onTransform: async (type: ArtifactType): Promise<PendingReview> => {
      if (type === 'task_list') {
        const { previewContent } = buildArtifactProposal(proposalMessages, 'task_list');
        const { tasks } = await extractTasksFromTranscript.mutateAsync({
          transcript: previewContent,
        });
        return buildTaskListProposal(previewContent, tasks);
      }

      return buildArtifactProposal(
        proposalMessages,
        type === 'tracker' ? 'note' : (type as 'note' | 'task'),
      );
    },
    onAcceptReview: async (review): Promise<SessionSource> => {
      if (review.items) {
        if (review.items.length === 0) {
          throw new Error('No tasks to create');
        }

        const result = await createTasksBatch.mutateAsync({ tasks: review.items });
        const created = result.parent ?? result.tasks[0];
        if (onContentCreated) {
          await onContentCreated({
            source: {
              kind: 'artifact',
              id: created.id,
              title: created.title,
              type: created.artifactType,
            },
            updatedAt: created.updatedAt,
          });
        }

        return {
          kind: 'artifact' as const,
          id: created.id,
          type: created.artifactType,
          title: created.title,
        };
      }

      if (review.proposedType === 'note') {
        const note = await createNote.mutateAsync(review);
        if (onContentCreated) {
          await onContentCreated({
            source: {
              kind: 'artifact',
              id: note.id,
              title: note.title || review.proposedTitle,
              type: 'note',
            },
            updatedAt: note.updatedAt,
          });
        }
        return {
          kind: 'artifact' as const,
          id: note.id,
          type: 'note' as const,
          title: note.title || review.proposedTitle,
        };
      }

      if (review.proposedType !== 'task' && review.proposedType !== 'task_list') {
        const note = await createNote.mutateAsync({
          proposedTitle: review.proposedTitle,
          previewContent: review.previewContent,
        });
        return {
          kind: 'artifact' as const,
          id: note.id,
          type: 'note' as const,
          title: note.title || review.proposedTitle,
        };
      }

      const task = await createTask.mutateAsync({
        proposedTitle: review.proposedTitle,
        previewContent: review.previewContent,
        proposedType: review.proposedType,
      });
      return {
        kind: 'artifact' as const,
        id: task.id,
        type: review.proposedType,
        title: task.title,
      };
    },
    onRejectReview: async () => {},
    onError: (_phase, _error) => {
      Alert.alert(
        _phase === 'accept' ? 'Could not save content' : 'Could not prepare review',
        'Please try again.',
      );
    },
  });

  return {
    pendingReview,
    resolvedSource,
    canTransform,
    isReviewVisible,
    handleTransform,
    handleAcceptReview,
    handleRejectReview,
  };
}
