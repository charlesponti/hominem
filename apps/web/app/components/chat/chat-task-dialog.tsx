import type { ExtractedTask } from '@hominem/chat/react';
import { useTaskExtraction } from '@hominem/chat/react';
import type { ChatMessageSnapshot } from '@hominem/chat/schemas';
import type { ArtifactType } from '@hominem/chat/types';
import { useApiClient } from '@hominem/rpc/react';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';

import { ChatTaskReview } from '~/components/chat/chat-task-review';
import { Shimmer } from '~/components/chat/shimmer';
import { Button } from '~/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog';

export function ChatTaskDialog({
  messages,
  onOpenChange,
}: {
  messages: readonly Pick<ChatMessageSnapshot, 'role' | 'content'>[];
  onOpenChange: (open: boolean) => void;
}) {
  const client = useApiClient();
  const queryClient = useQueryClient();
  const [taskError, setTaskError] = useState<string | null>(null);
  const [rejectedTaskIds, setRejectedTaskIds] = useState<string[]>([]);
  const hasStartedExtraction = useRef(false);

  const taskFlow = useTaskExtraction({
    messages,
    source: { kind: 'new' },
    extractTasks: async (transcript: string) => {
      const response = await client.api.tasks.extract.$post({ json: { transcript } });
      if (!response.ok) throw new Error('Task extraction failed.');
      return response.json();
    },
    createTasks: async (tasks: ExtractedTask[]) => {
      const response = await client.api.tasks.batch.$post({ json: { tasks } });
      if (!response.ok) throw new Error('Task creation failed.');
      const result = await response.json();
      const toCreatedRef = (task: {
        id: string;
        title: string;
        artifactType: ArtifactType;
        updatedAt?: string | null;
      }) => ({
        id: task.id,
        title: task.title,
        type: task.artifactType,
        ...(task.updatedAt ? { updatedAt: task.updatedAt } : {}),
      });
      return {
        parent: result.parent ? toCreatedRef(result.parent) : null,
        tasks: result.tasks.map(toCreatedRef),
      };
    },
    onTasksChanged: () => {
      void queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
    strings: {
      noTasksFoundTitle: 'No tasks found',
      noTasksFoundDescription: 'No actionable tasks found in this conversation.',
      tasksFoundTitle: (count: number) => `${count} tasks`,
      prepareReviewErrorTitle: 'Could not prepare review',
      saveContentErrorTitle: 'Could not save content',
      errorMessage: 'Please try again.',
    },
    onErrorNotice: (_title, _message, error) => {
      setTaskError(error instanceof Error ? error.message : 'Please try again.');
    },
    onContentCreated: async () => {
      onOpenChange(false);
    },
  });

  useEffect(() => {
    if (hasStartedExtraction.current) return;
    hasStartedExtraction.current = true;
    void taskFlow.handleTransform('task_list');
  }, [taskFlow.handleTransform]);

  const rejectedTaskIdSet = useMemo(() => new Set(rejectedTaskIds), [rejectedTaskIds]);
  const visibleProposedTasks = (taskFlow.pendingReview?.items ?? []).filter(
    (task) => !rejectedTaskIdSet.has(task.id),
  );

  const retryExtraction = () => {
    setTaskError(null);
    setRejectedTaskIds([]);
    void taskFlow.handleTransform('task_list');
  };

  return (
    <Dialog
      onOpenChange={(open) => {
        onOpenChange(open);
      }}
      open
    >
      <DialogContent
        aria-describedby="task-extraction-description"
        className="max-h-[min(80vh,42rem)] overflow-y-auto sm:max-w-lg"
      >
        <DialogHeader>
          <DialogTitle>
            {taskFlow.isReviewVisible ? 'Review proposed tasks' : 'Extracting tasks'}
          </DialogTitle>
          <DialogDescription id="task-extraction-description">
            {taskFlow.isReviewVisible
              ? 'Choose the tasks you want to add to your task list.'
              : 'Reading this conversation for actionable tasks.'}
          </DialogDescription>
        </DialogHeader>
        {taskFlow.lifecycleState === 'classifying' ? (
          <div
            aria-label="Extracting tasks"
            className="flex min-h-48 items-center justify-center"
            role="status"
          >
            <Shimmer duration={1}>Thinking</Shimmer>
          </div>
        ) : taskFlow.isReviewVisible && taskFlow.pendingReview ? (
          <ChatTaskReview
            error={taskError ?? undefined}
            isSaving={taskFlow.lifecycleState === 'persisting'}
            onAccept={(tasks) => {
              setTaskError(null);
              const review = taskFlow.pendingReview;
              if (!review) return;
              void taskFlow.handleAcceptReview({ ...review, items: tasks });
            }}
            onReject={(id) => setRejectedTaskIds((ids) => (ids.includes(id) ? ids : [...ids, id]))}
            onRetry={retryExtraction}
            tasks={visibleProposedTasks}
          />
        ) : taskError ? (
          <div className="flex flex-col items-center gap-3 py-8 text-center" role="alert">
            <p className="text-sm text-destructive">{taskError}</p>
            <Button onClick={retryExtraction} size="sm" type="button" variant="secondary">
              Retry
            </Button>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
