import { useCallback, useState } from 'react';

import {
  useCreateChatTasks,
  useExtractChatTasks,
  type ProposedChatTask,
} from '~/hooks/use-chat-tasks';

export function useChatTaskExtraction(transcript: string) {
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [proposedTasks, setProposedTasks] = useState<ProposedChatTask[] | null>(null);
  const [taskError, setTaskError] = useState<string | null>(null);
  const extractTasks = useExtractChatTasks();
  const createTasks = useCreateChatTasks();

  const runExtraction = useCallback(() => {
    setTaskError(null);
    extractTasks.mutate(
      { transcript },
      {
        onSuccess: (result) => setProposedTasks(result.tasks),
        onError: (error) => setTaskError(error.message),
      },
    );
  }, [extractTasks.mutate, transcript]);

  const open = useCallback(() => {
    setIsTaskDialogOpen(true);
    setProposedTasks(null);
    setTaskError(null);
    runExtraction();
  }, [runExtraction]);

  const onOpenChange = useCallback(
    (nextOpen: boolean) => {
      setIsTaskDialogOpen(nextOpen);
      if (!nextOpen && !extractTasks.isPending && !createTasks.isPending) {
        setProposedTasks(null);
        setTaskError(null);
      }
    },
    [extractTasks.isPending, createTasks.isPending],
  );

  const accept = useCallback(
    (tasks: ProposedChatTask[]) => {
      setTaskError(null);
      createTasks.mutate(
        { tasks },
        {
          onSuccess: () => {
            setProposedTasks(null);
            setIsTaskDialogOpen(false);
          },
          onError: (error) => setTaskError(error.message),
        },
      );
    },
    [createTasks.mutate],
  );

  const reject = useCallback((title: string) => {
    setProposedTasks((tasks) => tasks?.filter((task) => task.title !== title) ?? null);
  }, []);

  return {
    isTaskDialogOpen,
    proposedTasks,
    taskError,
    isExtracting: extractTasks.isPending,
    isSaving: createTasks.isPending,
    open,
    onOpenChange,
    retry: runExtraction,
    accept,
    reject,
  };
}

export type ChatTaskExtraction = ReturnType<typeof useChatTaskExtraction>;
