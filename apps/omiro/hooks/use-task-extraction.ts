import type { ChatMessageItem } from '@hominem/chat';
import type { PendingReview } from '@hominem/chat/react';
import { useChatLifecycle } from '@hominem/chat/react';
import { buildArtifactProposal } from '@hominem/chat/ui';
import { useApiClient } from '@hominem/rpc/react';
import type { ArtifactType, SessionSource } from '@hominem/rpc/types';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { Alert } from 'react-native';

import { taskKeys } from '~/services/tasks/query-keys';
import t from '~/translations';

export interface ExtractedTasksCreated {
  source: { kind: 'artifact'; id: string; type: Exclude<ArtifactType, 'tracker'>; title: string };
  updatedAt?: string;
}

interface UseTaskExtractionInput {
  chatId: string;
  source: SessionSource;
  messages: ChatMessageItem[];
  onContentCreated?: (content: ExtractedTasksCreated) => Promise<void>;
}

export function buildExtractedTasksProposal(previewContent: string, tasks: { title: string }[]) {
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

// Backs the "Create tasks" conversation action: pulls a task list out of the
// chat transcript deterministically, shows it in ClassificationReview via
// useChatLifecycle, and creates the tasks in a batch on accept.
//
// "Save as note" is a separate flow -- ChatScreen intercepts that menu item
// before it ever calls handleExtract and routes to chat-to-note-sheet.tsx
// instead (an AI rewrite, not this hook's deterministic transcript-to-artifact
// path). Since TRANSFORM_ITEMS in conversation-actions.model.ts only offers
// 'note' and 'task_list', and 'note' never reaches here, onTransform below
// only ever needs to handle 'task_list'.
export function useTaskExtraction({
  chatId,
  source,
  messages,
  onContentCreated,
}: UseTaskExtractionInput) {
  const client = useApiClient();
  const queryClient = useQueryClient();

  const proposalMessages = useMemo(
    () => messages.map((message) => ({ role: message.role, content: message.message })),
    [messages],
  );

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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: taskKeys.all }),
  });

  const createTasksBatch = useMutation({
    mutationKey: ['chat-task-batch', chatId],
    mutationFn: async (input: { tasks: { title: string; description?: string }[] }) => {
      const res = await client.api.tasks.batch.$post({ json: input });
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: taskKeys.all }),
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
        return buildExtractedTasksProposal(previewContent, tasks);
      }

      throw new Error(`Unsupported extraction type: ${type}`);
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

      // onTransform above only ever produces a task_list proposal (or throws),
      // and buildExtractedTasksProposal always sets `items`, so this branch
      // is unreachable in the real UI flow. It's here because
      // PendingReview['proposedType'] is the shared ArtifactType, which
      // still includes types this hook doesn't handle (e.g. 'note').
      throw new Error(`Unsupported review type: ${review.proposedType}`);
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
