import {
  buildExtractedTasksProposal as buildSharedProposal,
  useTaskExtraction as useSharedTaskExtraction,
  type CreatedTaskRef,
  type ExtractedTask,
  type ExtractedTasksCreated,
} from '@hominem/chat/react';
import type { ArtifactType, ChatMessageItem, SessionSource } from '@hominem/chat/types';
import { useApiClient } from '@hominem/rpc/react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { Alert } from 'react-native';

import { taskKeys } from '~/services/tasks/query-keys';
import t from '~/translations';

export type { ExtractedTasksCreated };

interface UseTaskExtractionInput {
  chatId: string;
  source: SessionSource;
  messages: ChatMessageItem[];
  onContentCreated?: (content: ExtractedTasksCreated) => Promise<void>;
}

const toCreatedRef = (task: {
  id: string;
  title: string;
  artifactType: ArtifactType;
  updatedAt?: string | null;
}): CreatedTaskRef => ({
  id: task.id,
  title: task.title,
  type: task.artifactType,
  ...(task.updatedAt ? { updatedAt: task.updatedAt } : {}),
});

export function buildExtractedTasksProposal(previewContent: string, tasks: { title: string }[]) {
  return buildSharedProposal(previewContent, tasks, {
    noTasksFoundTitle: t.chat.actions.noTasksFoundTitle,
    noTasksFoundDescription: t.chat.actions.noTasksFoundDescription,
    tasksFoundTitle: (count: number) => t.chat.actions.tasksFoundTitle(count),
  });
}

export function useTaskExtraction({
  chatId,
  source,
  messages,
  onContentCreated,
}: UseTaskExtractionInput) {
  const client = useApiClient();
  const queryClient = useQueryClient();

  // Normalized transcript messages for the shared hook.
  const proposalMessages = useMemo(
    () => messages.map((message) => ({ role: message.role, content: message.message })),
    [messages],
  );

  const extractTasksFromTranscript = async (input: { transcript: string }) => {
    const res = await client.api.tasks.extract.$post({ json: input });
    const json = await res.json();
    if ('error' in json) {
      throw new Error(json.error);
    }
    return json;
  };

  const createTasksBatch = useMutation({
    mutationKey: ['chat-task-batch', chatId],
    mutationFn: async (input: { tasks: { title: string; description?: string }[] }) => {
      const res = await client.api.tasks.batch.$post({ json: input });
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: taskKeys.all }),
  });

  // The batch endpoint speaks transport shape (`artifactType`); the shared
  // hook works in domain shape (`type`).
  return useSharedTaskExtraction({
    messages: proposalMessages,
    source,
    extractTasks: (transcript: string) => extractTasksFromTranscript({ transcript }),
    createTasks: async (tasks: ExtractedTask[]) => {
      const result = await createTasksBatch.mutateAsync({ tasks });
      return {
        parent: result.parent ? toCreatedRef(result.parent) : null,
        tasks: result.tasks.map(toCreatedRef),
      };
    },
    strings: {
      noTasksFoundTitle: t.chat.actions.noTasksFoundTitle,
      noTasksFoundDescription: t.chat.actions.noTasksFoundDescription,
      tasksFoundTitle: (count: number) => t.chat.actions.tasksFoundTitle(count),
      prepareReviewErrorTitle: 'Could not prepare review',
      saveContentErrorTitle: 'Could not save content',
      errorMessage: 'Please try again.',
    },
    onErrorNotice: (title: string, message: string) => Alert.alert(title, message),
    onContentCreated,
  });
}
